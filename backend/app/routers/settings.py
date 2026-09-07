from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session

from app.db import get_session
from app.deps import get_current_username
from app.security import generate_api_token, hash_secret
from app.settings_store import (
    KEY_DEFAULT_LANG,
    KEY_DIGIT_STYLE,
    KEY_WEBHOOK_TOKEN_HASH,
    all_settings,
    set_setting,
)

router = APIRouter(
    prefix="/api/settings", tags=["settings"], dependencies=[Depends(get_current_username)]
)


class GeneralSettings(BaseModel):
    digit_style: str  # "fa" | "en"
    default_lang: str  # "fa" | "en"


@router.get("", response_model=dict[str, str])
def get_settings_(session: Session = Depends(get_session)) -> dict[str, str]:
    values = all_settings(session)
    values.pop(KEY_WEBHOOK_TOKEN_HASH, None)  # never expose the hash
    return values


@router.patch("", response_model=GeneralSettings)
def update_settings(
    body: GeneralSettings, session: Session = Depends(get_session)
) -> GeneralSettings:
    set_setting(session, KEY_DIGIT_STYLE, body.digit_style)
    set_setting(session, KEY_DEFAULT_LANG, body.default_lang)
    return body


@router.post("/webhook-token/rotate")
def rotate_webhook_token(session: Session = Depends(get_session)) -> dict[str, str]:
    """Generates a new webhook API token, shown once. The old token stops working
    immediately. Update your SMS-forwarder app's header with the returned value."""
    token = generate_api_token()
    set_setting(session, KEY_WEBHOOK_TOKEN_HASH, hash_secret(token))
    return {"token": token}
