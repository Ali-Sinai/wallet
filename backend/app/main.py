from __future__ import annotations

import asyncio
import logging
import os
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, Header, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from alembic import command
from app.bootstrap import ensure_admin_user
from app.config import get_settings
from app.db import engine
from app.errors import (
    CaptureRequestBodyMiddleware,
    http_exception_handler_with_body,
    validation_exception_handler,
)
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
from app.seller_hints import purge_expired_hints

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
                hints = purge_expired_hints(session)
                if hints:
                    logger.info("Purged %d unclaimed OTP seller hints", hints)
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
                purge_expired_hints(session)
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

# Error responses echo back the body the sender sent (see app/errors.py); the
# middleware is what makes that body still available once a handler runs.
app.add_middleware(CaptureRequestBodyMiddleware)
# Starlette types the handler argument as taking a bare Exception, so a handler
# narrowed to the exception it's registered for never matches — the ignores are
# that known mismatch, not a real type error.
app.add_exception_handler(StarletteHTTPException, http_exception_handler_with_body)  # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]

if get_settings().cors_origins_list:
    from fastapi.middleware.cors import CORSMiddleware

    logger.info("CORS enabled for origins: %s", get_settings().cors_origins_list)
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


def _migrate_tokens() -> list[str]:
    """Secrets that authorize /api/internal/migrate, any one of which is
    accepted. All three are secrets of equal or greater power than a schema
    upgrade, so accepting whichever the deploy happens to have costs nothing:

    - TURSO_AUTH_TOKEN is the database token the app already holds, and the
      only thing that lets it write to the DB at all. Whoever can present it
      can run the same writes against Turso directly, so gating a migration
      behind it grants no access it didn't already carry.
    - MIGRATE_TOKEN is the escape hatch, and the reason this is a list. Vercel
      can store an env var write-only, and both CRON_SECRET and
      TURSO_AUTH_TOKEN normally are — meaning that once set, neither can be
      read back out to actually make this call. A separate plain env var can
      be. Set it when you need to run a migration and can't recover the
      others; delete it afterwards.
    - CRON_SECRET is what this endpoint used to require, kept so deploys that
      set only it keep working. The purge endpoint still uses it on its own,
      since CRON_SECRET is what Vercel Cron actually sends.
    """
    candidates = (
        os.environ.get("MIGRATE_TOKEN"),
        get_settings().turso_auth_token,
        os.environ.get("CRON_SECRET"),
    )
    return [token for token in candidates if token]


def migrate_authorized(authorization: str | None) -> bool:
    tokens = _migrate_tokens()
    if not tokens:
        # Nothing configured to check against. That's the local/dev case, where
        # migrations already run at startup (see lifespan) and the DB is a file
        # on your own disk — a deploy with a real shared DB can't reach here,
        # since talking to Turso at all requires TURSO_AUTH_TOKEN.
        return True
    return any(secrets.compare_digest(authorization or "", f"Bearer {token}") for token in tokens)


@app.post("/api/internal/migrate")
def run_migrations_endpoint(authorization: str | None = Header(default=None)) -> dict[str, str]:
    """One-off migration trigger for serverless deploys (Vercel/Turso), where
    there's no persistent process to run `alembic upgrade head` at startup —
    see _IS_SERVERLESS above. Call this once after each deploy that adds a
    migration, with `Authorization: Bearer <token>` — see _migrate_tokens for
    which tokens are accepted."""
    if not migrate_authorized(authorization):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid secret")
    _run_migrations()
    return {"status": "ok"}


_settings = get_settings()
_static_dir = Path(_settings.static_dir)
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")

    @app.exception_handler(StarletteHTTPException)
    async def spa_fallback(request: Request, exc: StarletteHTTPException) -> Response:
        # React Router owns client-side paths like /activity, /people, /review —
        # a direct navigation or refresh there has no matching static file, so
        # StaticFiles 404s. Hand it index.html instead and let the client router
        # take over. API 404s (a real "not found", e.g. a bad transaction id)
        # still return the normal JSON error.
        is_missing_page = exc.status_code == 404 and not request.url.path.startswith("/api")
        index_path = _static_dir / "index.html"
        if is_missing_page and index_path.is_file():
            return FileResponse(index_path)
        return await http_exception_handler_with_body(request, exc)
