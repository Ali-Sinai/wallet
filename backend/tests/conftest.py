from __future__ import annotations

import pytest

from app.models import AmountUnit, Direction, KeywordRule, SmsPattern


@pytest.fixture
def keyword_rules() -> list[KeywordRule]:
    return [
        KeywordRule(id=1, keyword="برداشت", direction=Direction.WITHDRAWAL),
        KeywordRule(id=2, keyword="خرید", direction=Direction.WITHDRAWAL),
        KeywordRule(id=3, keyword="انتقال از", direction=Direction.WITHDRAWAL),
        KeywordRule(id=4, keyword="بدهکار", direction=Direction.WITHDRAWAL),
        KeywordRule(id=5, keyword="واریز", direction=Direction.DEPOSIT),
        KeywordRule(id=6, keyword="بستانکار", direction=Direction.DEPOSIT),
        KeywordRule(id=7, keyword="انتقال به", direction=Direction.DEPOSIT),
    ]


GENERIC_BODY_REGEX = (
    r"(?P<type>خرید|برداشت|واریز|انتقال از|انتقال به|بستانکار|بدهکار)"
    r"[^\d]{0,20}(?P<amount>[\d۰-۹٠-٩,٬]{4,})\s*ریال"
    r"(?:[^\d]{0,40}(?P<account>\d{4}))?"
    r"(?:[^\d]{0,20}(?:مانده|موجودی)[^\d]{0,10}(?P<balance>[\d۰-۹٠-٩,٬]+))?"
    r"(?:[^\d]{0,20}(?P<datetime>\d{4}/\d{1,2}/\d{1,2}[ -]\d{1,2}:\d{1,2}(?::\d{1,2})?))?"
)


@pytest.fixture
def patterns() -> list[SmsPattern]:
    return [
        SmsPattern(
            id=1,
            name="Test Bank",
            sender_match="testbank",
            body_regex=GENERIC_BODY_REGEX,
            amount_unit=AmountUnit.RIAL,
            enabled=True,
        )
    ]
