from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import CurrentUser, check_owned, get_owned
from app.models import Budget, Category, User

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


class BudgetIn(BaseModel):
    category_id: int
    limit_cents: int
    month_jalali: str | None = None


class BudgetOut(BudgetIn):
    id: int


@router.get("", response_model=list[BudgetOut])
def list_budgets(session: Session = Depends(get_session), user: User = CurrentUser) -> list[Budget]:
    return list(session.exec(select(Budget).where(Budget.user_id == user.id)).all())


@router.post("", response_model=BudgetOut)
def create_budget(
    body: BudgetIn, session: Session = Depends(get_session), user: User = CurrentUser
) -> Budget:
    check_owned(session, Category, body.category_id, user, "category")
    budget = Budget(user_id=user.id, **body.model_dump())
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    body: BudgetIn,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> Budget:
    budget = get_owned(session, Budget, budget_id, user, "budget")
    check_owned(session, Category, body.category_id, user, "category")
    for key, value in body.model_dump().items():
        setattr(budget, key, value)
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    budget = get_owned(session, Budget, budget_id, user, "budget")
    session.delete(budget)
    session.commit()
    return {"ok": True}
