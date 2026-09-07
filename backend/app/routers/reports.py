from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.jalali import format_jalali_day_month, jalali_month_key, month_range_utc, utc_now
from app.models import Account, Category, Direction
from app.reporting import (
    Period,
    effective_amounts_by_tx,
    resolve_period,
    spend_amount,
    transactions_in_range,
)

router = APIRouter(
    prefix="/api/reports", tags=["reports"], dependencies=[Depends(get_current_username)]
)


def _common(
    session: Session, period: Period, date_from: datetime | None, date_to: datetime | None
) -> tuple[list, dict[int, int]]:
    start, end = resolve_period(period, date_from, date_to)
    txs = transactions_in_range(session, start, end)
    my_shares = effective_amounts_by_tx(session, [t.id for t in txs if t.id is not None])
    return txs, my_shares


class Point(BaseModel):
    label: str
    amount_cents: int


@router.get("/spend-over-time", response_model=list[Point])
def spend_over_time(
    session: Session = Depends(get_session),
    period: Period = "month",
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    gross: bool = False,
    group_by: str = "day",  # "day" | "month"
) -> list[Point]:
    txs, my_shares = _common(session, period, date_from, date_to)
    buckets: dict[str, int] = {}
    for tx in txs:
        key = (
            jalali_month_key(tx.occurred_at)
            if group_by == "month"
            else format_jalali_day_month(tx.occurred_at)
        )
        buckets[key] = buckets.get(key, 0) + spend_amount(tx, my_shares, gross)
    return [Point(label=k, amount_cents=v) for k, v in sorted(buckets.items())]


class CategorySlice(BaseModel):
    category_id: int | None
    label: str
    color: str
    amount_cents: int
    percentage: float


@router.get("/category-breakdown", response_model=list[CategorySlice])
def category_breakdown(
    session: Session = Depends(get_session),
    period: Period = "month",
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    gross: bool = False,
) -> list[CategorySlice]:
    txs, my_shares = _common(session, period, date_from, date_to)
    categories = {c.id: c for c in session.exec(select(Category)).all()}

    totals: dict[int | None, int] = {}
    for tx in txs:
        if tx.direction != Direction.WITHDRAWAL:
            continue
        amount = spend_amount(tx, my_shares, gross)
        totals[tx.category_id] = totals.get(tx.category_id, 0) + amount

    grand_total = sum(totals.values()) or 1
    result = []
    for category_id, amount in sorted(totals.items(), key=lambda kv: -kv[1]):
        cat = categories.get(category_id) if category_id else None
        result.append(
            CategorySlice(
                category_id=category_id,
                label=cat.name_fa if cat else "دسته‌بندی نشده",
                color=cat.color if cat else "#5a6663",
                amount_cents=amount,
                percentage=round(amount / grand_total * 100, 1),
            )
        )
    return result


class IncomeExpense(BaseModel):
    income_cents: int
    expense_cents: int


@router.get("/income-vs-expense", response_model=IncomeExpense)
def income_vs_expense(
    session: Session = Depends(get_session),
    period: Period = "month",
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    gross: bool = False,
) -> IncomeExpense:
    txs, my_shares = _common(session, period, date_from, date_to)
    income = sum(t.amount_cents for t in txs if t.direction == Direction.DEPOSIT)
    expense = sum(spend_amount(t, my_shares, gross) for t in txs)
    return IncomeExpense(income_cents=income, expense_cents=expense)


class MonthCategoryDelta(BaseModel):
    category_id: int | None
    label: str
    current_cents: int
    previous_cents: int
    delta_percentage: float | None


@router.get("/month-over-month", response_model=list[MonthCategoryDelta])
def month_over_month(
    session: Session = Depends(get_session), gross: bool = False
) -> list[MonthCategoryDelta]:
    now = utc_now()
    cur_start, cur_end = month_range_utc(now)
    prev_reference = cur_start - timedelta(days=1)
    prev_start, prev_end = month_range_utc(prev_reference)

    categories = {c.id: c for c in session.exec(select(Category)).all()}

    def totals_for(start: datetime, end: datetime) -> dict[int | None, int]:
        txs = transactions_in_range(session, start, end)
        my_shares = effective_amounts_by_tx(session, [t.id for t in txs if t.id is not None])
        out: dict[int | None, int] = {}
        for tx in txs:
            if tx.direction != Direction.WITHDRAWAL:
                continue
            out[tx.category_id] = out.get(tx.category_id, 0) + spend_amount(tx, my_shares, gross)
        return out

    current = totals_for(cur_start, cur_end)
    previous = totals_for(prev_start, prev_end)

    all_ids = set(current) | set(previous)
    result = []
    for category_id in all_ids:
        cur_amount = current.get(category_id, 0)
        prev_amount = previous.get(category_id, 0)
        delta = (
            None if prev_amount == 0 else round((cur_amount - prev_amount) / prev_amount * 100, 1)
        )
        cat = categories.get(category_id) if category_id else None
        result.append(
            MonthCategoryDelta(
                category_id=category_id,
                label=cat.name_fa if cat else "دسته‌بندی نشده",
                current_cents=cur_amount,
                previous_cents=prev_amount,
                delta_percentage=delta,
            )
        )
    return sorted(result, key=lambda r: -r.current_cents)


class AccountBreakdown(BaseModel):
    account_id: int
    label: str
    total_in_cents: int
    total_out_cents: int


@router.get("/by-account", response_model=list[AccountBreakdown])
def by_account(
    session: Session = Depends(get_session),
    period: Period = "month",
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    gross: bool = False,
) -> list[AccountBreakdown]:
    txs, my_shares = _common(session, period, date_from, date_to)
    accounts = {a.id: a for a in session.exec(select(Account)).all()}

    totals: dict[int, dict[str, int]] = {}
    for tx in txs:
        bucket = totals.setdefault(tx.account_id, {"in": 0, "out": 0})
        if tx.direction == Direction.DEPOSIT:
            bucket["in"] += tx.amount_cents
        else:
            bucket["out"] += spend_amount(tx, my_shares, gross)

    result = []
    for account_id, bucket in totals.items():
        account = accounts.get(account_id)
        label = f"{account.bank_name} ····{account.last4}" if account else str(account_id)
        result.append(
            AccountBreakdown(
                account_id=account_id,
                label=label,
                total_in_cents=bucket["in"],
                total_out_cents=bucket["out"],
            )
        )
    return result
