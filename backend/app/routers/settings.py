from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session

from app.db import get_session
from app.deps import CurrentUser, user_id_of
from app.models import User
from app.security import api_token_digest, generate_api_token
from app.settings_store import (
    KEY_DEFAULT_LANG,
    KEY_DIGIT_STYLE,
    KEY_WEBHOOK_TOKEN_DIGEST,
    KEY_WEBHOOK_TOKEN_HASH,
    SECRET_KEYS,
    all_settings,
    delete_setting,
    set_setting,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


class GeneralSettings(BaseModel):
    digit_style: str  # "fa" | "en"
    default_lang: str  # "fa" | "en"


@router.get("", response_model=dict[str, str])
def get_settings_(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, str]:
    values = all_settings(session, user_id_of(user))
    for key in SECRET_KEYS:
        values.pop(key, None)  # never expose the token's hash
    return values


@router.patch("", response_model=GeneralSettings)
def update_settings(
    body: GeneralSettings, session: Session = Depends(get_session), user: User = CurrentUser
) -> GeneralSettings:
    set_setting(session, user_id_of(user), KEY_DIGIT_STYLE, body.digit_style)
    set_setting(session, user_id_of(user), KEY_DEFAULT_LANG, body.default_lang)
    return body


@router.post("/webhook-token/rotate")
def rotate_webhook_token(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, str]:
    """Generates a new webhook API token, shown once. The old token stops working
    immediately. Update your SMS-forwarder app's header with the returned value.
    The token also says whose inbox a message lands in — see /api/ingest/sms."""
    token = generate_api_token()
    set_setting(session, user_id_of(user), KEY_WEBHOOK_TOKEN_DIGEST, api_token_digest(token))
    delete_setting(session, user_id_of(user), KEY_WEBHOOK_TOKEN_HASH)
    return {"token": token}
