from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.jalali import format_jalali_full
from app.models import (
    Direction,
    MerchantCategoryMap,
    Split,
    SplitShare,
    Transaction,
    TxSource,
)
from app.money import assert_positive_money

router = APIRouter(
    prefix="/api/transactions", tags=["transactions"], dependencies=[Depends(get_current_username)]
)


class TransactionIn(BaseModel):
    amount_cents: int
    direction: Direction
    account_id: int
    occurred_at: datetime
    category_id: int | None = None
    note: str | None = None
    merchant_text: str | None = None

    @field_validator("amount_cents")
    @classmethod
    def _amount_is_positive(cls, v: int) -> int:
        return assert_positive_money(v)


class TransactionOut(BaseModel):
    id: int
    amount_cents: int
    direction: Direction
    account_id: int
    occurred_at: datetime
    occurred_at_jalali: str
    category_id: int | None
    note: str | None
    source: TxSource
    merchant_text: str | None
    is_shared: bool


def _to_out(tx: Transaction) -> TransactionOut:
    assert tx.id is not None  # loaded from or just written to DB
    return TransactionOut(
        id=tx.id,
        amount_cents=tx.amount_cents,
        direction=tx.direction,
        account_id=tx.account_id,
        occurred_at=tx.occurred_at,
        occurred_at_jalali=format_jalali_full(tx.occurred_at),
        category_id=tx.category_id,
        note=tx.note,
        source=tx.source,
        merchant_text=tx.merchant_text,
        is_shared=tx.is_shared,
    )


class CategorizeRequest(BaseModel):
    category_id: int


def _merchant_key(text: str) -> str:
    return text.strip().lower()


def _apply_filters(
    stmt,
    date_from: datetime | None,
    date_to: datetime | None,
    direction: Direction | None,
    category_id: int | None,
    account_id: int | None,
    amount_min: int | None,
    amount_max: int | None,
    search: str | None,
):
    if date_from is not None:
        stmt = stmt.where(Transaction.occurred_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(Transaction.occurred_at < date_to)
    if direction is not None:
        stmt = stmt.where(Transaction.direction == direction)
    if category_id is not None:
        stmt = stmt.where(Transaction.category_id == category_id)
    if account_id is not None:
        stmt = stmt.where(Transaction.account_id == account_id)
    if amount_min is not None:
        stmt = stmt.where(Transaction.amount_cents >= amount_min)
    if amount_max is not None:
        stmt = stmt.where(Transaction.amount_cents <= amount_max)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            (Transaction.note.like(like)) | (Transaction.merchant_text.like(like))  # type: ignore[union-attr]
        )
    return stmt


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    session: Session = Depends(get_session),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    direction: Direction | None = None,
    category_id: int | None = None,
    account_id: int | None = None,
    person_id: int | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    search: str | None = None,
    limit: int = Query(default=200, le=1000),
) -> list[TransactionOut]:
    stmt = select(Transaction)
    stmt = _apply_filters(
        stmt, date_from, date_to, direction, category_id, account_id, amount_min, amount_max, search
    )
    if person_id is not None:
        tx_ids = session.exec(
            select(Split.transaction_id)  # type: ignore[arg-type]
            .join(SplitShare, SplitShare.split_id == Split.id)  # type: ignore[arg-type]
            .where(SplitShare.person_id == person_id)
        ).all()
        stmt = stmt.where(Transaction.id.in_(tx_ids))  # type: ignore[union-attr]
    stmt = stmt.order_by(Transaction.occurred_at.desc()).limit(limit)  # type: ignore[attr-defined]
    return [_to_out(tx) for tx in session.exec(stmt).all()]


@router.get("/uncategorized", response_model=list[TransactionOut])
def uncategorized(
    session: Session = Depends(get_session), limit: int = Query(default=50, le=500)
) -> list[TransactionOut]:
    stmt = (
        select(Transaction)
        .where(Transaction.category_id.is_(None))  # type: ignore[union-attr]
        .order_by(Transaction.occurred_at.desc())  # type: ignore[attr-defined]
        .limit(limit)
    )
    return [_to_out(tx) for tx in session.exec(stmt).all()]


@router.get("/export.csv")
def export_csv(
    session: Session = Depends(get_session),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    direction: Direction | None = None,
    category_id: int | None = None,
    account_id: int | None = None,
    amount_min: int | None = None,
    amount_max: int | None = None,
    search: str | None = None,
) -> StreamingResponse:
    stmt = _apply_filters(
        select(Transaction),
        date_from,
        date_to,
        direction,
        category_id,
        account_id,
        amount_min,
        amount_max,
        search,
    ).order_by(Transaction.occurred_at.desc())  # type: ignore[attr-defined]
    rows = session.exec(stmt).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "occurred_at",
            "direction",
            "amount_toman",
            "account_id",
            "category_id",
            "note",
            "merchant",
        ]
    )
    for tx in rows:
        toman = tx.amount_cents // 100
        frac = tx.amount_cents % 100
        amount_str = f"{toman}.{frac:02d}" if frac else str(toman)
        writer.writerow(
            [
                tx.id,
                tx.occurred_at.isoformat(),
                tx.direction.value,
                amount_str,
                tx.account_id,
                tx.category_id,
                tx.note,
                tx.merchant_text,
            ]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.post("", response_model=TransactionOut)
def create_transaction(
    body: TransactionIn, session: Session = Depends(get_session)
) -> TransactionOut:
    tx = Transaction(source=TxSource.MANUAL, **body.model_dump())
    session.add(tx)
    session.commit()
    session.refresh(tx)
    return _to_out(tx)


@router.get("/{tx_id}", response_model=TransactionOut)
def get_transaction(tx_id: int, session: Session = Depends(get_session)) -> TransactionOut:
    tx = session.get(Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    return _to_out(tx)


@router.patch("/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: int, body: TransactionIn, session: Session = Depends(get_session)
) -> TransactionOut:
    tx = session.get(Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    for key, value in body.model_dump().items():
        setattr(tx, key, value)
    session.add(tx)
    session.commit()
    session.refresh(tx)
    return _to_out(tx)


@router.delete("/{tx_id}")
def delete_transaction(tx_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    tx = session.get(Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    session.delete(tx)
    session.commit()
    return {"ok": True}


@router.patch("/{tx_id}/categorize", response_model=TransactionOut)
def categorize(
    tx_id: int, body: CategorizeRequest, session: Session = Depends(get_session)
) -> TransactionOut:
    tx = session.get(Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    tx.category_id = body.category_id
    session.add(tx)

    if tx.merchant_text:
        key = _merchant_key(tx.merchant_text)
        mapping = session.exec(
            select(MerchantCategoryMap).where(MerchantCategoryMap.merchant_key == key)
        ).first()
        if mapping is None:
            session.add(
                MerchantCategoryMap(merchant_key=key, category_id=body.category_id, hit_count=1)
            )
        else:
            mapping.category_id = body.category_id
            mapping.hit_count += 1
            session.add(mapping)

    session.commit()
    session.refresh(tx)
    return _to_out(tx)


@router.get("/suggest-category/{merchant_text}")
def suggest_category(
    merchant_text: str, session: Session = Depends(get_session)
) -> dict[str, int | None]:
    key = _merchant_key(merchant_text)
    mapping = session.exec(
        select(MerchantCategoryMap).where(MerchantCategoryMap.merchant_key == key)
    ).first()
    return {"category_id": mapping.category_id if mapping else None}
