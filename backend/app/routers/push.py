from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import CurrentUser, get_current_user, user_id_of
from app.firebase import is_enabled
from app.jalali import utc_now
from app.models import PushSubscription, User
from app.settings_store import (
    KEY_SUMMARY_FREQUENCY,
    KEY_UNCATEGORIZED_THRESHOLD,
    get_setting,
    set_setting,
)

router = APIRouter(prefix="/api", tags=["push"])


class SubscribeBody(BaseModel):
    fcm_token: str


@router.get("/push/status", dependencies=[Depends(get_current_user)])
def push_status() -> dict[str, bool]:
    return {"enabled": is_enabled()}


@router.post("/push/subscribe")
def subscribe(
    body: SubscribeBody, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    if not is_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="push not configured"
        )
    existing = session.exec(
        select(PushSubscription).where(PushSubscription.fcm_token == body.fcm_token)
    ).first()
    if existing is not None:
        # A device belongs to whoever signed in on it last: after a logout and
        # a login as someone else, the previous user's notifications stop.
        existing.user_id = user.id
        existing.last_seen_at = utc_now()
        session.add(existing)
    else:
        session.add(PushSubscription(user_id=user.id, fcm_token=body.fcm_token))
    session.commit()
    return {"ok": True}


@router.delete("/push/subscribe")
def unsubscribe(
    body: SubscribeBody, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    existing = session.exec(
        select(PushSubscription).where(
            PushSubscription.user_id == user.id, PushSubscription.fcm_token == body.fcm_token
        )
    ).first()
    if existing is not None:
        session.delete(existing)
        session.commit()
    return {"ok": True}


class NotificationSettings(BaseModel):
    uncategorized_threshold: int
    summary_frequency: str  # "off" | "weekly" | "monthly"


@router.get("/settings/notifications", response_model=NotificationSettings)
def get_notification_settings(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> NotificationSettings:
    user_id = user_id_of(user)
    threshold = get_setting(session, user_id, KEY_UNCATEGORIZED_THRESHOLD, "5")
    frequency = get_setting(session, user_id, KEY_SUMMARY_FREQUENCY, "weekly")
    return NotificationSettings(
        uncategorized_threshold=int(threshold or "5"),
        summary_frequency=frequency or "weekly",
    )


@router.patch("/settings/notifications", response_model=NotificationSettings)
def update_notification_settings(
    body: NotificationSettings, session: Session = Depends(get_session), user: User = CurrentUser
) -> NotificationSettings:
    user_id = user_id_of(user)
    set_setting(session, user_id, KEY_UNCATEGORIZED_THRESHOLD, str(body.uncategorized_threshold))
    set_setting(session, user_id, KEY_SUMMARY_FREQUENCY, body.summary_frequency)
    return body
