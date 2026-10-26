from __future__ import annotations

import os
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config import get_settings
from app.db import get_session
from app.deps import CurrentUser, check_owned, get_owned, user_id_of
from app.jalali import utc_now
from app.models import (
    Account,
    Category,
    Direction,
    KeywordRule,
    OtpSellerHint,
    ParseStatus,
    SmsIngestAttempt,
    SmsPattern,
    Transaction,
    TxSource,
    User,
    UserSetting,
)
from app.security import api_token_digest, verify_secret
from app.seller_hints import claim_seller, purge_expired_hints, record_hint
from app.settings_store import KEY_WEBHOOK_TOKEN_DIGEST, KEY_WEBHOOK_TOKEN_HASH
from app.sms_parser import ParseResult, dedup_hash, parse_sms

settings = get_settings()

router = APIRouter(prefix="/api", tags=["sms"])


def _load_patterns_and_rules(
    session: Session, user_id: int
) -> tuple[list[SmsPattern], list[KeywordRule], set[str]]:
    patterns = list(
        session.exec(
            select(SmsPattern).where(SmsPattern.user_id == user_id, SmsPattern.enabled == True)  # noqa: E712
        ).all()
    )
    rules = list(session.exec(select(KeywordRule).where(KeywordRule.user_id == user_id)).all())
    whitelisted = {a.last4 for a in _active_accounts(session, user_id)}
    return patterns, rules, whitelisted


def _account_for_last4(session: Session, user_id: int, last4: str | None) -> Account | None:
    if last4 is None:
        return None
    matches = list(
        session.exec(
            select(Account).where(Account.user_id == user_id, Account.last4 == last4)
        ).all()
    )
    # A replaced card usually keeps the same trailing digits as the old one, so
    # prefer the account still in use when several rows share a last4.
    return next((a for a in matches if a.is_active), matches[0] if matches else None)


def _active_accounts(session: Session, user_id: int) -> list[Account]:
    return list(
        session.exec(
            select(Account).where(Account.user_id == user_id, Account.is_active == True)  # noqa: E712
        ).all()
    )


