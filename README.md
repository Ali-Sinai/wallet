# Wallet — Personal Finance Tracker

Self-hosted personal finance tracker for a single user, built for the Iranian
context: amounts in Toman, Jalali (Shamsi) calendar, RTL Persian UI, and
SMS-based transaction ingestion from Iranian banks.

Design source: [`Design/iranian-finance-tracking-app`](Design/iranian-finance-tracking-app)
(Claude Design export — dark theme, green accent, Vazirmatn/Rooyin fonts).

## Stack

- **Backend**: Python 3.12+, FastAPI, SQLModel, Pydantic v2, Alembic, SQLite (WAL), `uv`
- **Frontend**: React + Vite + TypeScript + Tailwind (RTL), Recharts, PWA (`vite-plugin-pwa`)
- **Dates**: Jalali conversion via `jdatetime`, always computed server-side, Tehran time, weeks start Saturday
- **Money**: every amount is an `int` — Toman ×100 ("Toman-cents") — never a float or Decimal
- **Runtime**: `docker compose up`, or `uv run` without Docker; the Docker image builds for both `linux/amd64` and `linux/arm64`

## Architecture notes

- One SQLite file, WAL mode. Single user — no Postgres daemon for no benefit.
- Alembic migrations are checked into `backend/alembic/versions/` and applied automatically at startup (see `_run_migrations()` in `backend/app/main.py`) — you never run `alembic upgrade` by hand in normal operation.
- Raw SMS text is **never stored**, not even temporarily. Only fields extracted by the parser (amount, direction, account, timestamp, merchant) are persisted, and only until you confirm or dismiss them — see `SmsIngestAttempt` in `backend/app/models.py`.
- Firebase Cloud Messaging (push notifications) is fully optional. Without a service-account file configured, the app boots normally with push disabled — nothing else depends on it.

## Setup — Docker (recommended)

```bash
cp backend/.env.example .env
# edit .env: set WALLET_SESSION_SECRET and WALLET_ADMIN_PASSWORD
docker compose up --build
```

The app is then at `http://localhost:8000`. Data persists in the `wallet-data` named volume.

## Setup — without Docker (`uv run`)

```bash
cd backend
uv sync
cp .env.example .env   # edit as above
uv run alembic upgrade head    # also runs automatically at app startup
uv run python scripts/seed.py  # optional: realistic fake Persian data
uv run uvicorn app.main:app --reload
```

Frontend, for local development with hot reload (proxies `/api` to `:8000` — see `frontend/vite.config.ts`):

```bash
cd frontend
npm install
npm run dev
```

For a production build, `npm run build` outputs straight into `backend/static/`, which FastAPI serves directly — there's no separate frontend server in production, and nothing from `node_modules` ships to the deployed box.

## Building for ARM (e.g. a Raspberry Pi)

The Dockerfile has no architecture-specific steps, so a standard buildx multi-arch build works:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t wallet:latest --push .
```

## Push notifications (Firebase Cloud Messaging)

Optional. To enable:

1. Create a Firebase project, enable Cloud Messaging.
2. Project settings → Service accounts → Generate new private key → save the JSON.
3. Set `WALLET_FIREBASE_SERVICE_ACCOUNT_PATH` to that file's path (in Docker, mount it and point the env var at the mounted path — see the commented-out lines in `docker-compose.yml`).
4. Add your Firebase web app config (`apiKey`, `projectId`, `messagingSenderId`, `appId`, and the project's VAPID key from Cloud Messaging settings) to the frontend before requesting a token in the browser.

If this isn't configured, `/api/push/*` returns a clear "not configured" response and the summary/threshold jobs skip sending silently — everything else works normally.

## SMS ingestion

Three ways to get transactions in:

### 1. Paste box

In the app, paste one or many raw SMS bodies at once. The server parses them, and results land in the same "detected from SMS" queue you confirm/split/ignore from — nothing is silently auto-saved.

### 2. Webhook (SMS-forwarder app on your phone)

`POST /api/ingest/sms`, header `X-Api-Token: <token>`, body:

```json
{
  "sender": "+985000xxxxx",
  "body": "بانک سامان: خرید ۲۵۰,۰۰۰ ریال ...",
  "receivedAt": "2026-09-07T12:34:00Z"
}
```

Get a token from Settings → rotate webhook token (`POST /api/settings/webhook-token/rotate`, shown once — the old one stops working immediately).

**MacroDroid setup** (Tasker is equivalent — trigger on SMS received, action is an HTTP POST):

1. Trigger: *SMS Received* (optionally filter by sender to your banks).
2. Action: *HTTP Request* →
   - Method: `POST`
   - URL: `https://your-domain/api/ingest/sms`
   - Headers: `X-Api-Token: <your token>`, `Content-Type: application/json`
   - Body (JSON, using MacroDroid's SMS variables):
     ```json
     {"sender": "[sms_sender]", "body": "[sms_message]", "receivedAt": "[sms_datetime_iso]"}
     ```
     (Use MacroDroid's date/time formatting to produce an ISO-8601 UTC string, or just the device's local time — the server treats the ingestion timestamp as a fallback only, not authoritative.)

Ignored-account messages (parsed fine, but the account isn't one you've whitelisted) are dropped with **zero storage** — not even in the pending queue. Only messages from accounts you've explicitly added under Accounts show up at all.

### 3. Manual entry

Normal form, no SMS involved — also the offline path: if you're offline, the entry queues in IndexedDB and syncs automatically once you're back online.

## Adding a new SMS pattern

Patterns live in the DB (Settings → Bank rules), not in code. Each one has:

- **Sender match** — a substring matched against the SMS sender/number.
- **Body regex** — must use named groups: `amount`, `type` (the deposit/withdrawal keyword text), `account` (digits, last 4 used), `datetime` (optional), `merchant` (optional), `balance` (optional, currently unused).
- **Amount unit** — `rial` or `toman`. Almost always `rial` — the server converts to Toman-cents itself; you never do this conversion.

To add one:

1. Get a real (or redacted-but-shape-accurate) sample message from your bank.
2. `POST /api/sms-patterns` (or from the UI) with a regex matching it — use `POST /api/sms-patterns/{id}/test` with sample text to dry-run the regex without saving a transaction.
3. Deposit/withdrawal keyword lists (`برداشت`, `خرید`, `واریز`, …) are separately editable under Settings → Keyword rules if your bank phrases things differently than the seeded defaults.

The seeded patterns (Melli, Mellat, Saderat, Blu, Saman, Tejarat) are **best-effort placeholders** — real bank SMS wording varies and changes over time. Expect to tune these against your own messages.

## Tests

```bash
cd backend
uv run pytest          # SMS parser + split math, see backend/tests/
uv run ruff check .
uv run mypy app
```
