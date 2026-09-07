"""Key/value app settings backed by the AppSetting table."""

from __future__ import annotations

from sqlmodel import Session, select

from app.models import AppSetting

KEY_WEBHOOK_TOKEN_HASH = "webhook_token_hash"
KEY_DIGIT_STYLE = "digit_style"  # "fa" | "en"
KEY_DEFAULT_LANG = "default_lang"  # "fa" | "en"
KEY_UNCATEGORIZED_THRESHOLD = "uncategorized_threshold"
KEY_SUMMARY_FREQUENCY = "summary_frequency"  # "off" | "weekly" | "monthly"

DEFAULTS = {
    KEY_DIGIT_STYLE: "fa",
    KEY_DEFAULT_LANG: "fa",
    KEY_UNCATEGORIZED_THRESHOLD: "5",
    KEY_SUMMARY_FREQUENCY: "weekly",
}


def get_setting(session: Session, key: str, default: str | None = None) -> str | None:
    row = session.get(AppSetting, key)
    if row is not None:
        return row.value
    return DEFAULTS.get(key, default)


def set_setting(session: Session, key: str, value: str) -> None:
    row = session.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=value)
    else:
        row.value = value
    session.add(row)
    session.commit()


def all_settings(session: Session) -> dict[str, str]:
    rows = session.exec(select(AppSetting)).all()
    merged = dict(DEFAULTS)
    merged.update({row.key: row.value for row in rows})
    return merged
