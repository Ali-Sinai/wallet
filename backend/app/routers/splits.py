from __future__ import annotations

from typing import Literal, cast

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.models import (
    Debt,
    DebtDirection,
    DebtPayment,
    Split,
    SplitMode,
    SplitShare,
    Transaction,
)
from app.split_math import (
    ME,
    LineItem,
    ParticipantId,
    SplitError,
    custom_amounts_split,
    equal_split,
    itemized_split,
    percentage_split,
)

router = APIRouter(prefix="/api", tags=["splits"], dependencies=[Depends(get_current_username)])


class LineItemIn(BaseModel):
    participant: str  # "me" or str(person_id)
    amount_cents: int
    label: str | None = None


class SplitRequest(BaseModel):
    mode: SplitMode
    method: Literal["equal", "percentage", "custom", "itemized"]
    participant_person_ids: list[int]
    include_me: bool = True
    percentages: dict[str, float] | None = None
    custom_amounts: dict[str, int] | None = None
    line_items: list[LineItemIn] | None = None


class SplitShareOut(BaseModel):
    person_id: int | None
    amount_cents: int


class SplitOut(BaseModel):
    id: int
    transaction_id: int
    mode: SplitMode
    shares: list[SplitShareOut]


def _key_to_participant(key: str) -> ParticipantId:
    return None if key == "me" else int(key)


def _compute_shares(body: SplitRequest, total_cents: int) -> dict[ParticipantId, int]:
    # participant ids here are always int|None (person ids or ME) — ParticipantId is
    # a wider alias shared with split_math.py's generic functions (tests also pass str).
    participants: list[ParticipantId] = list(body.participant_person_ids)
    if body.include_me:
        participants = [ME, *participants]

    try:
        if body.method == "equal":
            return equal_split(total_cents, participants)
        if body.method == "percentage":
            if not body.percentages:
                raise SplitError("percentages required for method=percentage")
            pct = {_key_to_participant(k): v for k, v in body.percentages.items()}
            return percentage_split(total_cents, pct)
        if body.method == "custom":
            if not body.custom_amounts:
                raise SplitError("custom_amounts required for method=custom")
            amounts = {_key_to_participant(k): v for k, v in body.custom_amounts.items()}
            return custom_amounts_split(total_cents, amounts)
        if body.method == "itemized":
            if not body.line_items:
                raise SplitError("line_items required for method=itemized")
            items = [
                LineItem(_key_to_participant(li.participant), li.amount_cents, li.label)
                for li in body.line_items
            ]
            return itemized_split(total_cents, items)
    except SplitError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    raise HTTPException(status_code=400, detail=f"unknown method {body.method}")


@router.post("/transactions/{tx_id}/split", response_model=SplitOut)
def create_split(tx_id: int, body: SplitRequest, session: Session = Depends(get_session)) -> Split:
    tx = session.get(Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    existing = session.exec(select(Split).where(Split.transaction_id == tx_id)).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="transaction already split; delete it first")

    shares = _compute_shares(body, tx.amount_cents)

    split = Split(transaction_id=tx_id, mode=body.mode)
    session.add(split)
    session.flush()

    debt_direction = (
        DebtDirection.OWED_TO_ME if body.mode == SplitMode.I_PAID else DebtDirection.I_OWE
    )

    for participant, amount_cents in shares.items():
        # participant is always int|None in practice (person id or ME) — ParticipantId
        # is only wider because split_math.py's functions are also exercised with str
        # ids in tests.
        person_id = cast(int | None, participant)
        share = SplitShare(split_id=split.id, person_id=person_id, amount_cents=amount_cents)
        session.add(share)
        session.flush()
        if person_id is not None and amount_cents > 0:
            session.add(
                Debt(
                    split_share_id=share.id,  # type: ignore[arg-type]
                    person_id=person_id,
                    direction=debt_direction,
                    amount_cents=amount_cents,
                )
            )

    tx.is_shared = True
    session.add(tx)
    session.commit()
    session.refresh(split)
    return split


@router.get("/splits/{split_id}", response_model=SplitOut)
def get_split(split_id: int, session: Session = Depends(get_session)) -> dict:
    split = session.get(Split, split_id)
    if split is None:
        raise HTTPException(status_code=404, detail="split not found")
    shares = session.exec(select(SplitShare).where(SplitShare.split_id == split_id)).all()
    return {
        "id": split.id,
        "transaction_id": split.transaction_id,
        "mode": split.mode,
        "shares": [{"person_id": s.person_id, "amount_cents": s.amount_cents} for s in shares],
    }


@router.delete("/splits/{split_id}")
def delete_split(split_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    split = session.get(Split, split_id)
    if split is None:
        raise HTTPException(status_code=404, detail="split not found")

    shares = session.exec(select(SplitShare).where(SplitShare.split_id == split_id)).all()
    for share in shares:
        debt = session.exec(select(Debt).where(Debt.split_share_id == share.id)).first()
        if debt is not None:
            has_payments = session.exec(
                select(DebtPayment).where(DebtPayment.debt_id == debt.id)
            ).first()
            if has_payments is not None:
                raise HTTPException(
                    status_code=400,
                    detail="cannot delete a split with settled/partial debt payments",
                )
            session.delete(debt)
        session.delete(share)

    tx = session.get(Transaction, split.transaction_id)
    if tx is not None:
        tx.is_shared = False
        session.add(tx)

    session.delete(split)
    session.commit()
    return {"ok": True}
