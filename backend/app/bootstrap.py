from __future__ import annotations

import logging

from sqlmodel import Session, select

from app.config import get_settings
from app.models import User
from app.security import hash_secret

logger = logging.getLogger(__name__)


def ensure_admin_user(session: Session) -> None:
    if session.exec(select(User)).first() is not None:
        return

    settings = get_settings()
    if not settings.admin_username or not settings.admin_password:
        logger.warning(
            "No user exists and WALLET_ADMIN_USERNAME/WALLET_ADMIN_PASSWORD are not set — "
            "login will fail until you set them and restart."
        )
        return

    session.add(
        User(username=settings.admin_username, password_hash=hash_secret(settings.admin_password))
    )
    session.commit()
    logger.info("Created initial user %r", settings.admin_username)
