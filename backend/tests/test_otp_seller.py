"""The OTP → withdrawal seller handoff, end to end through the ingest API."""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.db import get_session
from app.deps import get_current_username
from app.jalali import utc_now
from app.main import app
from app.models import (
    Account,
    AmountUnit,
    Direction,
    KeywordRule,
    OtpSellerHint,
    ParseStatus,
    PatternKind,
    SmsIngestAttempt,
    SmsPattern,
)
from app.seed_data import (
    DEFAULT_KEYWORD_RULES,
    DEFAULT_OTP_PATTERNS,
    DEFAULT_SMS_PATTERNS,
)
from app.seller_hints import claim_seller, purge_expired_hints, record_hint
from app.sms_parser import SellerHintFields, parse_sms

OTP_SMS = """رمز پویا: 46829175
مبلغ: 2,450,000 ریال
پذیرنده: دیجی کالا
کارت: 6037****4417"""

WITHDRAWAL_SMS = "بانک ملی: خرید 2,450,000 ریال کارت ····4417 مانده 128,940,000 ریال"


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        for keyword, direction in DEFAULT_KEYWORD_RULES:
            session.add(KeywordRule(keyword=keyword, direction=direction))
        for p in DEFAULT_SMS_PATTERNS + DEFAULT_OTP_PATTERNS:
            session.add(SmsPattern(amount_unit=AmountUnit.RIAL, enabled=True, **p))
        session.add(
            Account(
                name_fa="حساب",
                name_en="Account",
                bank_name="Melli",
                last4="4417",
                is_active=True,
            )
        )
        session.commit()
        yield session


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_username] = lambda: "tester"
    yield TestClient(app)
    app.dependency_overrides.clear()


def paste(client: TestClient, text: str, sender: str = "melli") -> list[dict]:
    res = client.post("/api/ingest/sms/paste", json={"text": text, "sender_hint": sender})
    assert res.status_code == 200, res.text
    return res.json()


def patterns_and_rules(session: Session) -> tuple[list[SmsPattern], list[KeywordRule]]:
    return (
        list(session.exec(select(SmsPattern)).all()),
        list(session.exec(select(KeywordRule)).all()),
    )


# ---- parsing -----------------------------------------------------------------


def test_an_otp_message_is_read_as_a_seller_hint_not_a_transaction(session: Session) -> None:
    patterns, rules = patterns_and_rules(session)
    result = parse_sms(
        sender="melli",
        body=OTP_SMS,
        received_at=datetime(2026, 8, 27, 12, tzinfo=UTC),
        patterns=patterns,
        keyword_rules=rules,
        whitelisted_last4={"4417"},
    )

    assert result.status == "otp"
    assert result.seller_hint is not None
    assert result.seller_hint.seller == "دیجی کالا"
    assert result.seller_hint.amount_cents == 24_500_000  # 2,450,000 Rial
    assert result.seller_hint.account_last4 == "4417"
    # It says "خرید"-shaped things, but no money moved with it.
    assert result.fields.amount_cents is None


def test_an_otp_pattern_that_captures_no_seller_is_passed_over(session: Session) -> None:
    session.add(
        SmsPattern(
            name="broken otp",
            sender_match="",
            body_regex=r"رمز پویا",  # matches, but captures nothing
            kind=PatternKind.OTP,
            enabled=True,
        )
    )
    session.commit()
    patterns, rules = patterns_and_rules(session)

    result = parse_sms(
        sender="unknownbank",
        body="رمز پویا: 123456",
        received_at=utc_now(),
        patterns=patterns,
        keyword_rules=rules,
        whitelisted_last4={"4417"},
    )

    assert result.status == "unparsed"


# ---- the handoff --------------------------------------------------------------


def test_the_withdrawal_after_an_otp_takes_its_seller(client: TestClient, session: Session) -> None:
    assert paste(client, OTP_SMS) == []  # the OTP itself never reaches the inbox
    [attempt] = paste(client, WITHDRAWAL_SMS)

    assert attempt["merchant"] == "دیجی کالا"
    assert attempt["parse_status"] == "parsed"
    # Claimed hints are gone — one OTP, one purchase.
    assert session.exec(select(OtpSellerHint)).all() == []


def test_a_second_withdrawal_does_not_reuse_a_claimed_seller(
    client: TestClient, session: Session
) -> None:
    paste(client, OTP_SMS)
    paste(client, WITHDRAWAL_SMS)
    [second] = paste(client, "بانک ملی: خرید 310,000 ریال کارت ····4417 مانده 128,630,000 ریال")

    assert second["merchant"] is None


