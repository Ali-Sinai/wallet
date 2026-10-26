from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import CurrentUser, check_owned, get_owned
from app.models import Debt, DebtDirection, DebtPayment, DebtStatus, Person, Transaction, User
from app.money import assert_int_money

router = APIRouter(prefix="/api/people", tags=["people"])


class PersonIn(BaseModel):
    name: str
    contact_note: str | None = None


class PersonOut(PersonIn):
    id: int


class DebtOut(BaseModel):
    id: int
    person_id: int
    direction: DebtDirection
    amount_cents: int
    amount_settled_cents: int
    status: DebtStatus
    split_share_id: int


class SettleRequest(BaseModel):
    amount_cents: int
    linked_transaction_id: int | None = None
    note: str | None = None


class PersonBalance(BaseModel):
    person_id: int
    name: str
    net_cents: int  # positive = they owe me, negative = I owe them
    open_debt_count: int


@router.get("", response_model=list[PersonOut])
def list_people(session: Session = Depends(get_session), user: User = CurrentUser) -> list[Person]:
    return list(session.exec(select(Person).where(Person.user_id == user.id)).all())


@router.get("/balances", response_model=list[PersonBalance])
def balances(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[PersonBalance]:
    people = session.exec(select(Person).where(Person.user_id == user.id)).all()
    result = []
    for person in people:
        assert person.id is not None  # loaded from DB, always has a primary key
        debts = session.exec(select(Debt).where(Debt.person_id == person.id)).all()
        net = 0
        open_count = 0
        for debt in debts:
            remaining = debt.amount_cents - debt.amount_settled_cents
            if remaining <= 0:
                continue
            open_count += 1
            net += remaining if debt.direction == DebtDirection.OWED_TO_ME else -remaining
        result.append(
            PersonBalance(
                person_id=person.id, name=person.name, net_cents=net, open_debt_count=open_count
            )
        )
    return result


@router.post("", response_model=PersonOut)
def create_person(
    body: PersonIn, session: Session = Depends(get_session), user: User = CurrentUser
) -> Person:
    person = Person(user_id=user.id, **body.model_dump())
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(
    person_id: int,
    body: PersonIn,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> Person:
    person = get_owned(session, Person, person_id, user, "person")
    for key, value in body.model_dump().items():
        setattr(person, key, value)
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.delete("/{person_id}")
def delete_person(
    person_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    person = get_owned(session, Person, person_id, user, "person")
    session.delete(person)
    session.commit()
    return {"ok": True}


@router.get("/{person_id}/debts", response_model=list[DebtOut])
def person_debts(
    person_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> list[Debt]:
    get_owned(session, Person, person_id, user, "person")
    return list(session.exec(select(Debt).where(Debt.person_id == person_id)).all())


def _apply_settlement(
    session: Session,
    debt: Debt,
    amount_cents: int,
    linked_transaction_id: int | None,
    note: str | None,
) -> Debt:
    assert_int_money(amount_cents)
    remaining = debt.amount_cents - debt.amount_settled_cents
    if amount_cents <= 0 or amount_cents > remaining:
        raise HTTPException(status_code=400, detail=f"amount must be between 1 and {remaining}")

    session.add(
        DebtPayment(
            debt_id=debt.id,  # type: ignore[arg-type]
            amount_cents=amount_cents,
            linked_transaction_id=linked_transaction_id,
            note=note,
        )
    )
    debt.amount_settled_cents += amount_cents
    debt.status = (
        DebtStatus.SETTLED if debt.amount_settled_cents >= debt.amount_cents else DebtStatus.PARTIAL
    )
    session.add(debt)
    session.commit()
    session.refresh(debt)
    return debt


@router.post("/{person_id}/settle-all")
def settle_all(
    person_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, int]:
    get_owned(session, Person, person_id, user, "person")
    debts = session.exec(
        select(Debt).where(Debt.person_id == person_id, Debt.status != DebtStatus.SETTLED)
    ).all()
    count = 0
    for debt in debts:
        remaining = debt.amount_cents - debt.amount_settled_cents
        if remaining > 0:
            _apply_settlement(session, debt, remaining, None, "settle-all")
            count += 1
    return {"settled": count}


debts_router = APIRouter(prefix="/api/debts", tags=["debts"])


@debts_router.get("", response_model=list[DebtOut])
def list_debts(session: Session = Depends(get_session), user: User = CurrentUser) -> list[Debt]:
    stmt = select(Debt).where(Debt.user_id == user.id, Debt.status != DebtStatus.SETTLED)
    return list(session.exec(stmt).all())


@debts_router.post("/{debt_id}/settle", response_model=DebtOut)
def settle_debt(
    debt_id: int,
    body: SettleRequest,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> Debt:
    debt = get_owned(session, Debt, debt_id, user, "debt")
    check_owned(session, Transaction, body.linked_transaction_id, user, "transaction")
    return _apply_settlement(
        session, debt, body.amount_cents, body.linked_transaction_id, body.note
    )
