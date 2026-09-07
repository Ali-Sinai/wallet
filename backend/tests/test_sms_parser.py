from __future__ import annotations

from datetime import UTC, datetime

from app.models import Direction
from app.sms_parser import (
    dedup_hash,
    last4_from_account_text,
    normalize_digits,
    parse_amount,
    parse_sms,
)

RECEIVED_AT = datetime(2026, 8, 27, 12, 0, tzinfo=UTC)


def test_normalize_persian_digits():
    assert normalize_digits("۱۲۳۴۵۶۷۸۹۰") == "1234567890"


def test_normalize_arabic_indic_digits():
    assert normalize_digits("٠١٢٣٤٥٦٧٨٩") == "0123456789"


def test_normalize_mixed_digits_leaves_other_chars():
    assert normalize_digits("مبلغ ۱۲۳ ریال") == "مبلغ 123 ریال"


def test_parse_amount_strips_persian_thousands_separator():
    assert parse_amount("۲٬۴۵۰٬۰۰۰") == 2_450_000


def test_parse_amount_strips_latin_comma():
    assert parse_amount("2,450,000") == 2_450_000


def test_last4_from_account_text():
    assert last4_from_account_text("····4417") == "4417"
    assert last4_from_account_text("**** **** **** 4417") == "4417"


def test_parsed_withdrawal_converts_rial_to_toman_cents(patterns, keyword_rules):
    body = "بانک تست: خرید 2,450,000 ریال کارت ····4417 مانده 128,940,000 ریال"
    result = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    assert result.status == "parsed"
    # 2,450,000 Rial -> 245,000 Toman -> 24,500,000 Toman-cents (rial * 10, exact)
    assert result.fields.amount_cents == 24_500_000
    assert result.fields.direction == Direction.WITHDRAWAL
    assert result.fields.account_last4 == "4417"


def test_parsed_deposit_direction(patterns, keyword_rules):
    body = "بانک تست: واریز 3,200,000 ریال کارت ····9902"
    result = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"9902"},
    )
    assert result.status == "parsed"
    assert result.fields.direction == Direction.DEPOSIT
    assert result.fields.amount_cents == 32_000_000


def test_persian_digit_amount_in_message(patterns, keyword_rules):
    body = "بانک تست: خرید ۲٬۴۵۰٬۰۰۰ ریال کارت ····4417"
    result = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    assert result.status == "parsed"
    assert result.fields.amount_cents == 24_500_000


def test_non_whitelisted_account_is_ignored(patterns, keyword_rules):
    body = "بانک تست: خرید 2,450,000 ریال کارت ····1234"
    result = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},  # 1234 is not whitelisted
    )
    assert result.status == "ignored_account"
    assert result.fields.account_last4 == "1234"


def test_no_pattern_matches_sender_is_unparsed(patterns, keyword_rules):
    body = "خرید 2,450,000 ریال کارت ····4417"
    result = parse_sms(
        sender="unknown-sender",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    assert result.status == "unparsed"


def test_garbage_message_is_unparsed(patterns, keyword_rules):
    body = "این یک تبلیغ است و ربطی به تراکنش ندارد"
    result = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    assert result.status == "unparsed"


def test_unparsed_generic_extract_still_finds_amount(patterns, keyword_rules):
    # No bank pattern matches (sender unknown), but the generic fallback should
    # still surface a best-effort amount/direction for the inbox.
    body = "برداشت 500,000 ریال از حساب شما"
    result = parse_sms(
        sender="some-random-sender",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    assert result.status == "unparsed"
    assert result.fields.amount_cents == 5_000_000
    assert result.fields.direction == Direction.WITHDRAWAL


def test_jalali_datetime_group_is_parsed_to_utc(patterns, keyword_rules):
    body = "بانک تست: خرید 100,000 ریال کارت ····4417 در تاریخ 1405/06/05-14:05:00"
    result = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    assert result.status == "parsed"
    assert result.fields.occurred_at is not None
    # 1405/06/05 14:05 Tehran time == 1405/06/05 10:35 UTC
    assert result.fields.occurred_at.hour == 10
    assert result.fields.occurred_at.minute == 35


def test_missing_datetime_falls_back_to_received_at(patterns, keyword_rules):
    body = "بانک تست: خرید 100,000 ریال کارت ····4417"
    result = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    assert result.fields.occurred_at == RECEIVED_AT


def test_dedup_hash_is_stable_for_identical_inputs():
    occurred = datetime(2026, 8, 27, 10, 0, tzinfo=UTC)
    h1 = dedup_hash(
        account_last4="4417",
        amount_cents=24_500_000,
        occurred_at=occurred,
        direction=Direction.WITHDRAWAL,
    )
    h2 = dedup_hash(
        account_last4="4417",
        amount_cents=24_500_000,
        occurred_at=occurred,
        direction=Direction.WITHDRAWAL,
    )
    assert h1 == h2


def test_dedup_hash_differs_when_amount_differs():
    occurred = datetime(2026, 8, 27, 10, 0, tzinfo=UTC)
    h1 = dedup_hash(
        account_last4="4417",
        amount_cents=24_500_000,
        occurred_at=occurred,
        direction=Direction.WITHDRAWAL,
    )
    h2 = dedup_hash(
        account_last4="4417", amount_cents=1, occurred_at=occurred, direction=Direction.WITHDRAWAL
    )
    assert h1 != h2


def test_repasting_same_message_produces_same_dedup_hash(patterns, keyword_rules):
    body = "بانک تست: خرید 2,450,000 ریال کارت ····4417"
    result1 = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    result2 = parse_sms(
        sender="testbank",
        body=body,
        received_at=RECEIVED_AT,
        patterns=patterns,
        keyword_rules=keyword_rules,
        whitelisted_last4={"4417"},
    )
    h1 = dedup_hash(
        account_last4=result1.fields.account_last4,
        amount_cents=result1.fields.amount_cents,
        occurred_at=result1.fields.occurred_at,
        direction=result1.fields.direction,
    )
    h2 = dedup_hash(
        account_last4=result2.fields.account_last4,
        amount_cents=result2.fields.amount_cents,
        occurred_at=result2.fields.occurred_at,
        direction=result2.fields.direction,
    )
    assert h1 == h2
