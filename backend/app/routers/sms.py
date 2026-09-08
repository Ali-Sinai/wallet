from __future__ import annotations

import os
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config import get_settings
from app.db import get_session
from app.deps import get_current_username
from app.jalali import utc_now
from app.models import (
    Account,
    Direction,
    KeywordRule,
    ParseStatus,
    SmsIngestAttempt,
    SmsPattern,
    Transaction,
    TxSource,
)
from app.security import verify_secret
from app.settings_store import KEY_WEBHOOK_TOKEN_HASH, get_setting
from app.sms_parser import ParseResult, dedup_hash, parse_sms

settings = get_settings()

router = APIRouter(prefix="/api", tags=["sms"])


def _load_patterns_and_rules(
    session: Session,
) -> tuple[list[SmsPattern], list[KeywordRule], set[str]]:
    patterns = list(session.exec(select(SmsPattern).where(SmsPattern.enabled == True)).all())  # noqa: E712
    rules = list(session.exec(select(KeywordRule)).all())
    whitelisted = {
        a.last4
        for a in session.exec(select(Account).where(Account.is_active == True)).all()  # noqa: E712
    }
    return patterns, rules, whitelisted


def _account_for_last4(session: Session, last4: str | None) -> Account | None:
    if last4 is None:
        return None
    return session.exec(select(Account).where(Account.last4 == last4)).first()


def _store_attempt(session: Session, sender: str, result: ParseResult) -> SmsIngestAttempt | None:
    if result.status == "ignored_account":
        return None  # zero DB footprint, by design — see SmsIngestAttempt docstring

    attempt = SmsIngestAttempt(
        sender=sender,
        matched_pattern_id=result.matched_pattern_id,
        parse_status=ParseStatus.PARSED if result.status == "parsed" else ParseStatus.UNPARSED,
        amount_cents=result.fields.amount_cents,
        direction=result.fields.direction,
        account_last4=result.fields.account_last4,
        occurred_at=result.fields.occurred_at,
        merchant=result.fields.merchant,
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


@router.post("/ingest/sms")
def ingest_webhook(
    body: WebhookIngestBody,
    session: Session = Depends(get_session),
    x_api_token: str | None = Header(default=None),
) -> dict[str, object]:
    token_hash = get_setting(session, KEY_WEBHOOK_TOKEN_HASH)
    if not token_hash or not x_api_token or not verify_secret(x_api_token, token_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid API token")

    patterns, rules, whitelisted = _load_patterns_and_rules(session)
    result = parse_sms(
        sender=body.sender,
        body=body.body,
        received_at=body.receivedAt,
        patterns=patterns,
        keyword_rules=rules,
        whitelisted_last4=whitelisted,
    )
    attempt = _store_attempt(session, body.sender, result)
    return {"status": result.status, "attempt_id": attempt.id if attempt else None}


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
    received_at: datetime


@router.post(
    "/ingest/sms/paste",
    response_model=list[AttemptOut],
    dependencies=[Depends(get_current_username)],
)
def ingest_paste(
    body: PasteBody, session: Session = Depends(get_session)
) -> list[SmsIngestAttempt]:
    patterns, rules, whitelisted = _load_patterns_and_rules(session)
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
        attempt = _store_attempt(session, body.sender_hint, result)
        if attempt is not None:
            created.append(attempt)
    return created


# ---- Pending / unparsed queues ------------------------------------------------


@router.get(
    "/sms/pending", response_model=list[AttemptOut], dependencies=[Depends(get_current_username)]
)
def pending(session: Session = Depends(get_session)) -> list[SmsIngestAttempt]:
    stmt = select(SmsIngestAttempt).where(SmsIngestAttempt.parse_status == ParseStatus.PARSED)
    return list(session.exec(stmt).all())


@router.get(
    "/sms/unparsed", response_model=list[AttemptOut], dependencies=[Depends(get_current_username)]
)
def unparsed(session: Session = Depends(get_session)) -> list[SmsIngestAttempt]:
    stmt = select(SmsIngestAttempt).where(SmsIngestAttempt.parse_status == ParseStatus.UNPARSED)
    return list(session.exec(stmt).all())


class ConfirmBody(BaseModel):
    category_id: int | None = None
    note: str | None = None


@router.post("/sms/{attempt_id}/confirm", dependencies=[Depends(get_current_username)])
def confirm(
    attempt_id: int, body: ConfirmBody, session: Session = Depends(get_session)
) -> dict[str, object]:
    attempt = session.get(SmsIngestAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="attempt not found")
    if attempt.amount_cents is None or attempt.direction is None:
        raise HTTPException(
            status_code=400, detail="attempt is missing required fields; resolve manually instead"
        )

    account = _account_for_last4(session, attempt.account_last4)
    if account is None:
        raise HTTPException(
            status_code=400, detail="no matching whitelisted account; resolve manually instead"
        )

    occurred_at = attempt.occurred_at or attempt.received_at
    h = dedup_hash(
        account_last4=attempt.account_last4,
        amount_cents=attempt.amount_cents,
        occurred_at=occurred_at,
        direction=attempt.direction,
    )
    existing = session.exec(select(Transaction).where(Transaction.dedup_hash == h)).first()
    if existing is not None:
        session.delete(attempt)
        session.commit()
        return {"duplicate": True, "transaction_id": existing.id}

    tx = Transaction(
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


@router.post("/sms/{attempt_id}/ignore", dependencies=[Depends(get_current_username)])
def ignore(attempt_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    attempt = session.get(SmsIngestAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="attempt not found")
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


@router.post("/sms/{attempt_id}/resolve-manually", dependencies=[Depends(get_current_username)])
def resolve_manually(
    attempt_id: int, body: ResolveManuallyBody, session: Session = Depends(get_session)
) -> dict[str, int]:
    attempt = session.get(SmsIngestAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="attempt not found")

    tx = Transaction(
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
    return {"purged": purge_expired_attempts(session)}
