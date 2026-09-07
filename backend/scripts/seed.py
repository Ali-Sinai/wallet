"""Seed the database with realistic fake Persian data for local development.

Run with: uv run python scripts/seed.py
Safe to re-run against an empty DB; it does NOT clear existing data — if you
want a clean slate, delete the sqlite file first (see README).
"""

from __future__ import annotations

import random
import sys
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlmodel import Session, select

from app.bootstrap import ensure_admin_user
from app.db import create_db_and_tables, engine
from app.jalali import utc_now
from app.models import (
    Account,
    Category,
    Debt,
    DebtDirection,
    Direction,
    Person,
    Split,
    SplitMode,
    SplitShare,
    Transaction,
    TxSource,
)
from app.seed_data import ensure_base_data
from app.split_math import ME, equal_split

random.seed(42)

MERCHANTS = [
    ("هایپراستار اکباتان", "خوراک", (800_000, 3_500_000)),
    ("فروشگاه رفاه", "خوراک", (200_000, 900_000)),
    ("اسنپ", "حمل و نقل", (80_000, 350_000)),
    ("تپسی", "حمل و نقل", (90_000, 300_000)),
    ("کافه لمیز", "رستوران", (150_000, 600_000)),
    ("بیسترو ظفر", "رستوران", (400_000, 1_200_000)),
    ("داروخانه دکتر صادقی", "سلامت", (100_000, 900_000)),
    ("سینما آزادی", "تفریح", (200_000, 700_000)),
    ("دیجی‌کالا", "خرید", (500_000, 5_000_000)),
    ("اجاره — صادقیه", "قبوض", (8_000_000, 9_500_000)),
    ("قبض برق", "قبوض", (300_000, 900_000)),
]

INCOME_SOURCES = [
    ("حقوق — شرکت پارسیان", "حقوق", (35_000_000, 45_000_000)),
    ("فاکتور آزاد", "حقوق", (3_000_000, 12_000_000)),
]

PEOPLE = ["رضا محمدی", "نازنین احمدی", "کاوه تهرانی", "سارا پارسا"]


def random_amount_cents(low: int, high: int) -> int:
    toman = random.randint(min(low, high), max(low, high))
    return toman * 100


def main() -> None:
    create_db_and_tables()

    with Session(engine) as session:
        ensure_admin_user(session)
        ensure_base_data(session)

        if session.exec(select(Account)).first() is None:
            session.add_all(
                [
                    Account(name_fa="سامان", name_en="Saman", bank_name="بانک سامان", last4="4417"),
                    Account(name_fa="بلو", name_en="Blu", bank_name="بلوبانک", last4="9902"),
                ]
            )
            session.commit()

        accounts = list(session.exec(select(Account)).all())
        categories = {c.name_fa: c for c in session.exec(select(Category)).all()}

        if session.exec(select(Person)).first() is None:
            session.add_all([Person(name=name) for name in PEOPLE])
            session.commit()
        people = list(session.exec(select(Person)).all())

        if session.exec(select(Transaction)).first() is not None:
            print(
                "Transactions already exist — skipping transaction seed "
                "(accounts/people/categories are idempotent)."
            )
            return

        now = utc_now()
        created: list[Transaction] = []

        for day_offset in range(60, -1, -1):
            day = now - timedelta(days=day_offset)
            for _ in range(random.choice([0, 0, 1, 1, 2])):
                merchant, cat_name, (low, high) = random.choice(MERCHANTS)
                tx = Transaction(
                    amount_cents=random_amount_cents(low, high),
                    direction=Direction.WITHDRAWAL,
                    account_id=random.choice(accounts).id,  # type: ignore[arg-type]
                    occurred_at=day,
                    category_id=categories[cat_name].id if cat_name in categories else None,
                    source=TxSource.MANUAL,
                    merchant_text=merchant,
                )
                session.add(tx)
                created.append(tx)

            if day_offset % 30 == 0:
                merchant, cat_name, (low, high) = random.choice(INCOME_SOURCES)
                tx = Transaction(
                    amount_cents=random_amount_cents(low, high),
                    direction=Direction.DEPOSIT,
                    account_id=accounts[0].id,  # type: ignore[arg-type]
                    occurred_at=day,
                    category_id=categories[cat_name].id if cat_name in categories else None,
                    source=TxSource.MANUAL,
                    merchant_text=merchant,
                )
                session.add(tx)
                created.append(tx)

        session.commit()
        for tx in created:
            session.refresh(tx)

        # A few uncategorized transactions for the review queue.
        for tx in random.sample(created, k=min(5, len(created))):
            tx.category_id = None
            session.add(tx)
        session.commit()

        # One shared transaction with a debt, so the People/Balances screens aren't empty.
        villa = next((t for t in created if t.merchant_text == "دیجی‌کالا"), created[0])
        if session.exec(select(Split).where(Split.transaction_id == villa.id)).first() is None:
            split = Split(transaction_id=villa.id, mode=SplitMode.I_PAID)  # type: ignore[arg-type]
            session.add(split)
            session.flush()
            shares = equal_split(villa.amount_cents, [ME, people[0].id])
            me_share = SplitShare(split_id=split.id, person_id=None, amount_cents=shares[ME])  # type: ignore[arg-type]
            other_share = SplitShare(
                split_id=split.id, person_id=people[0].id, amount_cents=shares[people[0].id]
            )  # type: ignore[arg-type]
            session.add(me_share)
            session.add(other_share)
            session.flush()
            session.add(
                Debt(
                    split_share_id=other_share.id,  # type: ignore[arg-type]
                    person_id=people[0].id,  # type: ignore[arg-type]
                    direction=DebtDirection.OWED_TO_ME,
                    amount_cents=other_share.amount_cents,
                )
            )
            villa.is_shared = True
            session.add(villa)
            session.commit()

        print(
            f"Seeded {len(created)} transactions, {len(accounts)} accounts, {len(people)} people."
        )


if __name__ == "__main__":
    main()
