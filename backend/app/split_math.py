"""Expense-split arithmetic. Pure functions, no DB — kept separate so it's
trivial to unit-test in isolation.

Every share is an int (Toman-cents). Shares always sum exactly to the
transaction total; there is never a lost or invented cent.

Remainder rule (deterministic, and the thing the tests pin down): when a
total doesn't divide evenly, the leftover cents go one-each to the
participants at the *front* of the given participant order, in the order
given. `"me"` (represented by the sentinel key `None`) is always placed
first when present, so if you're one of the equal participants and there's
a remainder, you absorb it before anyone else does.
"""

from __future__ import annotations

from dataclasses import dataclass

ME = None  # sentinel participant id meaning "myself" in share dicts

ParticipantId = int | str | None  # real callers use int person ids; tests use str


class SplitError(ValueError):
    pass


def equal_split(total_cents: int, participant_ids: list[ParticipantId]) -> dict[ParticipantId, int]:
    """Equal split across participant_ids, in the order given. See module docstring
    for the remainder rule. Pass a list without ME to get the "exclude myself" split."""
    if not participant_ids:
        raise SplitError("need at least one participant")
    n = len(participant_ids)
    base = total_cents // n
    remainder = total_cents % n
    return {pid: base + (1 if i < remainder else 0) for i, pid in enumerate(participant_ids)}


def percentage_split(
    total_cents: int, percentages: dict[ParticipantId, float]
) -> dict[ParticipantId, int]:
    """Percentages must sum to 100 (+/- 0.001 tolerance for float input). Leftover
    cents from flooring go to the front of `percentages`' iteration order."""
    total_pct = sum(percentages.values())
    if abs(total_pct - 100.0) > 0.001:
        raise SplitError(f"percentages must sum to 100, got {total_pct}")

    # Integer-exact: scale each percentage to millipercent (x1000) before dividing,
    # so no float ever touches the money value itself — only the input percentage.
    raw = {pid: (total_cents * round(pct * 1000)) // 100_000 for pid, pct in percentages.items()}
    allocated = sum(raw.values())
    remainder = total_cents - allocated
    ordered_ids = list(percentages.keys())
    for i in range(remainder):
        raw[ordered_ids[i % len(ordered_ids)]] += 1
    return raw


def custom_amounts_split(
    total_cents: int, amounts: dict[ParticipantId, int]
) -> dict[ParticipantId, int]:
    """Amounts are taken as-is; the caller (API layer / UI) is responsible for the
    live "remaining must reach zero" check before submitting. This just enforces it."""
    total_given = sum(amounts.values())
    if total_given != total_cents:
        raise SplitError(f"shares sum to {total_given}, expected {total_cents}")
    return dict(amounts)


@dataclass(frozen=True)
class LineItem:
    participant_id: ParticipantId
    amount_cents: int
    label: str | None = None


def itemized_split(total_cents: int, items: list[LineItem]) -> dict[ParticipantId, int]:
    total_given = sum(item.amount_cents for item in items)
    if total_given != total_cents:
        raise SplitError(f"line items sum to {total_given}, expected {total_cents}")
    shares: dict[ParticipantId, int] = {}
    for item in items:
        shares[item.participant_id] = shares.get(item.participant_id, 0) + item.amount_cents
    return shares


def my_actual_share(total_cents: int, shares: dict[ParticipantId, int]) -> int:
    """My real cost for a shared transaction: total minus everyone else's shares."""
    others_total = sum(amount for pid, amount in shares.items() if pid != ME)
    return total_cents - others_total
