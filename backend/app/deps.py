from __future__ import annotations

from collections.abc import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.security import read_session_cookie_value


def db_session() -> Generator[Session, None, None]:
    yield from get_session()


DbSession = Depends(db_session)


def get_current_username(wallet_session: str | None = Cookie(default=None)) -> str:
    username = read_session_cookie_value(wallet_session)
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")
    return username


CurrentUser = Depends(get_current_username)
