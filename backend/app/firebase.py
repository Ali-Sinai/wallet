"""Firebase Cloud Messaging integration — lazy, optional, never fatal.

If no service-account credentials are configured, or initialization fails
for any reason (bad file, no network), `is_enabled()` returns False and
every send is a silent no-op (logged, not raised). Nothing else in the app
depends on Firebase being available.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)

_initialized = False
_enabled = False


def init_firebase() -> None:
    global _initialized, _enabled
    if _initialized:
        return
    _initialized = True

    settings = get_settings()
    path = settings.firebase_service_account_path
    if not path or not Path(path).is_file():
        logger.warning("Firebase service account not configured — push notifications disabled")
        return

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(path)
        firebase_admin.initialize_app(cred)
        _enabled = True
        logger.info("Firebase initialized — push notifications enabled")
    except Exception:
        logger.exception("Firebase initialization failed — push notifications disabled")
        _enabled = False


def is_enabled() -> bool:
    return _enabled


def send_to_token(token: str, title: str, body: str) -> bool:
    if not _enabled:
        logger.debug("Push skipped (firebase disabled): %s", title)
        return False
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=token,
        )
        messaging.send(message)
        return True
    except Exception:
        logger.exception("Failed to send push notification")
        return False
