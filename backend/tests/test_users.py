"""Sign-up, and what one user can and can't see of another's data."""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.db import get_session
from app.main import app
from app.models import Category, SmsPattern, User, UserSetting
from app.routers import auth
from app.security import create_session_cookie_value, hash_secret
from app.settings_store import KEY_WEBHOOK_TOKEN_HASH

PASSWORD = "correct horse"


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(autouse=True)
def _use_test_session(session: Session) -> Iterator[None]:
    app.dependency_overrides[get_session] = lambda: session
    yield
    app.dependency_overrides.clear()


def signed_up(username: str) -> TestClient:
    """A client with its own cookie jar, signed in as a brand-new user."""
    client = TestClient(app)
    res = client.post("/api/auth/register", json={"username": username, "password": PASSWORD})
    assert res.status_code == 201, res.text
    return client


def add_account(client: TestClient, last4: str) -> dict:
    res = client.post(
        "/api/accounts",
        json={"name_fa": "حساب", "name_en": "Account", "bank_name": "Melli", "last4": last4},
    )
    assert res.status_code == 200, res.text
    return res.json()


# ---- sign-up -----------------------------------------------------------------


def test_signing_up_signs_you_in() -> None:
    client = signed_up("ali")

    assert client.get("/api/auth/me").json() == {"username": "ali"}


def test_a_new_user_starts_with_their_own_defaults(session: Session) -> None:
    signed_up("ali")
    signed_up("sara")

    users = {u.username: u.id for u in session.exec(select(User)).all()}
    for user_id in users.values():
        categories = session.exec(select(Category).where(Category.user_id == user_id)).all()
        patterns = session.exec(select(SmsPattern).where(SmsPattern.user_id == user_id)).all()
        assert len(categories) == 10
        assert len(patterns) == 12  # six banks, a transaction and an OTP pattern each


def test_a_new_user_sees_none_of_anyone_elses_data() -> None:
    ali = signed_up("ali")
    add_account(ali, "1111")
    ali.post("/api/people", json={"name": "رضا"})

    sara = signed_up("sara")

    assert sara.get("/api/accounts").json() == []
    assert sara.get("/api/people").json() == []
    assert sara.get("/api/transactions").json() == []


def test_usernames_are_case_insensitive() -> None:
    signed_up("ali")

    res = TestClient(app).post("/api/auth/register", json={"username": "ALI", "password": PASSWORD})

    assert res.status_code == 409


def test_a_username_is_stored_lowercase_and_logs_in_any_case() -> None:
    signed_up("Sara.K")

    res = TestClient(app).post("/api/auth/login", json={"username": "SARA.k", "password": PASSWORD})

    assert res.status_code == 200
    assert res.json() == {"username": "sara.k"}


@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("ab", PASSWORD),  # too short
        ("علی", PASSWORD),  # not latin
        ("ali hassani", PASSWORD),  # space
        ("_ali", PASSWORD),  # must start with a letter or digit
        ("ali", "short"),  # password too short
        ("ali", "x" * 73),  # past bcrypt's 72 bytes
    ],
)
def test_bad_usernames_and_passwords_are_refused(username: str, password: str) -> None:
    res = TestClient(app).post(
        "/api/auth/register", json={"username": username, "password": password}
    )

    assert res.status_code == 422


def test_sign_up_can_be_turned_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth.settings, "allow_signup", False)
    client = TestClient(app)

    assert client.get("/api/auth/signup").json() == {"enabled": False}
    res = client.post("/api/auth/register", json={"username": "ali", "password": PASSWORD})
    assert res.status_code == 403


# ---- isolation ---------------------------------------------------------------


def test_another_users_rows_answer_404() -> None:
    ali = signed_up("ali")
    account = add_account(ali, "1111")
    person = ali.post("/api/people", json={"name": "رضا"}).json()

    sara = signed_up("sara")

    assert (
        sara.patch(
            f"/api/accounts/{account['id']}",
            json={"name_fa": "x", "name_en": "x", "bank_name": "x", "last4": "0000"},
        ).status_code
        == 404
    )
    assert sara.delete(f"/api/accounts/{account['id']}").status_code == 404
    assert sara.get(f"/api/people/{person['id']}/debts").status_code == 404
    # Still there, untouched, for its owner.
    assert ali.get("/api/accounts").json()[0]["last4"] == "1111"


