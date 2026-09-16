"""Carrying a seller name from an OTP message to the withdrawal that follows it.

Iranian banks send the one-time password for an online purchase as its own
message, moments before the withdrawal SMS. That first message is usually the
only one that names the store; the withdrawal itself says nothing but an
amount and a card. So an OTP match parks what it knows here (`record_hint`)
and the next matching withdrawal claims it (`claim_seller`).

Hints are short-lived by design: a purchase abandoned at the payment page
never produces a withdrawal, and its hint must not attach itself to whatever
the user buys next. `expires_at` — `Settings.otp_hint_ttl_minutes` from the
time the OTP arrived — caps that window, and unclaimed rows are swept
alongside expired ingest attempts.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.config import get_settings
from app.jalali import utc_now
from app.models import Direction, OtpSellerHint
from app.sms_parser import SellerHintFields


def record_hint(
    session: Session,
    *,
    sender: str,
    matched_pattern_id: int | None,
    hint: SellerHintFields,
    received_at: datetime | None = None,
) -> OtpSellerHint:
    now = received_at or utc_now()
    row = OtpSellerHint(
        sender=sender,
        matched_pattern_id=matched_pattern_id,
        seller=hint.seller,
        amount_cents=hint.amount_cents,
        account_last4=hint.account_last4,
        received_at=now,
        expires_at=now + timedelta(minutes=get_settings().otp_hint_ttl_minutes),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def _is_candidate(hint: OtpSellerHint, amount_cents: int | None, last4: str | None) -> bool:
    """A hint can only belong to a purchase it doesn't contradict.

    Both comparisons are skipped when either side doesn't know: plenty of OTP
    messages name no card, and plenty of withdrawal messages name no amount
    the OTP also carried.
    """
    if hint.account_last4 and last4 and hint.account_last4 != last4:
        return False
    if hint.amount_cents is not None and amount_cents is not None:
        return hint.amount_cents == amount_cents
    return True


def claim_seller(
    session: Session,
    *,
    direction: Direction | None,
    amount_cents: int | None,
    account_last4: str | None,
    now: datetime | None = None,
) -> str | None:
    """The store behind a withdrawal, if an OTP message announced it.

    Deletes the hint it returns — one OTP, one purchase. Only withdrawals
    claim: money arriving has nothing to do with a purchase OTP.
    """
    if direction != Direction.WITHDRAWAL:
        return None

    moment = now or utc_now()
    stmt = (
        select(OtpSellerHint)
        .where(OtpSellerHint.expires_at > moment)
        .order_by(OtpSellerHint.received_at.desc())  # type: ignore[attr-defined]
    )
    candidates = [
        h for h in session.exec(stmt).all() if _is_candidate(h, amount_cents, account_last4)
    ]
    if not candidates:
        return None

    # An amount that matches exactly is near-proof this is the right purchase;
    # short of that, the most recent OTP is the best guess available.
    chosen = next(
        (h for h in candidates if h.amount_cents is not None and h.amount_cents == amount_cents),
        candidates[0],
    )
    seller = chosen.seller
    session.delete(chosen)
    session.commit()
    return seller


def purge_expired_hints(session: Session) -> int:
    expired = session.exec(select(OtpSellerHint).where(OtpSellerHint.expires_at < utc_now())).all()
    for row in expired:
        session.delete(row)
    if expired:
        session.commit()
    return len(expired)
