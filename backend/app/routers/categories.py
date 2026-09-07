from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.models import Category

router = APIRouter(
    prefix="/api/categories", tags=["categories"], dependencies=[Depends(get_current_username)]
)


class CategoryIn(BaseModel):
    name_fa: str
    name_en: str
    icon: str = "💰"
    color: str = "#0f9b6e"
    parent_id: int | None = None
    sort_order: int = 0


class CategoryOut(CategoryIn):
    id: int


@router.get("", response_model=list[CategoryOut])
def list_categories(session: Session = Depends(get_session)) -> list[Category]:
    return list(session.exec(select(Category).order_by(Category.sort_order)).all())  # type: ignore[arg-type]


@router.post("", response_model=CategoryOut)
def create_category(body: CategoryIn, session: Session = Depends(get_session)) -> Category:
    category = Category(**body.model_dump())
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, body: CategoryIn, session: Session = Depends(get_session)
) -> Category:
    category = session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="category not found")
    for key, value in body.model_dump().items():
        setattr(category, key, value)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    category = session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="category not found")
    session.delete(category)
    session.commit()
    return {"ok": True}
