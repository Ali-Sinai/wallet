from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from alembic import command
from app.bootstrap import ensure_admin_user
from app.config import get_settings
from app.db import engine
from app.firebase import init_firebase
from app.routers import (
    accounts,
    auth,
    budgets,
    categories,
    dashboard,
    people,
    push,
    reports,
    sms,
    sms_patterns,
    splits,
    transactions,
)
from app.routers import (
    settings as settings_router,
)
from app.routers.sms import purge_expired_attempts
from app.seed_data import ensure_base_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PURGE_INTERVAL_SECONDS = 60 * 60 * 6

_BACKEND_DIR = Path(__file__).resolve().parent.parent

# Vercel sets this in both build and runtime environments. On a serverless
# function there's no persistent process to run a background loop in, and
# migrations shouldn't run per cold-start against a live shared DB — see
# README "Deploying to Vercel" for the manual-migration + Cron-purge setup
# that replaces both of these there.
_IS_SERVERLESS = bool(os.environ.get("VERCEL"))


def _run_migrations() -> None:
    alembic_cfg = AlembicConfig(str(_BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(_BACKEND_DIR / "alembic"))
    command.upgrade(alembic_cfg, "head")


async def _purge_loop() -> None:
    while True:
        await asyncio.sleep(PURGE_INTERVAL_SECONDS)
        try:
            with Session(engine) as session:
                count = purge_expired_attempts(session)
                if count:
                    logger.info("Purged %d expired SMS ingest attempts", count)
        except Exception:
            logger.exception("Ingest-attempt purge sweep failed")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if not _IS_SERVERLESS:
        _run_migrations()
    try:
        with Session(engine) as session:
            ensure_admin_user(session)
            ensure_base_data(session)
            if not _IS_SERVERLESS:
                purge_expired_attempts(session)
    except Exception:
        # A failure here (unreachable DB, schema not migrated yet) must not
        # take the whole app down: on serverless the app *is* the only way to
        # run /api/internal/migrate, so crashing startup makes the problem
        # unfixable without a redeploy. Log it and let requests through —
        # they'll surface the real DB error individually.
        logger.exception("Startup bootstrap failed; continuing with app running")
    init_firebase()
    task = None if _IS_SERVERLESS else asyncio.create_task(_purge_loop())
    try:
        yield
    finally:
        if task is not None:
            task.cancel()


app = FastAPI(title="Wallet", lifespan=lifespan)

if get_settings().cors_origins_list:
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

for router in (
    auth.router,
    accounts.router,
    categories.router,
    sms.router,
    sms_patterns.router,
    transactions.router,
    splits.router,
    people.router,
    people.debts_router,
    budgets.router,
    dashboard.router,
    reports.router,
    push.router,
    settings_router.router,
):
    app.include_router(router)


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/internal/migrate")
def run_migrations_endpoint(authorization: str | None = Header(default=None)) -> dict[str, str]:
    """One-off migration trigger for serverless deploys (Vercel/Turso), where
    there's no persistent process to run `alembic upgrade head` at startup —
    see _IS_SERVERLESS above. Call this once after each deploy that adds a
    migration. Protected by the same CRON_SECRET as the purge endpoint; only
    meaningful when that env var is actually set."""
    expected = os.environ.get("CRON_SECRET")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid secret")
    _run_migrations()
    return {"status": "ok"}


_settings = get_settings()
_static_dir = Path(_settings.static_dir)
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")

    @app.exception_handler(StarletteHTTPException)
    async def spa_fallback(request: Request, exc: StarletteHTTPException) -> FileResponse:
        # React Router owns client-side paths like /activity, /people, /review —
        # a direct navigation or refresh there has no matching static file, so
        # StaticFiles 404s. Hand it index.html instead and let the client router
        # take over. API 404s (a real "not found", e.g. a bad transaction id)
        # still return the normal JSON error.
        is_missing_page = exc.status_code == 404 and not request.url.path.startswith("/api")
        index_path = _static_dir / "index.html"
        if is_missing_page and index_path.is_file():
            return FileResponse(index_path)
        return await http_exception_handler(request, exc)  # type: ignore[return-value]
