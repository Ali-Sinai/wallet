from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, field_validator
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.config import get_settings
from app.db import get_session
from app.deps import CurrentUser, user_id_of
from app.models import User
from app.security import create_session_cookie_value, hash_secret, verify_secret
from app.seed_data import ensure_base_data

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

USERNAME_RE = re.compile(r"^[a-z0-9][a-z0-9_.-]{2,31}$")
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72  # bcrypt's limit — see app/security.py


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def _username_shape(cls, v: str) -> str:
        # Lowercased so "Ali" and "ali" can't be two accounts: people type
        # their username from memory, often with whatever case the keyboard
        # gave them.
        v = v.strip().lower()
        if not USERNAME_RE.fullmatch(v):
            raise ValueError(
                "username must be 3-32 characters: English letters, digits, '_', '.' or '-', "
                "starting with a letter or digit"
            )
        return v

    @field_validator("password")
    @classmethod
    def _password_shape(cls, v: str) -> str:
        if len(v) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"password must be at least {PASSWORD_MIN_LENGTH} characters")
        if len(v.encode("utf-8")) > PASSWORD_MAX_BYTES:
            raise ValueError(f"password must be at most {PASSWORD_MAX_BYTES} bytes")
        return v


class MeResponse(BaseModel):
    username: str


def _set_session_cookie(response: Response, user: User) -> None:
    # Cross-site (frontend and backend on different domains, e.g. Vercel +
    # Fly.io) requires SameSite=None + Secure — a cookie can't be sent
    # cross-origin otherwise. Same-origin deployments keep the stricter
    # Lax/non-Secure default, which also works over plain HTTP for local dev.
    response.set_cookie(
        key="wallet_session",
        value=create_session_cookie_value(user.username, user_id_of(user)),
        max_age=settings.session_max_age_seconds,
        httponly=True,
        samesite="none" if settings.cross_site_cookies else "lax",
        secure=settings.cross_site_cookies,
    )


def _find_user(session: Session, username: str) -> User | None:
    """Exact match first; failing that, ignoring case.

    New usernames are stored lowercase, but the admin created from
    WALLET_ADMIN_USERNAME keeps whatever case it was given.
    """
    username = username.strip()
    exact = session.exec(select(User).where(User.username == username)).first()
    if exact is not None:
        return exact
    return session.exec(select(User).where(func.lower(User.username) == username.lower())).first()


@router.post("/login", response_model=MeResponse)
def login(
    body: LoginRequest, response: Response, session: Session = Depends(get_session)
) -> MeResponse:
    user = _find_user(session, body.username)
    if user is None or not verify_secret(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")
    _set_session_cookie(response, user)
    return MeResponse(username=user.username)


@router.get("/signup")
def signup_status() -> dict[str, bool]:
    """Whether this server takes new accounts. Lets a client say so before
    someone fills the whole form in."""
    return {"enabled": settings.allow_signup}


@router.post("/register", response_model=MeResponse, status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest, response: Response, session: Session = Depends(get_session)
) -> MeResponse:
    """Creates an account and signs it in.

    The new user starts with their own copy of the default categories, keyword
    rules and bank SMS patterns, and nothing else — no other user's accounts,
    transactions or people are visible to them.
    """
    if not settings.allow_signup:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="sign-up is disabled")
    if _find_user(session, body.username) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username is taken")

    user = User(username=body.username, password_hash=hash_secret(body.password))
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:  # the same name, registered a moment ago
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="username is taken"
        ) from exc
    session.refresh(user)
    ensure_base_data(session, user_id_of(user))

    _set_session_cookie(response, user)
    return MeResponse(username=user.username)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(
        "wallet_session",
        samesite="none" if settings.cross_site_cookies else "lax",
        secure=settings.cross_site_cookies,
    )
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
def me(user: User = CurrentUser) -> MeResponse:
    return MeResponse(username=user.username)
