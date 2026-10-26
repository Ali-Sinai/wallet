from __future__ import annotations

from collections.abc import Generator

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session, SQLModel, select

from app.db import get_session
from app.models import User
from app.security import SessionIdentity, read_session_cookie_value


def db_session() -> Generator[Session, None, None]:
    yield from get_session()


DbSession = Depends(db_session)


def _user_for(session: Session, identity: SessionIdentity) -> User | None:
    if identity.user_id is not None:
        user = session.get(User, identity.user_id)
        # The id alone could outlive a deleted-and-recreated account; the
        # username has to agree too.
        return user if user is not None and user.username == identity.username else None
    # Cookies issued before multi-user carry only the username.
    return session.exec(select(User).where(User.username == identity.username)).first()


def get_current_user(
    wallet_session: str | None = Cookie(default=None),
    session: Session = Depends(get_session),
) -> User:
    identity = read_session_cookie_value(wallet_session)
    user = _user_for(session, identity) if identity is not None else None
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="not authenticated")
    return user


CurrentUser = Depends(get_current_user)


def user_id_of(user: User) -> int:
    assert user.id is not None  # loaded from the DB
    return user.id


def get_owned[T: SQLModel](
    session: Session, model: type[T], row_id: int, user: User, what: str
) -> T:
    """The row `row_id` of `model` if it belongs to `user`, else a 404.

    Another user's row answers exactly like a missing one, so ids can't be
    probed to learn what exists.
    """
    row = session.get(model, row_id)
    if row is None or getattr(row, "user_id", None) != user.id:
        raise HTTPException(status_code=404, detail=f"{what} not found")
    return row


def check_owned(
    session: Session, model: type[SQLModel], row_id: int | None, user: User, what: str
) -> None:
    """Same as get_owned for an optional id from a request body; None passes."""
    if row_id is not None:
        get_owned(session, model, row_id, user, what)
