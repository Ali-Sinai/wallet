from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, col, select

from app.db import get_session
from app.deps import CurrentUser, check_owned, get_owned
from app.models import Category, User

router = APIRouter(prefix="/api/categories", tags=["categories"])


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
def list_categories(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[Category]:
    stmt = select(Category).where(Category.user_id == user.id).order_by(col(Category.sort_order))
    return list(session.exec(stmt).all())


@router.post("", response_model=CategoryOut)
def create_category(
    body: CategoryIn, session: Session = Depends(get_session), user: User = CurrentUser
) -> Category:
    check_owned(session, Category, body.parent_id, user, "parent category")
    category = Category(user_id=user.id, **body.model_dump())
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    body: CategoryIn,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> Category:
    category = get_owned(session, Category, category_id, user, "category")
    check_owned(session, Category, body.parent_id, user, "parent category")
    for key, value in body.model_dump().items():
        setattr(category, key, value)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    category = get_owned(session, Category, category_id, user, "category")
    session.delete(category)
    session.commit()
    return {"ok": True}
