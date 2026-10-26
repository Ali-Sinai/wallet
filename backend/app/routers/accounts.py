from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import CurrentUser, get_owned
from app.models import Account, User

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


class AccountIn(BaseModel):
    name_fa: str
    name_en: str
    bank_name: str
    last4: str
    is_active: bool = True


class AccountOut(AccountIn):
    id: int


@router.get("", response_model=list[AccountOut])
def list_accounts(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[Account]:
    return list(session.exec(select(Account).where(Account.user_id == user.id)).all())


@router.post("", response_model=AccountOut)
def create_account(
    body: AccountIn, session: Session = Depends(get_session), user: User = CurrentUser
) -> Account:
    account = Account(user_id=user.id, **body.model_dump())
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int,
    body: AccountIn,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> Account:
    account = get_owned(session, Account, account_id, user, "account")
    for key, value in body.model_dump().items():
        setattr(account, key, value)
    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.delete("/{account_id}")
def delete_account(
    account_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    account = get_owned(session, Account, account_id, user, "account")
    session.delete(account)
    session.commit()
    return {"ok": True}
