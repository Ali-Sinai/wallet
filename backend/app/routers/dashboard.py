from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.jalali import format_jalali_day_month, utc_now
from app.models import Debt, DebtDirection, DebtStatus, Direction
from app.reporting import (
    Period,
    effective_amounts_by_tx,
    resolve_period,
    spend_amount,
    transactions_in_range,
)

router = APIRouter(
    prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_username)]
)


class DailyBar(BaseModel):
    label: str
    amount_cents: int


class DashboardOut(BaseModel):
    total_in_cents: int
    total_out_cents: int
    net_cents: int
    biggest_expense_cents: int
    transaction_count: int
    deposit_count: int
    withdrawal_count: int
    outstanding_debts_owed_to_me_cents: int
    daily_spend: list[DailyBar]
    gross_mode: bool


@router.get("", response_model=DashboardOut)
def dashboard(
    session: Session = Depends(get_session),
    period: Period = "month",
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    gross: bool = False,
) -> DashboardOut:
    start, end = resolve_period(period, date_from, date_to)
    txs = transactions_in_range(session, start, end)
    my_shares = effective_amounts_by_tx(session, [t.id for t in txs if t.id is not None])

    total_in = sum(t.amount_cents for t in txs if t.direction == Direction.DEPOSIT)
    total_out = sum(spend_amount(t, my_shares, gross) for t in txs)
    expenses = [
        spend_amount(t, my_shares, gross) for t in txs if t.direction == Direction.WITHDRAWAL
    ]
    biggest = max(expenses) if expenses else 0

    debts = session.exec(
        select(Debt).where(
            Debt.direction == DebtDirection.OWED_TO_ME, Debt.status != DebtStatus.SETTLED
        )
    ).all()
    outstanding = sum(d.amount_cents - d.amount_settled_cents for d in debts)

    daily: dict[str, int] = {}
    now = utc_now()
    for offset in range(13, -1, -1):
        day = now - timedelta(days=offset)
        label = format_jalali_day_month(day)
        daily[label] = 0

    for tx in txs:
        if tx.direction != Direction.WITHDRAWAL:
            continue
        label = format_jalali_day_month(tx.occurred_at)
        if label in daily:
            daily[label] += spend_amount(tx, my_shares, gross)

    return DashboardOut(
        total_in_cents=total_in,
        total_out_cents=total_out,
        net_cents=total_in - total_out,
        biggest_expense_cents=biggest,
        transaction_count=len(txs),
        deposit_count=sum(1 for t in txs if t.direction == Direction.DEPOSIT),
        withdrawal_count=sum(1 for t in txs if t.direction == Direction.WITHDRAWAL),
        outstanding_debts_owed_to_me_cents=outstanding,
        daily_spend=[DailyBar(label=k, amount_cents=v) for k, v in daily.items()],
        gross_mode=gross,
    )
