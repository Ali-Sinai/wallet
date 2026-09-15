from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.db import get_session
from app.deps import get_current_username
from app.jalali import utc_now
from app.main import app
from app.models import Account, Direction, ParseStatus, SmsIngestAttempt, Transaction


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_current_username] = lambda: "tester"
    yield TestClient(app)
    app.dependency_overrides.clear()


def add_account(session: Session, last4: str, *, active: bool = True) -> Account:
    account = Account(
        name_fa="حساب", name_en="Account", bank_name="Bank", last4=last4, is_active=active
    )
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


def add_attempt(
    session: Session, last4: str | None, *, occurred_at: datetime | None = None
) -> SmsIngestAttempt:
    attempt = SmsIngestAttempt(
        sender="melli",
        parse_status=ParseStatus.PARSED,
        amount_cents=15_000_000,
        direction=Direction.WITHDRAWAL,
        account_last4=last4,
        occurred_at=occurred_at,
        expires_at=utc_now() + timedelta(days=14),
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt


def test_confirm_uses_the_account_named_by_the_card_digits(
    client: TestClient, session: Session
) -> None:
    add_account(session, "1111")
    account = add_account(session, "2222")
    attempt = add_attempt(session, "2222")

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"category_id": None, "note": None})

    assert res.status_code == 200
    tx = session.get(Transaction, res.json()["transaction_id"])
    assert tx is not None and tx.account_id == account.id


def test_a_message_with_no_card_digits_falls_back_to_the_only_account(
    client: TestClient, session: Session
) -> None:
    # The regression: a transfer/Blu-style message parses fine but names no
    # card, and confirming it used to 400.
    account = add_account(session, "1111")
    attempt = add_attempt(session, None)

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"category_id": None, "note": None})

    assert res.status_code == 200
    tx = session.get(Transaction, res.json()["transaction_id"])
    assert tx is not None and tx.account_id == account.id
    assert session.get(SmsIngestAttempt, attempt.id) is None


def test_a_message_with_no_card_digits_takes_an_explicit_account(
    client: TestClient, session: Session
) -> None:
    add_account(session, "1111")
    chosen = add_account(session, "2222")
    attempt = add_attempt(session, None)

    res = client.post(
        f"/api/sms/{attempt.id}/confirm", json={"category_id": None, "account_id": chosen.id}
    )

    assert res.status_code == 200
    tx = session.get(Transaction, res.json()["transaction_id"])
    assert tx is not None and tx.account_id == chosen.id


def test_no_card_digits_and_several_accounts_asks_for_one(
    client: TestClient, session: Session
) -> None:
    add_account(session, "1111")
    add_account(session, "2222")
    attempt = add_attempt(session, None)

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"category_id": None})

    assert res.status_code == 400
    assert "account_id" in res.json()["detail"]
    # The attempt survives, so the inbox can ask and retry.
    assert session.get(SmsIngestAttempt, attempt.id) is not None


def test_an_inactive_account_still_counts_as_the_only_one_when_named(
    client: TestClient, session: Session
) -> None:
    account = add_account(session, "3333", active=False)
    attempt = add_attempt(session, "3333")

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"category_id": None})

    assert res.status_code == 200
    tx = session.get(Transaction, res.json()["transaction_id"])
    assert tx is not None and tx.account_id == account.id


def test_an_active_account_wins_when_two_share_a_last4(
    client: TestClient, session: Session
) -> None:
    add_account(session, "4444", active=False)
    current = add_account(session, "4444")
    attempt = add_attempt(session, "4444")

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"category_id": None})

    assert res.status_code == 200
    tx = session.get(Transaction, res.json()["transaction_id"])
    assert tx is not None and tx.account_id == current.id


def test_a_card_the_user_has_no_account_for_is_rejected(
    client: TestClient, session: Session
) -> None:
    add_account(session, "1111")
    attempt = add_attempt(session, "9999")

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"category_id": None})

    assert res.status_code == 400
    assert "9999" in res.json()["detail"]


def test_an_unknown_account_id_is_a_404(client: TestClient, session: Session) -> None:
    add_account(session, "1111")
    attempt = add_attempt(session, None)

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"account_id": 999})

    assert res.status_code == 404


def test_no_accounts_at_all_says_so(client: TestClient, session: Session) -> None:
    attempt = add_attempt(session, None)

    res = client.post(f"/api/sms/{attempt.id}/confirm", json={"category_id": None})

    assert res.status_code == 400
    assert "Accounts" in res.json()["detail"]


def test_confirming_a_duplicate_does_not_create_a_second_transaction(
    client: TestClient, session: Session
) -> None:
    add_account(session, "1111")
    # Same account, amount and instant — what the dedup hash is keyed on, and
    # what a forwarder that delivers the same message twice produces.
    when = utc_now()
    first = add_attempt(session, None, occurred_at=when)
    second = add_attempt(session, None, occurred_at=when)

    one = client.post(f"/api/sms/{first.id}/confirm", json={"category_id": None})
    two = client.post(f"/api/sms/{second.id}/confirm", json={"category_id": None})

    assert one.json()["duplicate"] is False
    assert two.json()["duplicate"] is True
    assert two.json()["transaction_id"] == one.json()["transaction_id"]
    assert len(list(session.exec(select(Transaction)).all())) == 1
