"""Shared aggregation helpers for the dashboard and reports routers."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from sqlmodel import Session, select

from app.jalali import (
    day_range_utc,
    month_range_utc,
    utc_now,
    week_range_utc,
)
from app.models import Direction, Split, SplitShare, Transaction

Period = Literal["today", "week", "month", "custom", "all"]


def resolve_period(
    period: Period, date_from: datetime | None, date_to: datetime | None
) -> tuple[datetime | None, datetime | None]:
    now = utc_now()
    if period == "today":
        return day_range_utc(now)
    if period == "week":
        return week_range_utc(now)
    if period == "month":
        return month_range_utc(now)
    if period == "custom":
        return date_from, date_to
    return None, None  # "all"


def effective_amounts_by_tx(session: Session, tx_ids: list[int]) -> dict[int, int]:
    """Maps transaction_id -> my actual share (amount_cents from the SplitShare
    where person_id is null) for every shared transaction in tx_ids. Transactions
    not present in the result are not shared — callers should fall back to the
    transaction's own amount_cents for those."""
    if not tx_ids:
        return {}
    tx_id_in_tx_ids = Split.transaction_id.in_(tx_ids)  # type: ignore[attr-defined]
    share_is_mine = SplitShare.person_id.is_(None)  # type: ignore[union-attr]
    rows = session.exec(
        select(Split.transaction_id, SplitShare.amount_cents)  # type: ignore[arg-type]
        .join(SplitShare, SplitShare.split_id == Split.id)  # type: ignore[arg-type]
        .where(tx_id_in_tx_ids, share_is_mine)
    ).all()
    return dict(rows)


def effective_amount(tx: Transaction, my_shares: dict[int, int]) -> int:
    if tx.is_shared and tx.id in my_shares:
        return my_shares[tx.id]
    return tx.amount_cents


def transactions_in_range(
    session: Session, start: datetime | None, end: datetime | None
) -> list[Transaction]:
    stmt = select(Transaction)
    if start is not None:
        stmt = stmt.where(Transaction.occurred_at >= start)
    if end is not None:
        stmt = stmt.where(Transaction.occurred_at < end)
    return list(session.exec(stmt).all())


def spend_amount(tx: Transaction, my_shares: dict[int, int], gross: bool) -> int:
    if tx.direction != Direction.WITHDRAWAL:
        return 0
    return tx.amount_cents if gross else effective_amount(tx, my_shares)
