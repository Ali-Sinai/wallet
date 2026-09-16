"""Idempotent seed of base reference data: categories, keyword rules, SMS patterns.

Runs once at startup (each function only inserts when the table is empty), so
it's safe to call on every boot.
"""

from __future__ import annotations

import logging

from sqlmodel import Session, select

from app.models import AmountUnit, Category, Direction, KeywordRule, PatternKind, SmsPattern
from app.settings_store import get_setting, set_setting

KEY_OTP_PATTERNS_SEEDED = "otp_patterns_seeded"

logger = logging.getLogger(__name__)

DEFAULT_CATEGORIES: list[dict[str, str]] = [
    {"name_fa": "خوراک", "name_en": "Groceries", "icon": "🛒", "color": "#0f9b6e"},
    {"name_fa": "رستوران", "name_en": "Dining out", "icon": "🍽️", "color": "#e09628"},
    {"name_fa": "حمل و نقل", "name_en": "Transport", "icon": "🚌", "color": "#3fa9e0"},
    {"name_fa": "قبوض", "name_en": "Bills", "icon": "🧾", "color": "#c96bd8"},
    {"name_fa": "سلامت", "name_en": "Health", "icon": "💊", "color": "#5b8def"},
    {"name_fa": "تفریح", "name_en": "Fun", "icon": "🎉", "color": "#e0648c"},
    {"name_fa": "خرید", "name_en": "Shopping", "icon": "🛍️", "color": "#e0a628"},
    {"name_fa": "حقوق", "name_en": "Salary", "icon": "💵", "color": "#3fd39a"},
    {"name_fa": "انتقال شخصی", "name_en": "Personal transfer", "icon": "🔁", "color": "#5a6663"},
    {"name_fa": "دیگر", "name_en": "Other", "icon": "✨", "color": "#8a9490"},
]

DEFAULT_KEYWORD_RULES: list[tuple[str, Direction]] = [
    ("برداشت", Direction.WITHDRAWAL),
    ("خرید", Direction.WITHDRAWAL),
    ("انتقال از", Direction.WITHDRAWAL),
    ("بدهکار", Direction.WITHDRAWAL),
    ("واریز", Direction.DEPOSIT),
    ("بستانکار", Direction.DEPOSIT),
    ("انتقال به", Direction.DEPOSIT),
]

# Best-effort, generic patterns per bank. Real bank SMS wording varies and
# changes over time — these are starting points. Edit them from Settings ->
# Bank rules once you see your own messages' exact shape; see README
# "Adding a new SMS pattern".
_GENERIC_BODY_REGEX = (
    r"(?P<type>خرید|برداشت|واریز|انتقال از|انتقال به|بستانکار|بدهکار)"
    r"[^\d]{0,20}(?P<amount>[\d۰-۹٠-٩,٬]{4,})\s*ریال"
    r"(?:[^\d]{0,40}(?P<account>\d{4}))?"
    r"(?:[^\d]{0,20}(?:مانده|موجودی)[^\d]{0,10}(?P<balance>[\d۰-۹٠-٩,٬]+))?"
)

# The one-time-password message a bank sends *before* an online purchase. It's
# the only message that names the store, so it's read for that name alone and
# never as money moving — see PatternKind and app/seller_hints.py.
#
# Written as lookaheads rather than one left-to-right match because banks order
# these lines differently: each clause finds its own label anywhere in the
# message. Only the OTP wording and the seller are required; amount and card
# are optional, and both narrow which withdrawal the hint attaches to.
_GENERIC_OTP_REGEX = (
    r"(?=[\s\S]*(?:رمز\s*(?:پویا|دوم|یک\s*بار\s*مصرف|یکبار\s*مصرف)|کد\s*یک\s*?بار\s*مصرف))"
    r"(?=[\s\S]*(?:پذیرنده|پذيرنده|فروشگاه|فروشنده|نام\s*فروشگاه)\s*[:：]?\s*"
    r"(?P<merchant>[^\n\r]{2,40}?)\s*(?=\n|\r|$|کارت|مبلغ|رمز|کد|تاریخ|زمان|ساعت|شماره))"
    r"(?:(?=[\s\S]*(?:مبلغ|بابت)\s*[:：]?\s*(?P<amount>[\d۰-۹٠-٩,٬]{4,})))?"
    r"(?:(?=[\s\S]*(?:کارت|حساب)\s*[:：]?\s*[^\n\r]{0,28}?(?P<account>[\d۰-۹٠-٩]{4})\s*(?:\n|\r|$)))?"
)