def test_a_deposit_never_claims_a_seller(client: TestClient, session: Session) -> None:
    paste(client, OTP_SMS)
    [deposit] = paste(client, "بانک ملی: واریز 2,450,000 ریال کارت ····4417")

    assert deposit["merchant"] is None
    assert len(session.exec(select(OtpSellerHint)).all()) == 1  # still waiting


def test_a_seller_named_by_the_withdrawal_itself_wins(client: TestClient, session: Session) -> None:
    session.add(
        SmsPattern(
            name="با فروشنده",
            sender_match="testbank",
            body_regex=(
                r"(?P<type>خرید)[^\d]{0,20}(?P<amount>[\d,]{4,})\s*ریال"
                r"[^\n]*?از\s+(?P<merchant>[^\n\r]{2,40})"
            ),
            kind=PatternKind.TRANSACTION,
            enabled=True,
        )
    )
    session.commit()

    paste(client, OTP_SMS)
    [attempt] = paste(client, "خرید 2,450,000 ریال از فروشگاه رفاه", sender="testbank")

    assert attempt["merchant"] == "فروشگاه رفاه"


def test_an_expired_hint_is_not_claimed(session: Session) -> None:
    record_hint(
        session,
        sender="melli",
        matched_pattern_id=None,
        hint=SellerHintFields(seller="دیجی کالا", amount_cents=24_500_000, account_last4="4417"),
        received_at=utc_now() - timedelta(days=1),  # well past otp_hint_ttl_minutes
    )

    seller = claim_seller(
        session,
        direction=Direction.WITHDRAWAL,
        amount_cents=24_500_000,
        account_last4="4417",
        now=utc_now(),
    )

    assert seller is None
    assert purge_expired_hints(session) == 1
    assert session.exec(select(OtpSellerHint)).all() == []


def test_a_hint_for_another_card_is_not_claimed(session: Session) -> None:
    record_hint(
        session,
        sender="melli",
        matched_pattern_id=None,
        hint=SellerHintFields(seller="دیجی کالا", amount_cents=None, account_last4="9999"),
    )

    seller = claim_seller(
        session, direction=Direction.WITHDRAWAL, amount_cents=24_500_000, account_last4="4417"
    )

    assert seller is None


def test_the_hint_whose_amount_matches_wins_over_the_newer_one(session: Session) -> None:
    record_hint(
        session,
        sender="melli",
        matched_pattern_id=None,
        hint=SellerHintFields(seller="دیجی کالا", amount_cents=24_500_000, account_last4=None),
    )
    record_hint(
        session,
        sender="melli",
        matched_pattern_id=None,
        hint=SellerHintFields(seller="اسنپ", amount_cents=990_000, account_last4=None),
    )

    seller = claim_seller(
        session, direction=Direction.WITHDRAWAL, amount_cents=24_500_000, account_last4="4417"
    )

    assert seller == "دیجی کالا"


def test_pending_hints_are_listed_and_can_be_dropped(client: TestClient) -> None:
    paste(client, OTP_SMS)

    listed = client.get("/api/sms/seller-hints").json()
    assert [h["seller"] for h in listed] == ["دیجی کالا"]

    assert client.delete(f"/api/sms/seller-hints/{listed[0]['id']}").status_code == 200
    assert client.get("/api/sms/seller-hints").json() == []


# ---- raw body on unparsed attempts -------------------------------------------


def test_an_unparsed_message_keeps_its_text(client: TestClient, session: Session) -> None:
    text = "یک پیامک نامفهوم از بانک ناشناس"
    [attempt] = paste(client, text, sender="somebank")

    assert attempt["parse_status"] == "unparsed"
    assert attempt["raw_body"] == text


def test_a_parsed_message_keeps_no_text(client: TestClient) -> None:
    [attempt] = paste(client, WITHDRAWAL_SMS)

    assert attempt["parse_status"] == "parsed"
    assert attempt["raw_body"] is None


def test_the_text_dies_with_the_attempt(client: TestClient, session: Session) -> None:
    [attempt] = paste(client, "یک پیامک نامفهوم از بانک ناشناس", sender="somebank")

    assert client.post(f"/api/sms/{attempt['id']}/ignore").status_code == 200
    assert session.get(SmsIngestAttempt, attempt["id"]) is None
    assert (
        session.exec(
            select(SmsIngestAttempt).where(SmsIngestAttempt.parse_status == ParseStatus.UNPARSED)
        ).all()
        == []
    )
