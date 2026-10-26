from __future__ import annotations

import logging

from sqlalchemy import update
from sqlmodel import Session, SQLModel, col, select

from app.config import get_settings
from app.models import (
    Account,
    Budget,
    Category,
    Debt,
    KeywordRule,
    MerchantCategoryMap,
    OtpSellerHint,
    Person,
    PushSubscription,
    SmsIngestAttempt,
    SmsPattern,
    Split,
    Transaction,
    User,
    UserSetting,
)
from app.security import hash_secret
from app.seed_data import ensure_base_data

logger = logging.getLogger(__name__)

# Every table with a user_id column.
OWNED_MODELS: tuple[type[SQLModel], ...] = (
    Account,
    Category,
    MerchantCategoryMap,
    KeywordRule,
    SmsPattern,
    SmsIngestAttempt,
    OtpSellerHint,
    Transaction,
    Person,
    Split,
    Debt,
    Budget,
    PushSubscription,
    UserSetting,
)


def ensure_admin_user(session: Session) -> None:
    if session.exec(select(User)).first() is not None:
        return

    settings = get_settings()
    if not settings.admin_username or not settings.admin_password:
        logger.warning(
            "No user exists and WALLET_ADMIN_USERNAME/WALLET_ADMIN_PASSWORD are not set — "
            "the first account will have to be created from the sign-up screen."
        )
        return

    user = User(
        username=settings.admin_username, password_hash=hash_secret(settings.admin_password)
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    logger.info("Created initial user %r", settings.admin_username)
    assert user.id is not None
    adopt_orphaned_rows(session, user.id)


def adopt_orphaned_rows(session: Session, user_id: int) -> None:
    """Hands rows with no owner to `user_id`.

    The multi-user migration gives everything to the first user, but a
    database that had data and no user at all (admin env vars unset) has
    nobody to give it to then. The admin created from the env vars here is the
    person who ran that instance, so it's theirs. Never called on sign-up: an
    open registration must not hand a stranger somebody's old data.
    """
    adopted = 0
    for model in OWNED_MODELS:
        result = session.execute(
            update(model)  # type: ignore[arg-type]
            .where(col(model.user_id).is_(None))  # type: ignore[attr-defined]
            .values(user_id=user_id)
        )
        adopted += result.rowcount or 0  # type: ignore[attr-defined]
    session.commit()
    if adopted:
        logger.info("Assigned %d ownerless rows to user %d", adopted, user_id)


def ensure_base_data_for_all_users(session: Session) -> None:
    for user_id in session.exec(select(User.id)).all():
        assert user_id is not None
        ensure_base_data(session, user_id)
