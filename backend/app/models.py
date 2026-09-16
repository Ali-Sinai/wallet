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


class PatternKind(StrEnum):
    """What a pattern's match means.

    TRANSACTION — the money moved; a match becomes a pending ingest attempt.
    OTP — the one-time password a bank sends *before* an online purchase. It
    names the store but moves no money, so a match records a seller hint the
    following withdrawal picks up (see `OtpSellerHint`), never a transaction.
    """

    TRANSACTION = "transaction"
    OTP = "otp"


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
    # OTP patterns are tried before transaction ones: a "رمز پویا" message
    # often also matches a loose transaction regex ("خرید … ریال"), and it must
    # not be read as money leaving the account.
    kind: PatternKind = PatternKind.TRANSACTION
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

    The one exception to "never the raw text" is `raw_body`, kept only for
    UNPARSED rows: with no pattern matched there is nothing else to show, and
    deciding what rule to write means reading the message. It lives and dies
    with the row — gone the moment the message is resolved or ignored, and
    swept with everything else once `expires_at` passes. A row that parsed
    carries no body, so nothing that becomes a Transaction ever stored one.
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
    raw_body: str | None = None  # UNPARSED rows only — see the docstring
    received_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime


class OtpSellerHint(SQLModel, table=True):
    """The store named by an OTP message, waiting for the withdrawal it belongs to.

    Banks send the one-time password for an online purchase just before the
    withdrawal SMS, and that first message is the only one naming the seller.
    A match on an OTP pattern parks the name here; the next withdrawal claims
    it as its merchant and deletes the row. Unclaimed rows expire on their own
    (`expires_at`, minutes) and are swept alongside ingest attempts — a
    purchase abandoned at the payment page leaves nothing behind.

    No card or account is recorded: the OTP and the withdrawal it precedes
    rarely name one, and a single-card setup has nothing to disambiguate
    anyway. The window is what keeps a hint attached to the right purchase.
    """

    id: int | None = Field(default=None, primary_key=True)
    sender: str
    matched_pattern_id: int | None = Field(default=None, foreign_key="smspattern.id")
    seller: str
    amount_cents: int | None = None
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
