from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.models import Account

router = APIRouter(
    prefix="/api/accounts", tags=["accounts"], dependencies=[Depends(get_current_username)]
)


class AccountIn(BaseModel):
    name_fa: str
    name_en: str
    bank_name: str
    last4: str
    is_active: bool = True


class AccountOut(AccountIn):
    id: int


@router.get("", response_model=list[AccountOut])
def list_accounts(session: Session = Depends(get_session)) -> list[Account]:
    return list(session.exec(select(Account)).all())


@router.post("", response_model=AccountOut)
def create_account(body: AccountIn, session: Session = Depends(get_session)) -> Account:
    account = Account(**body.model_dump())
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int, body: AccountIn, session: Session = Depends(get_session)
) -> Account:
    account = session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="account not found")
    for key, value in body.model_dump().items():
        setattr(account, key, value)
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.delete("/{account_id}")
def delete_account(account_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    account = session.get(Account, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="account not found")
    session.delete(account)
    session.commit()
    return {"ok": True}
