"""Per-user key/value settings backed by the UserSetting table."""

from __future__ import annotations

from sqlmodel import Session, select

from app.models import UserSetting

# Legacy: a bcrypt hash of the webhook token, from before multi-user. Only an
# install that hasn't rotated its token since still has one — see
# app/routers/sms.py's _user_for_token.
KEY_WEBHOOK_TOKEN_HASH = "webhook_token_hash"
KEY_WEBHOOK_TOKEN_DIGEST = "webhook_token_sha256"
KEY_DIGIT_STYLE = "digit_style"  # "fa" | "en"
KEY_DEFAULT_LANG = "default_lang"  # "fa" | "en"
KEY_UNCATEGORIZED_THRESHOLD = "uncategorized_threshold"
KEY_SUMMARY_FREQUENCY = "summary_frequency"  # "off" | "weekly" | "monthly"

# Never sent to a client.
SECRET_KEYS = frozenset({KEY_WEBHOOK_TOKEN_HASH, KEY_WEBHOOK_TOKEN_DIGEST})

DEFAULTS = {
    KEY_DIGIT_STYLE: "fa",
    KEY_DEFAULT_LANG: "fa",
    KEY_UNCATEGORIZED_THRESHOLD: "5",
    KEY_SUMMARY_FREQUENCY: "weekly",
}


def _row(session: Session, user_id: int, key: str) -> UserSetting | None:
    stmt = select(UserSetting).where(UserSetting.user_id == user_id, UserSetting.key == key)
    return session.exec(stmt).first()


def get_setting(session: Session, user_id: int, key: str, default: str | None = None) -> str | None:
    row = _row(session, user_id, key)
    if row is not None:
        return row.value
    return DEFAULTS.get(key, default)


def set_setting(session: Session, user_id: int, key: str, value: str) -> None:
    row = _row(session, user_id, key)
    if row is None:
        row = UserSetting(user_id=user_id, key=key, value=value)
    else:
        row.value = value
    session.add(row)
    session.commit()


def delete_setting(session: Session, user_id: int, key: str) -> None:
    row = _row(session, user_id, key)
    if row is not None:
        session.delete(row)
        session.commit()


def all_settings(session: Session, user_id: int) -> dict[str, str]:
    rows = session.exec(select(UserSetting).where(UserSetting.user_id == user_id)).all()
    merged = dict(DEFAULTS)
    merged.update({row.key: row.value for row in rows})
    return merged
