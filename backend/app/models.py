from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from sqlmodel import Field, SQLModel

from app.jalali import utc_now


class Direction(StrEnum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"


class AmountUnit(StrEnum):
    RIAL = "rial"
    TOMAN = "toman"


class TxSource(StrEnum):
    SMS = "sms"
    MANUAL = "manual"
    SPLIT_SETTLEMENT = "split_settlement"


class ParseStatus(StrEnum):
    PARSED = "parsed"
    UNPARSED = "unparsed"


class DebtStatus(StrEnum):
    OPEN = "open"
    PARTIAL = "partial"
    SETTLED = "settled"


class DebtDirection(StrEnum):
    OWED_TO_ME = "owed_to_me"
    I_OWE = "i_owe"


class SplitMode(StrEnum):
    I_PAID = "i_paid"
    THEY_PAID = "they_paid"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=utc_now)


class Account(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name_fa: str
    name_en: str
    bank_name: str
    last4: str = Field(index=True)
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)


class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name_fa: str
    name_en: str
    icon: str = "💰"
    color: str = "#0f9b6e"
    parent_id: int | None = Field(default=None, foreign_key="category.id")
    sort_order: int = 0


class MerchantCategoryMap(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    merchant_key: str = Field(index=True, unique=True)
    category_id: int = Field(foreign_key="category.id")
    hit_count: int = 1
    updated_at: datetime = Field(default_factory=utc_now)


class KeywordRule(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    keyword: str = Field(index=True)
    direction: Direction


class SmsPattern(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    sender_match: str
    body_regex: str
    amount_unit: AmountUnit = AmountUnit.RIAL
    enabled: bool = True
    created_at: datetime = Field(default_factory=utc_now)


class SmsIngestAttempt(SQLModel, table=True):
    """Ephemeral, structured-only record of an ingest attempt.

    The raw SMS text is never persisted — only fields extracted from it. Rows
    with parse_status == PARSED are deleted immediately once confirmed into a
    Transaction; UNPARSED rows wait here for manual handling and are purged by
    a background sweep once `expires_at` passes, regardless of resolution.
    Messages whose account isn't on the whitelist are dropped before this
    table is ever touched — there is no "ignored" row for them.
    """

    id: int | None = Field(default=None, primary_key=True)
    sender: str
    matched_pattern_id: int | None = Field(default=None, foreign_key="smspattern.id")
    parse_status: ParseStatus
    amount_cents: int | None = None
    direction: Direction | None = None
    account_last4: str | None = None
    occurred_at: datetime | None = None
    merchant: str | None = None
    received_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime


class Transaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    amount_cents: int
    direction: Direction
    account_id: int = Field(foreign_key="account.id")
    occurred_at: datetime
    category_id: int | None = Field(default=None, foreign_key="category.id")
    note: str | None = None
    source: TxSource
    ingest_attempt_id: int | None = None
    merchant_text: str | None = None
    is_shared: bool = False
    dedup_hash: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=utc_now)


class Person(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    contact_note: str | None = None
    created_at: datetime = Field(default_factory=utc_now)


class Split(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    transaction_id: int = Field(foreign_key="transaction.id", unique=True)
    mode: SplitMode
    created_at: datetime = Field(default_factory=utc_now)


class SplitShare(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    split_id: int = Field(foreign_key="split.id")
    person_id: int | None = Field(default=None, foreign_key="person.id")  # null = me
    amount_cents: int
    line_item: str | None = None


class Debt(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    split_share_id: int = Field(foreign_key="splitshare.id", unique=True)
    person_id: int = Field(foreign_key="person.id")
    direction: DebtDirection = DebtDirection.OWED_TO_ME
    amount_cents: int
    amount_settled_cents: int = 0
    status: DebtStatus = DebtStatus.OPEN


class DebtPayment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    debt_id: int = Field(foreign_key="debt.id")
    amount_cents: int
    settled_at: datetime = Field(default_factory=utc_now)
    linked_transaction_id: int | None = Field(default=None, foreign_key="transaction.id")
    note: str | None = None


class Budget(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    category_id: int = Field(foreign_key="category.id")
    limit_cents: int
    month_jalali: str | None = None  # e.g. "1405-06"; null = recurring every month
    created_at: datetime = Field(default_factory=utc_now)


class PushSubscription(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    fcm_token: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    last_seen_at: datetime = Field(default_factory=utc_now)


class AppSetting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
