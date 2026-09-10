"""Rule-based, bank-agnostic SMS parser.

Parsing rules live in the DB (`SmsPattern`, `KeywordRule`) so they're
editable without a code change. This module only implements the mechanics:
matching a pattern's sender + regex, converting the amount to Toman-cents,
deciding deposit/withdrawal from keywords, and checking the account
whitelist. The raw SMS body is used only in-memory here and is never
returned in a form meant to be persisted — callers decide what to keep.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime

import jdatetime

from app.jalali import TEHRAN_OFFSET
from app.models import AmountUnit, Direction, KeywordRule, SmsPattern

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"
ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
_DIGIT_MAP = {d: str(i) for i, d in enumerate(PERSIAN_DIGITS)}
_DIGIT_MAP.update({d: str(i) for i, d in enumerate(ARABIC_INDIC_DIGITS)})

_THOUSANDS_SEP_RE = re.compile(r"[,٬،٬]")
_NON_DIGIT_RE = re.compile(r"[^\d]")


def normalize_digits(text: str) -> str:
    return "".join(_DIGIT_MAP.get(ch, ch) for ch in text)


def parse_amount(raw: str) -> int:
    """Parse a bank-formatted amount string (any digit script, any thousands sep) to an int."""
    cleaned = normalize_digits(raw)
    cleaned = _THOUSANDS_SEP_RE.sub("", cleaned)
    cleaned = _NON_DIGIT_RE.sub("", cleaned)
    if not cleaned:
        raise ValueError(f"no digits found in amount: {raw!r}")
    return int(cleaned)


def last4_from_account_text(raw: str) -> str:
    digits = _NON_DIGIT_RE.sub("", normalize_digits(raw))
    return digits[-4:] if len(digits) >= 4 else digits


@dataclass(frozen=True)
class ParsedFields:
    amount_cents: int | None
    direction: Direction | None
    account_last4: str | None
    occurred_at: datetime | None
    merchant: str | None


@dataclass(frozen=True)
class ParseResult:
    status: str  # "parsed" | "unparsed" | "ignored_account"
    matched_pattern_id: int | None
    fields: ParsedFields
    sender: str


def _direction_from_text(text: str, keyword_rules: list[KeywordRule]) -> Direction | None:
    normalized = text.strip()
    # Prefer the longest keyword match so "انتقال از" beats a bare "انتقال".
    for rule in sorted(keyword_rules, key=lambda r: -len(r.keyword)):
        if rule.keyword and rule.keyword in normalized:
            return rule.direction
    return None


def _parse_datetime_group(raw: str | None, fallback: datetime) -> datetime:
    if not raw:
        return fallback
    text = normalize_digits(raw.strip())
    tehran_fallback = fallback + TEHRAN_OFFSET
    # Date and time are searched independently: banks put them in either order and
    # separate the date with "/", "-" or "." — e.g. "1405/06/05-14:05",
    # "1405/06/05 14:05:11", or Blu's two-line time-then-date "9:50" / "1405.06.01".
    date_m = re.search(r"(?P<y>\d{4})[/.-](?P<mo>\d{1,2})[/.-](?P<d>\d{1,2})", text)
    time_m = re.search(r"(?P<h>\d{1,2}):(?P<mi>\d{1,2})(?::(?P<s>\d{1,2}))?", text)

    if time_m:
        hour, minute = int(time_m["h"]), int(time_m["mi"])
        second = int(time_m["s"]) if time_m["s"] else 0
    else:
        hour, minute, second = (
            tehran_fallback.hour,
            tehran_fallback.minute,
            tehran_fallback.second,
        )

    if date_m:
        try:
            j = jdatetime.datetime(
                int(date_m["y"]), int(date_m["mo"]), int(date_m["d"]), hour, minute, second
            )
            return j.togregorian().replace(tzinfo=fallback.tzinfo) - TEHRAN_OFFSET
        except ValueError:
            return fallback
    if time_m:
        replaced = tehran_fallback.replace(hour=hour, minute=minute, second=second, microsecond=0)
        return replaced - TEHRAN_OFFSET
    return fallback


def generic_extract(body: str, keyword_rules: list[KeywordRule]) -> ParsedFields:
    """Best-effort extraction when no bank-specific pattern matched. Used only to give
    the unparsed inbox enough to act on — never stores the source text itself."""
    amount_cents: int | None = None
    amount_match = re.search(r"[\d۰-۹٠-٩][\d۰-۹٠-٩,،٬.]{2,}", body)
    if amount_match:
        try:
            amount_cents = parse_amount(amount_match.group()) * 10  # assume Rial by default
        except ValueError:
            amount_cents = None

    direction = _direction_from_text(body, keyword_rules)

    last4 = None
    account_match = re.search(r"(?:\*{2,}|•{2,}|·{2,})\s*(\d{4})", body)
    if account_match:
        last4 = account_match.group(1)

    return ParsedFields(
        amount_cents=amount_cents,
        direction=direction,
        account_last4=last4,
        occurred_at=None,
        merchant=None,
    )


def parse_sms(
    *,
    sender: str,
    body: str,
    received_at: datetime,
    patterns: list[SmsPattern],
    keyword_rules: list[KeywordRule],
    whitelisted_last4: set[str],
) -> ParseResult:
    for pattern in patterns:
        if not pattern.enabled:
            continue
        if pattern.sender_match and pattern.sender_match not in sender:
            continue
        try:
            match = re.search(pattern.body_regex, body, re.UNICODE)
        except re.error:
            # A pattern saved before validation existed shouldn't break ingest.
            continue
        if not match:
            continue

        groups = match.groupdict()
        amount_raw = groups.get("amount")
        if not amount_raw:
            continue
        try:
            amount_value = parse_amount(amount_raw)
        except ValueError:
            continue

        amount_cents = (
            amount_value * 10 if pattern.amount_unit == AmountUnit.RIAL else amount_value * 100
        )

        direction = _direction_from_text(groups.get("type") or "", keyword_rules)
        if direction is None:
            direction = _direction_from_text(body, keyword_rules)
        if direction is None:
            continue

        account_raw = groups.get("account")
        last4 = last4_from_account_text(account_raw) if account_raw else None
        occurred_at = _parse_datetime_group(groups.get("datetime"), received_at)
        merchant = groups.get("merchant")
        merchant = merchant.strip() if merchant else None

        if last4 is not None and last4 not in whitelisted_last4:
            return ParseResult(
                status="ignored_account",
                matched_pattern_id=pattern.id,
                fields=ParsedFields(amount_cents, direction, last4, occurred_at, merchant),
                sender=sender,
            )

        return ParseResult(
            status="parsed",
            matched_pattern_id=pattern.id,
            fields=ParsedFields(amount_cents, direction, last4, occurred_at, merchant),
            sender=sender,
        )

    return ParseResult(
        status="unparsed",
        matched_pattern_id=None,
        fields=generic_extract(body, keyword_rules),
        sender=sender,
    )


def dedup_hash(
    *, account_last4: str | None, amount_cents: int, occurred_at: datetime, direction: Direction
) -> str:
    key = f"{account_last4 or ''}|{amount_cents}|{occurred_at.isoformat()}|{direction.value}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()
