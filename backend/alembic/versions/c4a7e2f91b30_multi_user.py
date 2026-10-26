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
    dropping a table other rows point at fails. Only the downgrade rebuilds
    anything; SQLite honours this only outside a transaction, which is where
    alembic runs SQLite migrations."""
    op.execute(f"PRAGMA foreign_keys={'ON' if on else 'OFF'}")


def _check_foreign_keys() -> None:
    broken = op.get_bind().exec_driver_sql("PRAGMA foreign_key_check").fetchall()
    if broken:
        raise RuntimeError(f"foreign key violations after migration: {broken[:10]}")


def _columns(table: str) -> set[str]:
    return {c["name"] for c in sa.inspect(op.get_bind()).get_columns(table)}


def _indexes(table: str) -> set[str]:
    return {i["name"] for i in sa.inspect(op.get_bind()).get_indexes(table) if i["name"]}


def upgrade() -> None:
    # Plain ALTER TABLE ADD COLUMN and CREATE/DROP INDEX only — no batch
    # rebuild, so no table is ever dropped and foreign keys can stay on. That
    # matters on Turso, where a PRAGMA over the remote connection isn't
    # guaranteed to land outside a transaction. SQLite DDL isn't rolled back
    # here either, so every step skips what's already done: a run that fails
    # halfway can simply be run again.
    for table in OWNED_TABLES:
        if "user_id" not in _columns(table):
            # Raw SQL because alembic would add the REFERENCES as a separate
            # ALTER, which SQLite can't do. Allowed on a live table since the
            # new column is NULL everywhere.
            op.execute(f'ALTER TABLE "{table}" ADD COLUMN user_id INTEGER REFERENCES "user" (id)')
        if f"ix_{table}_user_id" not in _indexes(table):
            op.create_index(f"ix_{table}_user_id", table, ["user_id"], unique=False)
        op.execute(f'UPDATE "{table}" SET user_id = {FIRST_USER} WHERE user_id IS NULL')

    if "uq_merchantcategorymap_user_merchant" not in _indexes("merchantcategorymap"):
        op.drop_index("ix_merchantcategorymap_merchant_key", table_name="merchantcategorymap")
        op.create_index(
            "ix_merchantcategorymap_merchant_key",
            "merchantcategorymap",
            ["merchant_key"],
            unique=False,
        )
        op.create_index(
            "uq_merchantcategorymap_user_merchant",
            "merchantcategorymap",
            ["user_id", "merchant_key"],
            unique=True,
        )

    if not sa.inspect(op.get_bind()).has_table("usersetting"):
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
    if sa.inspect(op.get_bind()).has_table("appsetting"):
        op.execute(
            f'INSERT OR IGNORE INTO usersetting (user_id, "key", value) '
            f'SELECT {FIRST_USER}, "key", value FROM appsetting'
        )
        op.drop_table("appsetting")


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

    op.drop_index("uq_merchantcategorymap_user_merchant", table_name="merchantcategorymap")
    op.drop_index("ix_merchantcategorymap_merchant_key", table_name="merchantcategorymap")
    op.create_index(
        "ix_merchantcategorymap_merchant_key", "merchantcategorymap", ["merchant_key"], unique=True
    )

    for table in OWNED_TABLES:
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        # The rebuild drops the column's unnamed REFERENCES along with it.
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_column("user_id")
    _check_foreign_keys()
    _foreign_keys(on=True)
