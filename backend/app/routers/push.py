from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.firebase import is_enabled
from app.jalali import utc_now
from app.models import PushSubscription
from app.settings_store import (
    KEY_SUMMARY_FREQUENCY,
    KEY_UNCATEGORIZED_THRESHOLD,
    get_setting,
    set_setting,
)

router = APIRouter(prefix="/api", tags=["push"], dependencies=[Depends(get_current_username)])


class SubscribeBody(BaseModel):
    fcm_token: str


@router.get("/push/status")
def push_status() -> dict[str, bool]:
    return {"enabled": is_enabled()}


@router.post("/push/subscribe")
def subscribe(body: SubscribeBody, session: Session = Depends(get_session)) -> dict[str, bool]:
    if not is_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="push not configured"
        )
    existing = session.exec(
        select(PushSubscription).where(PushSubscription.fcm_token == body.fcm_token)
    ).first()
    if existing is not None:
        existing.last_seen_at = utc_now()
        session.add(existing)
    else:
        session.add(PushSubscription(fcm_token=body.fcm_token))
    session.commit()
    return {"ok": True}


@router.delete("/push/subscribe")
def unsubscribe(body: SubscribeBody, session: Session = Depends(get_session)) -> dict[str, bool]:
    existing = session.exec(
        select(PushSubscription).where(PushSubscription.fcm_token == body.fcm_token)
    ).first()
    if existing is not None:
        session.delete(existing)
        session.commit()
    return {"ok": True}


class NotificationSettings(BaseModel):
    uncategorized_threshold: int
    summary_frequency: str  # "off" | "weekly" | "monthly"


@router.get("/settings/notifications", response_model=NotificationSettings)
def get_notification_settings(session: Session = Depends(get_session)) -> NotificationSettings:
    return NotificationSettings(
        uncategorized_threshold=int(get_setting(session, KEY_UNCATEGORIZED_THRESHOLD, "5")),  # type: ignore[arg-type]
        summary_frequency=get_setting(session, KEY_SUMMARY_FREQUENCY, "weekly"),  # type: ignore[arg-type]
    )


@router.patch("/settings/notifications", response_model=NotificationSettings)
def update_notification_settings(
    body: NotificationSettings, session: Session = Depends(get_session)
) -> NotificationSettings:
    set_setting(session, KEY_UNCATEGORIZED_THRESHOLD, str(body.uncategorized_threshold))
    set_setting(session, KEY_SUMMARY_FREQUENCY, body.summary_frequency)
    return body
