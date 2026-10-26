"""Multi-user: every row belongs to a user

Revision ID: c4a7e2f91b30
Revises: b3e8d5a1c7f2
Create Date: 2026-10-26 08:00:00.000000

Adds `user_id` to every table holding someone's data, and gives everything
already there to the first user — on an existing install that's the admin
from WALLET_ADMIN_USERNAME, who until now was the only user there was. A
database with data but no user at all keeps its rows ownerless until an admin
is created from the env vars; see app.bootstrap.adopt_orphaned_rows.

Settings move from the global `appsetting` table to per-user `usersetting`,
including the webhook token's hash, so an SMS forwarder already set up keeps
delivering to the same person. A merchant's remembered category becomes
per-user, so its uniqueness is now (user_id, merchant_key).

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4a7e2f91b30"
down_revision: str | None = "b3e8d5a1c7f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OWNED_TABLES = (
    "account",
    "category",
    "merchantcategorymap",
    "keywordrule",
    "smspattern",
    "smsingestattempt",
    "otpsellerhint",
    "transaction",
    "person",
    "split",
    "debt",
    "budget",
    "pushsubscription",
)

FIRST_USER = '(SELECT MIN(id) FROM "user")'


def _foreign_keys(on: bool) -> None:
    """Batch mode rebuilds each table — copy, drop the old one, rename — and
    with foreign keys enforced (app/db.py turns them on for every connection)
    dropping a table other rows point at fails. Off for the rebuild; SQLite
    only honours this outside a transaction, which is where alembic runs
    SQLite migrations."""
    op.execute(f"PRAGMA foreign_keys={'ON' if on else 'OFF'}")


def _check_foreign_keys() -> None:
    broken = op.get_bind().exec_driver_sql("PRAGMA foreign_key_check").fetchall()
    if broken:
        raise RuntimeError(f"foreign key violations after migration: {broken[:10]}")


def upgrade() -> None:
    _foreign_keys(on=False)
    for table in OWNED_TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
            batch_op.create_index(f"ix_{table}_user_id", ["user_id"], unique=False)
            batch_op.create_foreign_key(f"fk_{table}_user_id", "user", ["user_id"], ["id"])
        op.execute(f'UPDATE "{table}" SET user_id = {FIRST_USER}')

    with op.batch_alter_table("merchantcategorymap") as batch_op:
        batch_op.drop_index("ix_merchantcategorymap_merchant_key")
        batch_op.create_index("ix_merchantcategorymap_merchant_key", ["merchant_key"], unique=False)
        batch_op.create_unique_constraint(
            "uq_merchantcategorymap_user_merchant", ["user_id", "merchant_key"]
        )

    op.create_table(
        "usersetting",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("value", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "key", name="uq_usersetting_user_key"),
    )
    op.create_index("ix_usersetting_user_id", "usersetting", ["user_id"], unique=False)
    op.create_index("ix_usersetting_key", "usersetting", ["key"], unique=False)
    op.execute(
        f'INSERT INTO usersetting (user_id, "key", value) '
        f'SELECT {FIRST_USER}, "key", value FROM appsetting'
    )
    op.drop_table("appsetting")
    _check_foreign_keys()
    _foreign_keys(on=True)


def downgrade() -> None:
    _foreign_keys(on=False)
    op.create_table(
        "appsetting",
        sa.Column("key", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("value", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    # Only the first user's settings fit a single-user table.
    op.execute(
        f'INSERT INTO appsetting ("key", value) SELECT "key", value FROM usersetting '
        f"WHERE user_id = {FIRST_USER} OR user_id IS NULL"
    )
    op.drop_index("ix_usersetting_key", table_name="usersetting")
    op.drop_index("ix_usersetting_user_id", table_name="usersetting")
    op.drop_table("usersetting")

    with op.batch_alter_table("merchantcategorymap") as batch_op:
        batch_op.drop_constraint("uq_merchantcategorymap_user_merchant", type_="unique")
        batch_op.drop_index("ix_merchantcategorymap_merchant_key")
        batch_op.create_index("ix_merchantcategorymap_merchant_key", ["merchant_key"], unique=True)

    for table in OWNED_TABLES:
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_constraint(f"fk_{table}_user_id", type_="foreignkey")
            batch_op.drop_index(f"ix_{table}_user_id")
            batch_op.drop_column("user_id")
    _check_foreign_keys()
    _foreign_keys(on=True)
