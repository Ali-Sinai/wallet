from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config import get_settings
from app.db import get_session
from app.deps import get_current_username
from app.models import User
from app.security import create_session_cookie_value, verify_secret

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


class LoginRequest(BaseModel):
    username: str
    password: str


class MeResponse(BaseModel):
    username: str


@router.post("/login", response_model=MeResponse)
def login(
    body: LoginRequest, response: Response, session: Session = Depends(get_session)
) -> MeResponse:
    user = session.exec(select(User).where(User.username == body.username)).first()
    if user is None or not verify_secret(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")

    cookie_value = create_session_cookie_value(user.username)
    response.set_cookie(
        key="wallet_session",
        value=cookie_value,
        max_age=settings.session_max_age_seconds,
        httponly=True,
        samesite="lax",
    )
    return MeResponse(username=user.username)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie("wallet_session")
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
def me(username: str = Depends(get_current_username)) -> MeResponse:
    return MeResponse(username=username)
