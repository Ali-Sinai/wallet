from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass

import bcrypt
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import get_settings

_settings = get_settings()
_serializer = URLSafeTimedSerializer(_settings.session_secret, salt="wallet-session")

# bcrypt truncates at 72 bytes silently; reject anything longer up front rather
# than let two different long passwords hash identically.
_MAX_SECRET_BYTES = 72


def hash_secret(raw: str) -> str:
    if len(raw.encode("utf-8")) > _MAX_SECRET_BYTES:
        raise ValueError(f"secret must be at most {_MAX_SECRET_BYTES} bytes")
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_secret(raw: str, hashed: str) -> bool:
    if len(raw.encode("utf-8")) > _MAX_SECRET_BYTES:
        return False
    try:
        return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("ascii"))
    except ValueError:
        return False


@dataclass(frozen=True)
class SessionIdentity:
    username: str
    user_id: int | None  # absent from cookies issued before multi-user


def create_session_cookie_value(username: str, user_id: int) -> str:
    return _serializer.dumps({"u": username, "id": user_id})


def read_session_cookie_value(cookie_value: str | None) -> SessionIdentity | None:
    if not cookie_value:
        return None
    try:
        data = _serializer.loads(cookie_value, max_age=_settings.session_max_age_seconds)
    except (BadSignature, SignatureExpired):
        return None
    username = data.get("u")
    if not isinstance(username, str):
        return None
    user_id = data.get("id")
    return SessionIdentity(username, user_id if isinstance(user_id, int) else None)


def generate_api_token() -> str:
    return secrets.token_urlsafe(32)


def api_token_digest(token: str) -> str:
    """Lookup key for a webhook token.

    The webhook names no user, so the token itself has to find its owner — a
    salted bcrypt hash can't be searched for. A plain SHA-256 is enough here:
    the token is 32 random bytes, so there's nothing to brute-force.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
