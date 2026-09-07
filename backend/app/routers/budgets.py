from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.models import Budget

router = APIRouter(
    prefix="/api/budgets", tags=["budgets"], dependencies=[Depends(get_current_username)]
)


class BudgetIn(BaseModel):
    category_id: int
    limit_cents: int
    month_jalali: str | None = None


class BudgetOut(BudgetIn):
    id: int


@router.get("", response_model=list[BudgetOut])
def list_budgets(session: Session = Depends(get_session)) -> list[Budget]:
    return list(session.exec(select(Budget)).all())


@router.post("", response_model=BudgetOut)
def create_budget(body: BudgetIn, session: Session = Depends(get_session)) -> Budget:
    budget = Budget(**body.model_dump())
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int, body: BudgetIn, session: Session = Depends(get_session)
) -> Budget:
    budget = session.get(Budget, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="budget not found")
    for key, value in body.model_dump().items():
        setattr(budget, key, value)
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    budget = session.get(Budget, budget_id)
    if budget is None:
        raise HTTPException(status_code=404, detail="budget not found")
    session.delete(budget)
    session.commit()
    return {"ok": True}
