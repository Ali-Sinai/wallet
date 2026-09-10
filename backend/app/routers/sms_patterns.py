from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_username
from app.models import AmountUnit, Direction, KeywordRule, SmsPattern
from app.sms_parser import parse_amount

router = APIRouter(
    prefix="/api", tags=["sms-patterns"], dependencies=[Depends(get_current_username)]
)


class SmsPatternIn(BaseModel):
    name: str
    sender_match: str
    body_regex: str
    amount_unit: AmountUnit = AmountUnit.RIAL
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
def list_patterns(session: Session = Depends(get_session)) -> list[SmsPattern]:
    return list(session.exec(select(SmsPattern)).all())


@router.post("/sms-patterns", response_model=SmsPatternOut)
def create_pattern(body: SmsPatternIn, session: Session = Depends(get_session)) -> SmsPattern:
    _validated_regex(body.body_regex)
    pattern = SmsPattern(**body.model_dump())
    session.add(pattern)
    session.commit()
    session.refresh(pattern)
    return pattern


@router.patch("/sms-patterns/{pattern_id}", response_model=SmsPatternOut)
def update_pattern(
    pattern_id: int, body: SmsPatternIn, session: Session = Depends(get_session)
) -> SmsPattern:
    pattern = session.get(SmsPattern, pattern_id)
    if pattern is None:
        raise HTTPException(status_code=404, detail="pattern not found")
    _validated_regex(body.body_regex)
    for key, value in body.model_dump().items():
        setattr(pattern, key, value)
    session.add(pattern)
    session.commit()
    session.refresh(pattern)
    return pattern


@router.delete("/sms-patterns/{pattern_id}")
def delete_pattern(pattern_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    pattern = session.get(SmsPattern, pattern_id)
    if pattern is None:
        raise HTTPException(status_code=404, detail="pattern not found")
    session.delete(pattern)
    session.commit()
    return {"ok": True}


@router.post("/sms-patterns/{pattern_id}/test")
def test_pattern(
    pattern_id: int, body: PatternTestBody, session: Session = Depends(get_session)
) -> dict[str, object]:
    pattern = session.get(SmsPattern, pattern_id)
    if pattern is None:
        raise HTTPException(status_code=404, detail="pattern not found")

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

    return {"matched": True, "groups": groups, "amount_cents": amount_cents}


class KeywordRuleIn(BaseModel):
    keyword: str
    direction: Direction


class KeywordRuleOut(KeywordRuleIn):
    id: int


@router.get("/keyword-rules", response_model=list[KeywordRuleOut])
def list_keyword_rules(session: Session = Depends(get_session)) -> list[KeywordRule]:
    return list(session.exec(select(KeywordRule)).all())


@router.post("/keyword-rules", response_model=KeywordRuleOut)
def create_keyword_rule(
    body: KeywordRuleIn, session: Session = Depends(get_session)
) -> KeywordRule:
    rule = KeywordRule(**body.model_dump())
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.patch("/keyword-rules/{rule_id}", response_model=KeywordRuleOut)
def update_keyword_rule(
    rule_id: int, body: KeywordRuleIn, session: Session = Depends(get_session)
) -> KeywordRule:
    rule = session.get(KeywordRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="rule not found")
    for key, value in body.model_dump().items():
        setattr(rule, key, value)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


@router.delete("/keyword-rules/{rule_id}")
def delete_keyword_rule(rule_id: int, session: Session = Depends(get_session)) -> dict[str, bool]:
    rule = session.get(KeywordRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="rule not found")
    session.delete(rule)
    session.commit()
    return {"ok": True}
