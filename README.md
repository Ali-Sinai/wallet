# Wallet — Personal Finance Tracker

Self-hosted personal finance tracker for a single user, built for the Iranian
context: amounts in Toman, Jalali (Shamsi) calendar, RTL Persian UI, and
SMS-based transaction ingestion from Iranian banks.

Design source: [`Design/iranian-finance-tracking-app`](Design/iranian-finance-tracking-app)
(Claude Design export — dark theme, green accent, Vazirmatn/Rooyin fonts).

## Stack

- **Backend**: Python 3.12+, FastAPI, SQLModel, Pydantic v2, Alembic, SQLite (WAL), `uv`
- **Frontend**: React 19 + Vite + TypeScript + Tailwind v4 (RTL), shadcn/ui on Base UI with the [Persian Labs](https://ui.persian-labs.ir) registry (`@persianlabsui/*`, see `frontend/components.json`), Recharts, PWA (`vite-plugin-pwa`)
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
uv run python scripts/seed.py  # LOCAL DEV ONLY: fake Persian data (see note)
uv run uvicorn app.main:app --reload
```

> **Do not seed an instance you actually use.** `scripts/seed.py` inserts fake
> accounts, people and transactions for demoing the UI. A real instance needs
> none of it: the app creates the categories, bank SMS patterns and keyword
> rules it needs on startup, and you add your own accounts, people and budgets
> from **Settings**. To clear a seeded local database, stop the server and
> delete `backend/data/wallet.db*`.

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

Optional, and off by default on both sides — server and browser each check independently and degrade cleanly.

**Server side:**
1. Create a Firebase project, enable Cloud Messaging.
2. Project settings → Service accounts → Generate new private key → save the JSON.
3. Set `WALLET_FIREBASE_SERVICE_ACCOUNT_PATH` to that file's path (in Docker, mount it and point the env var at the mounted path — see the commented-out lines in `docker-compose.yml`).

**Browser side:** fill in the same Firebase web app config in **two** places (a service worker can't import from your app bundle, so it's duplicated by design — see the comment in the second file):
- `frontend/src/lib/firebaseConfig.ts` — `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`, and `vapidKey` (from Cloud Messaging settings → Web Push certificates).
- `frontend/public/firebase-messaging-sw.js` — the same six config fields (not the VAPID key).

Once both are filled in, Settings → Notifications → "فعال‌سازی اعلان در این مرورگر" requests permission and registers the device. Until then, that button is disabled with an explanatory message, and the backend's `/api/push/*` returns a clear "not configured" response rather than erroring — the summary/threshold jobs just skip sending silently.

## Deploying to Vercel (single project, Turso instead of local SQLite)

Vercel's serverless functions have no persistent disk, so this mode swaps the
local SQLite file for [Turso](https://turso.tech) (libSQL) — a
network-accessed, SQLite-compatible database — and runs the frontend build
and the FastAPI backend as one Vercel project (`api/index.py` serves `/api/*`,
everything else is the static frontend build — see `vercel.json`).

1. **Create a Turso database** (`turso db create wallet`, or via the Turso
   dashboard). Note its `libsql://...` URL and generate an auth token
   (`turso db tokens create wallet`).
2. **Vercel project env vars** (Project Settings → Environment Variables, all
   environments):
   - `TURSO_DATABASE_URL` — the `libsql://...` URL
   - `TURSO_AUTH_TOKEN` — the token
   - `WALLET_SESSION_SECRET`, `WALLET_ADMIN_USERNAME`, `WALLET_ADMIN_PASSWORD`
   - `CRON_SECRET` — protects the two endpoints below; Vercel automatically
     sends `Authorization: Bearer $CRON_SECRET` on Cron-triggered requests
     when this is set, which is what secures the purge job in step 4.
3. **Run migrations once after each deploy that adds one** — there's no
   persistent process to run `alembic upgrade head` at startup on a
   serverless function, so this is a manual step instead:
   ```bash
   curl -X POST https://your-project.vercel.app/api/internal/migrate \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
   **Routing note**: `vercel.json` deliberately has *no* rewrite for `/api/*`.
   A rewrite's `destination` replaces the path the function actually receives,
   so `{"source": "/api/(.*)", "destination": "/api/index"}` makes every API
   request arrive at the app as `/api/index` and 404. Unmatched paths already
   fall through to `api/index.py` with the original path intact, so `/api/*`
   is left alone; the single rewrite that *is* there is the SPA fallback,
   sending non-API, non-file paths (`/activity`, `/people`, …) to
   `/index.html` so client-side deep links work.
4. **SMS ingest-attempt purge**: `vercel.json` already schedules a daily Cron
   job against `/api/internal/purge-sms-attempts` — this replaces the
   in-process background sweep used on a long-running server. Nothing to set
   up beyond the `CRON_SECRET` env var above.
5. Push notifications (Firebase) don't work on this deploy target — the
   config expects a service-account **file**, and Vercel's function
   filesystem can't hold one. Everything else works the same; push just
   stays gracefully disabled (see "Push notifications" above).

Local development is unaffected: `sqlalchemy-libsql` (needed for the Turso
dialect) is an optional extra (`uv sync --extra turso`) specifically because
its native dependency has no prebuilt wheel for Windows — local/Docker dev
never needs it, since without `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` set the
app just uses the local SQLite file as normal.

## Deploying frontend and backend separately (e.g. Vercel + Fly.io)

Same-origin (Docker / `uv run`, above) is simplest — skip this section unless you specifically want the frontend on a different host than the backend.

1. **Backend** — deploy however you like (this repo includes `fly.toml` for Fly.io: `flyctl launch --no-deploy` once to create the app + volume, then `flyctl deploy`). Note its public URL, e.g. `https://wallet-toman-tracker.fly.dev`.
2. **Backend env**: set `WALLET_CORS_ALLOW_ORIGINS` to your frontend's exact origin (e.g. `https://wallet.vercel.app`). This also switches the session cookie to `SameSite=None; Secure`, which is what makes a cross-site cookie work at all — it requires HTTPS on both ends (Fly and Vercel both give you this for free).
3. **Frontend build**: set `VITE_API_BASE_URL` to the backend's origin (e.g. `https://wallet-toman-tracker.fly.dev`) as a build-time env var, then `npm run build` (or let Vercel do it — set the env var in the Vercel project settings). The frontend then calls the backend cross-origin instead of assuming same-origin `/api`.
4. Redeploy the frontend any time `VITE_API_BASE_URL` changes — Vite inlines it at build time, not runtime.

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
