from __future__ import annotations

import asyncio
import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config as AlembicConfig
from fastapi import FastAPI, Request
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


@app.api_route("/api/internal/migrate", methods=["GET", "POST"])
def run_migrations_endpoint() -> dict[str, str]:
    """One-off migration trigger for serverless deploys (Vercel/Turso), where
    there's no persistent process to run `alembic upgrade head` at startup —
    see _IS_SERVERLESS above. Call it once after each deploy that adds a
    migration; GET is allowed so opening the URL in a browser is enough.

    Deliberately takes no token and no input of any kind. The credential that
    matters here — TURSO_AUTH_TOKEN — is already in the deployment's env, and
    the app reads it from there to connect (see config.py/db.py); asking the
    caller to hand back a secret the app already holds protects nothing. What's
    left to abuse is thin: the endpoint accepts no parameters, so a caller has
    no say in what runs, and `upgrade head` is idempotent — once the schema is
    current, further calls do nothing. The exposure is somebody triggering
    already-committed migrations, or load from hammering it, not data access:
    reading or writing rows still needs the login session every other route
    requires.
    """
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
