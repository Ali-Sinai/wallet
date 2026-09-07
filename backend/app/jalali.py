"""Jalali (Shamsi) calendar helpers. All conversion happens here, server-side.

Timestamps are stored as UTC everywhere; this module is the only place that
converts to Tehran local time and to the Jalali calendar for grouping/display.
Weeks start on Saturday.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jdatetime

TEHRAN_OFFSET = timedelta(hours=3, minutes=30)

WEEKDAY_LABELS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]
MONTH_LABELS_FA = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
]


def utc_now() -> datetime:
    return datetime.now(UTC)


def to_tehran(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC) + TEHRAN_OFFSET


def to_jalali(dt: datetime) -> jdatetime.date:
    tehran = to_tehran(dt)
    return jdatetime.date.fromgregorian(date=tehran.date())


def jalali_ymd(dt: datetime) -> tuple[int, int, int]:
    j = to_jalali(dt)
    return j.year, j.month, j.day


def jalali_month_key(dt: datetime) -> str:
    """e.g. '1405-06' — used for budget periods and month-over-month grouping."""
    y, m, _ = jalali_ymd(dt)
    return f"{y:04d}-{m:02d}"


def jalali_weekday_index(dt: datetime) -> int:
    """0 = Saturday .. 6 = Friday."""
    tehran = to_tehran(dt)
    python_weekday = tehran.weekday()  # Monday = 0 .. Sunday = 6
    return (python_weekday + 2) % 7


def week_range_utc(reference: datetime) -> tuple[datetime, datetime]:
    """Start (Saturday 00:00 Tehran) and end (next Saturday 00:00) in UTC, for 'this week'."""
    tehran = to_tehran(reference)
    day_index = jalali_weekday_index(reference)
    start_tehran = (tehran - timedelta(days=day_index)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    end_tehran = start_tehran + timedelta(days=7)
    return start_tehran - TEHRAN_OFFSET, end_tehran - TEHRAN_OFFSET


def month_range_utc(reference: datetime) -> tuple[datetime, datetime]:
    """Start/end of the Jalali month containing `reference`, in UTC."""
    tehran = to_tehran(reference)
    j = jdatetime.date.fromgregorian(date=tehran.date())
    start_j = jdatetime.date(j.year, j.month, 1)
    if j.month == 12:
        end_j = jdatetime.date(j.year + 1, 1, 1)
    else:
        end_j = jdatetime.date(j.year, j.month + 1, 1)
    start_tehran = datetime.combine(start_j.togregorian(), datetime.min.time())
    end_tehran = datetime.combine(end_j.togregorian(), datetime.min.time())
    return start_tehran - TEHRAN_OFFSET, end_tehran - TEHRAN_OFFSET


def day_range_utc(reference: datetime) -> tuple[datetime, datetime]:
    tehran = to_tehran(reference)
    start_tehran = tehran.replace(hour=0, minute=0, second=0, microsecond=0)
    return start_tehran - TEHRAN_OFFSET, start_tehran + timedelta(days=1) - TEHRAN_OFFSET


def format_jalali(dt: datetime, persian_digits: bool = True) -> str:
    y, m, d = jalali_ymd(dt)
    text = f"{y:04d}-{m:02d}-{d:02d}"
    if not persian_digits:
        return text
    from app.money import to_persian_digits

    return to_persian_digits(text)


def format_jalali_full(dt: datetime, persian_digits: bool = True) -> str:
    """e.g. '16 شهریور 1405' — for display in transaction lists/details."""
    y, m, d = jalali_ymd(dt)
    text = f"{d} {MONTH_LABELS_FA[m - 1]} {y}"
    if not persian_digits:
        return text
    from app.money import to_persian_digits

    return to_persian_digits(text)


def format_jalali_day_month(dt: datetime, persian_digits: bool = True) -> str:
    y, m, d = jalali_ymd(dt)
    text = f"{d} {MONTH_LABELS_FA[m - 1]}"
    if not persian_digits:
        return text
    from app.money import to_persian_digits

    return to_persian_digits(text)