def test_a_transaction_cannot_point_at_another_users_account() -> None:
    ali = signed_up("ali")
    account = add_account(ali, "1111")

    sara = signed_up("sara")
    res = sara.post(
        "/api/transactions",
        json={
            "amount_cents": 100_00,
            "direction": "withdrawal",
            "account_id": account["id"],
            "occurred_at": "2026-10-01T10:00:00Z",
        },
    )

    assert res.status_code == 404


def test_a_split_cannot_name_another_users_person() -> None:
    ali = signed_up("ali")
    rezas_id = ali.post("/api/people", json={"name": "رضا"}).json()["id"]

    sara = signed_up("sara")
    account = add_account(sara, "2222")
    tx = sara.post(
        "/api/transactions",
        json={
            "amount_cents": 100_00,
            "direction": "withdrawal",
            "account_id": account["id"],
            "occurred_at": "2026-10-01T10:00:00Z",
        },
    ).json()
    res = sara.post(
        f"/api/transactions/{tx['id']}/split",
        json={
            "mode": "i_paid",
            "method": "equal",
            "participant_person_ids": [rezas_id],
        },
    )

    assert res.status_code == 404


# ---- the SMS webhook ---------------------------------------------------------

WITHDRAWAL_SMS = "بانک ملی: خرید 2,450,000 ریال کارت ····4417 مانده 128,940,000 ریال"


def webhook(token: str) -> int:
    res = TestClient(app).post(
        "/api/ingest/sms",
        headers={"X-Api-Token": token},
        json={"sender": "melli", "body": WITHDRAWAL_SMS, "receivedAt": "2026-10-01T10:00:00Z"},
    )
    return res.status_code


def test_a_webhook_message_lands_in_its_token_owners_inbox() -> None:
    ali = signed_up("ali")
    add_account(ali, "4417")
    token = ali.post("/api/settings/webhook-token/rotate").json()["token"]
    sara = signed_up("sara")
    add_account(sara, "4417")
    sara.post("/api/settings/webhook-token/rotate")

    assert webhook(token) == 200

    assert len(ali.get("/api/sms/pending").json()) == 1
    assert sara.get("/api/sms/pending").json() == []


def test_a_rotated_token_stops_working() -> None:
    ali = signed_up("ali")
    old = ali.post("/api/settings/webhook-token/rotate").json()["token"]
    ali.post("/api/settings/webhook-token/rotate")

    assert webhook(old) == 401


def test_a_token_from_before_multi_user_still_works(session: Session) -> None:
    ali = signed_up("ali")
    add_account(ali, "4417")
    user = session.exec(select(User)).one()
    session.add(
        UserSetting(user_id=user.id, key=KEY_WEBHOOK_TOKEN_HASH, value=hash_secret("old-token"))
    )
    session.commit()

    assert webhook("old-token") == 200
    assert len(ali.get("/api/sms/pending").json()) == 1


def test_the_token_hash_is_never_sent_to_a_client() -> None:
    ali = signed_up("ali")
    ali.post("/api/settings/webhook-token/rotate")

    settings = ali.get("/api/settings").json()

    assert not any("token" in key for key in settings)


# ---- sessions ----------------------------------------------------------------


def test_a_cookie_from_before_multi_user_still_signs_you_in(session: Session) -> None:
    session.add(User(username="Admin", password_hash=hash_secret(PASSWORD)))
    session.commit()
    client = TestClient(app)
    client.cookies.set("wallet_session", _legacy_cookie("Admin"))

    assert client.get("/api/auth/me").json() == {"username": "Admin"}


def test_a_cookie_for_a_deleted_and_recreated_user_is_refused(session: Session) -> None:
    signed_up("ali")
    user = session.exec(select(User)).one()
    assert user.id is not None
    stale = create_session_cookie_value("someone-else", user.id)
    client = TestClient(app)
    client.cookies.set("wallet_session", stale)

    assert client.get("/api/auth/me").status_code == 401


def _legacy_cookie(username: str) -> str:
    from app.security import _serializer

    return _serializer.dumps({"u": username})