_BANKS: list[tuple[str, str]] = [
    ("بانک ملی", "melli"),
    ("بانک ملت", "mellat"),
    ("بانک صادرات", "saderat"),
    ("بلوبانک", "blu"),
    ("بانک سامان", "saman"),
    ("بانک تجارت", "tejarat"),
]

DEFAULT_SMS_PATTERNS: list[dict[str, object]] = [
    {
        "name": name,
        "sender_match": sender,
        "body_regex": _GENERIC_BODY_REGEX,
        "kind": PatternKind.TRANSACTION,
    }
    for name, sender in _BANKS
]

DEFAULT_OTP_PATTERNS: list[dict[str, object]] = [
    {
        "name": f"{name} — رمز پویا",
        "sender_match": sender,
        "body_regex": _GENERIC_OTP_REGEX,
        "kind": PatternKind.OTP,
    }
    for name, sender in _BANKS
]


def ensure_categories(session: Session) -> None:
    if session.exec(select(Category)).first() is not None:
        return
    for i, c in enumerate(DEFAULT_CATEGORIES):
        session.add(Category(sort_order=i, **c))
    session.commit()
    logger.info("Seeded %d default categories", len(DEFAULT_CATEGORIES))


def ensure_keyword_rules(session: Session) -> None:
    if session.exec(select(KeywordRule)).first() is not None:
        return
    for keyword, direction in DEFAULT_KEYWORD_RULES:
        session.add(KeywordRule(keyword=keyword, direction=direction))
    session.commit()
    logger.info("Seeded %d default keyword rules", len(DEFAULT_KEYWORD_RULES))


def ensure_sms_patterns(session: Session) -> None:
    if session.exec(select(SmsPattern)).first() is not None:
        return
    for p in DEFAULT_SMS_PATTERNS:
        session.add(SmsPattern(amount_unit=AmountUnit.RIAL, enabled=True, **p))
    session.commit()
    logger.info("Seeded %d default SMS patterns", len(DEFAULT_SMS_PATTERNS))


def ensure_otp_patterns(session: Session) -> None:
    """Seed the OTP patterns once, including on a database that predates them.

    The table-is-empty check the other seeds use would skip an instance that
    already has bank patterns, which is every existing install — so this one
    remembers it has run in AppSetting instead, and stays quiet afterwards
    even if you delete the patterns it added.
    """
    if get_setting(session, KEY_OTP_PATTERNS_SEEDED) == "1":
        return
    existing = {
        (p.sender_match, p.body_regex)
        for p in session.exec(select(SmsPattern).where(SmsPattern.kind == PatternKind.OTP)).all()
    }
    added = 0
    for p in DEFAULT_OTP_PATTERNS:
        if (p["sender_match"], p["body_regex"]) in existing:
            continue
        session.add(SmsPattern(amount_unit=AmountUnit.RIAL, enabled=True, **p))
        added += 1
    set_setting(session, KEY_OTP_PATTERNS_SEEDED, "1")  # commits
    if added:
        logger.info("Seeded %d default OTP patterns", added)


def ensure_base_data(session: Session) -> None:
    ensure_categories(session)
    ensure_keyword_rules(session)
    ensure_sms_patterns(session)
    ensure_otp_patterns(session)
