from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import CurrentUser, get_owned
from app.models import AmountUnit, Direction, KeywordRule, PatternKind, SmsPattern, User
from app.sms_parser import parse_amount

router = APIRouter(prefix="/api", tags=["sms-patterns"])


class SmsPatternIn(BaseModel):
    name: str
    sender_match: str
    body_regex: str
    amount_unit: AmountUnit = AmountUnit.RIAL
    # "otp" patterns read the one-time-password message a bank sends before an
    # online purchase, for the seller name it carries — see PatternKind.
    kind: PatternKind = PatternKind.TRANSACTION
    enabled: bool = True


class SmsPatternOut(SmsPatternIn):
    id: int


class PatternTestBody(BaseModel):
    sample_text: str


def _validated_regex(body_regex: str) -> str:
    """Reject an un-compilable regex with a 400 instead of letting `re` raise a 500.

    Python's `re` wants `(?P<name>...)` for named groups; JS/PCRE's `(?<name>...)`
    is the most common way to get here, so call that out by name.
    """
    try:
        re.compile(body_regex, re.UNICODE)
    except re.error as exc:
        hint = ""
        if re.search(r"\(\?<[A-Za-z_]", body_regex):
            hint = " Python named groups are written (?P<name>...), not (?<name>...)."
        raise HTTPException(status_code=400, detail=f"invalid regex: {exc}.{hint}") from exc
    return body_regex


@router.get("/sms-patterns", response_model=list[SmsPatternOut])
def list_patterns(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[SmsPattern]:
    return list(session.exec(select(SmsPattern).where(SmsPattern.user_id == user.id)).all())


@router.post("/sms-patterns", response_model=SmsPatternOut)
def create_pattern(
    body: SmsPatternIn, session: Session = Depends(get_session), user: User = CurrentUser
) -> SmsPattern:
    _validated_regex(body.body_regex)
    pattern = SmsPattern(user_id=user.id, **body.model_dump())
    session.add(pattern)
    session.commit()
    session.refresh(pattern)
    return pattern


@router.patch("/sms-patterns/{pattern_id}", response_model=SmsPatternOut)
def update_pattern(
    pattern_id: int,
    body: SmsPatternIn,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> SmsPattern:
    pattern = get_owned(session, SmsPattern, pattern_id, user, "pattern")
    _validated_regex(body.body_regex)
    for key, value in body.model_dump().items():
        setattr(pattern, key, value)
    session.add(pattern)
    session.commit()
    session.refresh(pattern)
    return pattern


@router.delete("/sms-patterns/{pattern_id}")
def delete_pattern(
    pattern_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    pattern = get_owned(session, SmsPattern, pattern_id, user, "pattern")
    session.delete(pattern)
    session.commit()
    return {"ok": True}


@router.post("/sms-patterns/{pattern_id}/test")
def test_pattern(
    pattern_id: int,
    body: PatternTestBody,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> dict[str, object]:
    pattern = get_owned(session, SmsPattern, pattern_id, user, "pattern")

    match = re.search(_validated_regex(pattern.body_regex), body.sample_text, re.UNICODE)
    if not match:
        return {"matched": False}

    groups = match.groupdict()
    amount_cents = None
    if groups.get("amount"):
        try:
            value = parse_amount(groups["amount"])
            amount_cents = value * 10 if pattern.amount_unit == AmountUnit.RIAL else value * 100
        except ValueError:
            amount_cents = None

    result: dict[str, object] = {
        "matched": True,
        "kind": pattern.kind,
        "groups": groups,
        "amount_cents": amount_cents,
    }
    if pattern.kind == PatternKind.OTP and not (groups.get("merchant") or groups.get("seller")):
        # It matched, but an OTP pattern with no seller group is ingested as if
        # it hadn't — say so here rather than at 2am when a purchase goes
        # through unlabelled.
        result["warning"] = "OTP pattern matched but captured no (?P<merchant>...) seller group"
    return result


class KeywordRuleIn(BaseModel):
    keyword: str
    direction: Direction


class KeywordRuleOut(KeywordRuleIn):
    id: int


@router.get("/keyword-rules", response_model=list[KeywordRuleOut])
def list_keyword_rules(
    session: Session = Depends(get_session), user: User = CurrentUser
) -> list[KeywordRule]:
    return list(session.exec(select(KeywordRule).where(KeywordRule.user_id == user.id)).all())


@router.post("/keyword-rules", response_model=KeywordRuleOut)
def create_keyword_rule(
    body: KeywordRuleIn, session: Session = Depends(get_session), user: User = CurrentUser
) -> KeywordRule:
    rule = KeywordRule(user_id=user.id, **body.model_dump())
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.patch("/keyword-rules/{rule_id}", response_model=KeywordRuleOut)
def update_keyword_rule(
    rule_id: int,
    body: KeywordRuleIn,
    session: Session = Depends(get_session),
    user: User = CurrentUser,
) -> KeywordRule:
    rule = get_owned(session, KeywordRule, rule_id, user, "rule")
    for key, value in body.model_dump().items():
        setattr(rule, key, value)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.delete("/keyword-rules/{rule_id}")
def delete_keyword_rule(
    rule_id: int, session: Session = Depends(get_session), user: User = CurrentUser
) -> dict[str, bool]:
    rule = get_owned(session, KeywordRule, rule_id, user, "rule")
    session.delete(rule)
    session.commit()
    return {"ok": True}
