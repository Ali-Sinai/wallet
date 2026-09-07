"""Money handling.

Every amount in this app is stored as an integer number of "Toman cents"
(``toman * 100``) — a plain Python ``int``, never a ``float`` or ``Decimal``.
That gives us exact integer arithmetic everywhere (splits, sums, dedup) while
still letting the UI show up to two digits after the decimal point for the
rare Rial amount that isn't evenly divisible by ten.

Conversion never needs division at all: a Rial amount is always a whole
number, and ``toman = rial / 10`` means ``toman_cents = toman * 100 == rial * 10``
exactly, for every integer input. So Rial -> Toman-cents is a multiplication,
not a division, and it can never lose precision or need a divisibility check.

Never use ``/`` on a money value anywhere in this codebase — only ``//`` (for
splitting cents into whole-Toman + fractional-Toman for display) or plain
integer multiplication.
"""

from __future__ import annotations

PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"


def rial_to_toman_cents(rial: int) -> int:
    """Exact, no division: toman_cents = toman * 100 = (rial / 10) * 100 = rial * 10."""
    if not isinstance(rial, int):
        raise MoneyTypeError(f"Rial amount must be an int, got {type(rial).__name__}")
    return rial * 10


def toman_to_toman_cents(toman: int) -> int:
    if not isinstance(toman, int):
        raise MoneyTypeError(f"Toman amount must be an int, got {type(toman).__name__}")
    return toman * 100


class MoneyTypeError(TypeError):
    """Raised when a money value reaches the money layer as anything but int."""


def assert_int_money(value: object, field_name: str = "amount") -> int:
    """Reject any non-int amount before it reaches the DB. Use as a Pydantic validator."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise MoneyTypeError(f"{field_name} must be an integer number of Toman-cents")
    return value


def assert_positive_money(value: object, field_name: str = "amount") -> int:
    """Amounts are always stored as a positive magnitude — direction carries the
    sign. A negative or zero amount here means a bug upstream (parser, seed data,
    a stray '-' in a UI form), not a legitimate value."""
    value = assert_int_money(value, field_name)
    if value <= 0:
        raise MoneyTypeError(f"{field_name} must be a positive number of Toman-cents, got {value}")
    return value


def split_cents(cents: int) -> tuple[int, int]:
    """Whole Toman and remaining fractional Toman-cents (0-99), via // and % only."""
    whole = cents // 100
    frac = cents % 100
    return whole, frac


def format_toman(cents: int, persian_digits: bool = False, thousands: bool = True) -> str:
    """Format Toman-cents for display: thousand separators, optional Persian digits."""
    sign = "-" if cents < 0 else ""
    whole, frac = split_cents(abs(cents))

    whole_str = str(whole)
    if thousands:
        whole_str = _group_thousands(whole_str, persian_digits)
    elif persian_digits:
        whole_str = _to_persian_digits(whole_str)

    text = sign + whole_str
    if frac:
        frac_str = f"{frac:02d}"
        if persian_digits:
            frac_str = _to_persian_digits(frac_str)
        sep = "٫" if persian_digits else "."
        text += f"{sep}{frac_str}"
    return text


def _group_thousands(digits: str, persian_digits: bool) -> str:
    groups: list[str] = []
    while len(digits) > 3:
        groups.insert(0, digits[-3:])
        digits = digits[:-3]
    groups.insert(0, digits)
    sep = "٬" if persian_digits else ","
    joined = sep.join(groups)
    return _to_persian_digits(joined) if persian_digits else joined


def to_persian_digits(s: str) -> str:
    return "".join(PERSIAN_DIGITS[int(ch)] if ch.isdigit() else ch for ch in s)


_to_persian_digits = to_persian_digits
