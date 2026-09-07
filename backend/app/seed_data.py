"""Idempotent seed of base reference data: categories, keyword rules, SMS patterns.

Runs once at startup (each function only inserts when the table is empty), so
it's safe to call on every boot.
"""

from __future__ import annotations

import logging

from sqlmodel import Session, select

from app.models import AmountUnit, Category, Direction, KeywordRule, SmsPattern

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

DEFAULT_SMS_PATTERNS: list[dict[str, str]] = [
    {"name": "بانک ملی", "sender_match": "melli", "body_regex": _GENERIC_BODY_REGEX},
    {"name": "بانک ملت", "sender_match": "mellat", "body_regex": _GENERIC_BODY_REGEX},
    {"name": "بانک صادرات", "sender_match": "saderat", "body_regex": _GENERIC_BODY_REGEX},
    {"name": "بلوبانک", "sender_match": "blu", "body_regex": _GENERIC_BODY_REGEX},
    {"name": "بانک سامان", "sender_match": "saman", "body_regex": _GENERIC_BODY_REGEX},
    {"name": "بانک تجارت", "sender_match": "tejarat", "body_regex": _GENERIC_BODY_REGEX},
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


def ensure_base_data(session: Session) -> None:
    ensure_categories(session)
    ensure_keyword_rules(session)
    ensure_sms_patterns(session)