def _store_attempt(
    session: Session, user_id: int, sender: str, body: str, result: ParseResult
) -> SmsIngestAttempt | None:
    if result.status == "ignored_account":
        return None  # zero DB footprint, by design — see SmsIngestAttempt docstring

    if result.status == "otp":
        # No money moved: park the store's name for the withdrawal that follows.
        if result.seller_hint is not None:
            record_hint(
                session,
                user_id=user_id,
                sender=sender,
                matched_pattern_id=result.matched_pattern_id,
                hint=result.seller_hint,
            )
        return None

    unparsed = result.status != "parsed"
    merchant = result.fields.merchant
    if merchant is None:
        # An online purchase names its store only in the OTP message sent just
        # before this one — see app/seller_hints.py.
        merchant = claim_seller(
            session,
            user_id=user_id,
            direction=result.fields.direction,
            amount_cents=result.fields.amount_cents,
        )

    attempt = SmsIngestAttempt(
        user_id=user_id,
        sender=sender,
        matched_pattern_id=result.matched_pattern_id,
        parse_status=ParseStatus.UNPARSED if unparsed else ParseStatus.PARSED,
        amount_cents=result.fields.amount_cents,
        direction=result.fields.direction,
        account_last4=result.fields.account_last4,
        occurred_at=result.fields.occurred_at,
        merchant=merchant,
        # Only a message no pattern could read keeps its text, and only until
        # it's resolved: without it there's nothing to show and no way to tell
        # what rule to write. See the SmsIngestAttempt docstring.
        raw_body=body if unparsed else None,
        expires_at=utc_now() + timedelta(days=settings.ingest_attempt_retention_days),
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt


# ---- Webhook ingestion (SMS-forwarder apps) ----------------------------------


class WebhookIngestBody(BaseModel):
    sender: str
    body: str
    receivedAt: datetime


def _user_for_token(session: Session, token: str) -> int | None:
    """Whose webhook token this is — the token is all a forwarder sends.

    Tokens rotated since multi-user are stored as a searchable digest. One
    from before is a salted bcrypt hash that can only be checked, not looked
    up, so those few rows are tried one by one; rotating replaces it.
    """
    row = session.exec(
        select(UserSetting).where(
            UserSetting.key == KEY_WEBHOOK_TOKEN_DIGEST,
            UserSetting.value == api_token_digest(token),
        )
    ).first()
    if row is not None:
        return row.user_id
    legacy = session.exec(
        select(UserSetting).where(UserSetting.key == KEY_WEBHOOK_TOKEN_HASH)
    ).all()
    return next((r.user_id for r in legacy if verify_secret(token, r.value)), None)


@router.post("/ingest/sms")
def ingest_webhook(
    body: WebhookIngestBody,
    session: Session = Depends(get_session),
    x_api_token: str | None = Header(default=None),
) -> dict[str, object]:
    # Forwarder apps' header fields happily keep a stray space or newline from
    # a paste; the token itself is URL-safe base64 and never contains either.
    x_api_token = x_api_token.strip() if x_api_token else None
    user_id = _user_for_token(session, x_api_token) if x_api_token else None
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid API token")

    patterns, rules, whitelisted = _load_patterns_and_rules(session, user_id)
    result = parse_sms(
        sender=body.sender,
        body=body.body,
        received_at=body.receivedAt,
        patterns=patterns,
        keyword_rules=rules,
        whitelisted_last4=whitelisted,
    )
    attempt = _store_attempt(session, user_id, body.sender, body.body, result)
    return {
        "status": result.status,
        "attempt_id": attempt.id if attempt else None,
        "seller": result.seller_hint.seller if result.seller_hint else None,
    }


# ---- Paste box (authenticated) -----------------------------------------------

_MESSAGE_SPLIT_RE = re.compile(r"\n\s*\n+")


class PasteBody(BaseModel):
    text: str
    sender_hint: str = "paste"


class AttemptOut(BaseModel):
    id: int
    sender: str
    parse_status: ParseStatus
    matched_pattern_id: int | None
    amount_cents: int | None
    direction: Direction | None
    account_last4: str | None
    occurred_at: datetime | None
    merchant: str | None
    # The message itself, carried only by unparsed attempts — null everywhere
    # else. Nothing persists it past the attempt row.
    raw_body: str | None
    received_at: datetime


@router.post("/ingest/sms/paste", response_model=list[AttemptOut])
def ingest_paste(
    body: PasteBody, session: Session = Depends(get_session), user: User = CurrentUser
) -> list[SmsIngestAttempt]:
    patterns, rules, whitelisted = _load_patterns_and_rules(session, user_id_of(user))
    messages = [m.strip() for m in _MESSAGE_SPLIT_RE.split(body.text) if m.strip()]
    if not messages:
        messages = [body.text.strip()] if body.text.strip() else []

    created: list[SmsIngestAttempt] = []
    for message in messages:
        result = parse_sms(
            sender=body.sender_hint,
            body=message,
            received_at=utc_now(),
            patterns=patterns,
            keyword_rules=rules,
            whitelisted_last4=whitelisted,
        )
        attempt = _store_attempt(session, user_id_of(user), body.sender_hint, message, result)
        if attempt is not None:
            created.append(attempt)
    return created


# ---- Pending / unparsed queues ------------------------------------------------


def _attempts(session: Session, user: User, status: ParseStatus) -> list[SmsIngestAttempt]:
    stmt = select(SmsIngestAttempt).where(
        SmsIngestAttempt.user_id == user.id, SmsIngestAttempt.parse_status == status
    )
    return list(session.exec(stmt).all())


@router.get("/sms/pending", response_model=list[AttemptOut])
def pending(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[SmsIngestAttempt]:
    return _attempts(session, user, ParseStatus.PARSED)


@router.get("/sms/unparsed", response_model=list[AttemptOut])
def unparsed(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[SmsIngestAttempt]:
    return _attempts(session, user, ParseStatus.UNPARSED)


# ---- Seller hints from OTP messages -------------------------------------------


class SellerHintOut(BaseModel):
    id: int
    sender: str
    seller: str
    amount_cents: int | None
    received_at: datetime
    expires_at: datetime


@router.get("/sms/seller-hints", response_model=list[SellerHintOut])
def seller_hints(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[OtpSellerHint]:
    """Stores named by an OTP message whose purchase hasn't arrived yet.

    Read-only, and mostly there so an unexpected merchant on a transaction is
    explainable: this is the queue it came from.
    """
    stmt = (
        select(OtpSellerHint)
        .where(OtpSellerHint.user_id == user.id, OtpSellerHint.expires_at > utc_now())
        .order_by(OtpSellerHint.received_at.desc())  # type: ignore[attr-defined]
    )
    return list(session.exec(stmt).all())


@router.delete("/sms/seller-hints/{hint_id}")
def delete_seller_hint(
    hint_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    hint = get_owned(session, OtpSellerHint, hint_id, user, "hint")
    session.delete(hint)
    session.commit()
    return {"ok": True}


class ConfirmBody(BaseModel):
    category_id: int | None = None
    note: str | None = None
    # Which account the transaction lands in. Normally left out: the account is
    # recovered from the card digits in the message. Only messages that carry no
    # digits at all, on a setup with more than one account, need it — see
    # _resolve_account.
    account_id: int | None = None


def _resolve_account(
    session: Session, user: User, attempt: SmsIngestAttempt, account_id: int | None
) -> Account:
    """Which account a confirmed attempt belongs to.

    Plenty of bank messages name no card at all — a transfer confirmation, most
    of Blu's wording — and the patterns treat the card digits as optional, so
    those parse fine and show up in the inbox with everything but an account.
    Confirming them used to 400 outright; now an explicit account_id settles it,
    and a single-account setup (the common case) needs no choice at all.
    """
    if account_id is not None:
        return get_owned(session, Account, account_id, user, "account")

    account = _account_for_last4(session, user_id_of(user), attempt.account_last4)
    if account is not None:
        return account

    if attempt.account_last4 is not None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"no account matches card ····{attempt.account_last4}; "
                "add it under Accounts, or confirm with an explicit account_id"
            ),
        )

    active = _active_accounts(session, user_id_of(user))
    if len(active) == 1:
        return active[0]
    if not active:
        raise HTTPException(
            status_code=400, detail="no active account to file this under; add one under Accounts"
        )
    raise HTTPException(
        status_code=400,
        detail="this message names no card; confirm with an explicit account_id",
    )


@router.post("/sms/{attempt_id}/confirm")
def confirm(
    attempt_id: int,
    body: ConfirmBody,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> dict[str, object]:
    attempt = get_owned(session, SmsIngestAttempt, attempt_id, user, "attempt")
    if attempt.amount_cents is None or attempt.direction is None:
        raise HTTPException(
            status_code=400, detail="attempt is missing required fields; resolve manually instead"
        )

    account = _resolve_account(session, user, attempt, body.account_id)
    check_owned(session, Category, body.category_id, user, "category")

    occurred_at = attempt.occurred_at or attempt.received_at
    h = dedup_hash(
        account_last4=attempt.account_last4,
        amount_cents=attempt.amount_cents,
        occurred_at=occurred_at,
        direction=attempt.direction,
    )
    existing = session.exec(
        select(Transaction).where(Transaction.user_id == user.id, Transaction.dedup_hash == h)
    ).first()
    if existing is not None:
        session.delete(attempt)
        session.commit()
        return {"duplicate": True, "transaction_id": existing.id}

    tx = Transaction(
        user_id=user.id,
        amount_cents=attempt.amount_cents,
        direction=attempt.direction,
        account_id=account.id,  # type: ignore[arg-type]
        occurred_at=occurred_at,
        category_id=body.category_id,
        note=body.note,
        source=TxSource.SMS,
        merchant_text=attempt.merchant,
        dedup_hash=h,
    )
    session.add(tx)
    session.delete(attempt)
    session.commit()
    session.refresh(tx)
    return {"duplicate": False, "transaction_id": tx.id}


@router.post("/sms/{attempt_id}/ignore")
def ignore(
    attempt_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    attempt = get_owned(session, SmsIngestAttempt, attempt_id, user, "attempt")
    session.delete(attempt)
    session.commit()
    return {"ok": True}


class ResolveManuallyBody(BaseModel):
    amount_cents: int
    direction: Direction
    account_id: int
    occurred_at: datetime
    category_id: int | None = None
    note: str | None = None


@router.post("/sms/{attempt_id}/resolve-manually")
def resolve_manually(
    attempt_id: int,
    body: ResolveManuallyBody,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> dict[str, int]:
    attempt = get_owned(session, SmsIngestAttempt, attempt_id, user, "attempt")
    check_owned(session, Account, body.account_id, user, "account")
    check_owned(session, Category, body.category_id, user, "category")

    tx = Transaction(
        user_id=user.id,
        amount_cents=body.amount_cents,
        direction=body.direction,
        account_id=body.account_id,
        occurred_at=body.occurred_at,
        category_id=body.category_id,
        note=body.note,
        source=TxSource.MANUAL,
        merchant_text=attempt.merchant,
    )
    session.add(tx)
    session.delete(attempt)
    session.commit()
    session.refresh(tx)
    return {"transaction_id": tx.id}  # type: ignore[dict-item]


def purge_expired_attempts(session: Session) -> int:
    now = utc_now()
    stmt = select(SmsIngestAttempt).where(SmsIngestAttempt.expires_at < now)
    expired = session.exec(stmt).all()
    for row in expired:
        session.delete(row)
    if expired:
        session.commit()
    return len(expired)


@router.get("/internal/purge-sms-attempts")
def purge_sms_attempts_endpoint(
    session: Session = Depends(get_session), authorization: str | None = Header(default=None)
) -> dict[str, int]:
    """Vercel Cron target — replaces the in-process background sweep used on a
    long-running server (see main.py), since serverless functions can't run a
    persistent background loop. Vercel automatically sends
    `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when a
    CRON_SECRET env var is set on the project; we just check it matches."""
    expected = os.environ.get("CRON_SECRET")
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid cron secret")
    return {
        "purged": purge_expired_attempts(session),
        "purged_seller_hints": purge_expired_hints(session),
    }
