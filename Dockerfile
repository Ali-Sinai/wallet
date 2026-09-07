# --- Frontend build stage ---
FROM node:22-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build
# vite.config.ts outDir points at ../backend/static, so the build already
# lands where the backend stage expects it — nothing more to copy here.

# --- Backend runtime stage ---
FROM python:3.12-slim AS backend
WORKDIR /app

RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-dev --no-install-project

COPY backend/ ./
COPY --from=frontend-build /backend/static ./static
RUN uv sync --no-dev

ENV WALLET_DB_PATH=/data/wallet.db
ENV WALLET_STATIC_DIR=/app/static
VOLUME ["/data"]
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
