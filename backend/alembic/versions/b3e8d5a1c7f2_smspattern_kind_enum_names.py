"""Store smspattern.kind as enum names, like every other enum column

Revision ID: b3e8d5a1c7f2
Revises: 7c1f2a9d4e10
Create Date: 2026-10-22 08:00:00.000000

7c1f2a9d4e10 added `kind` with server_default "transaction" — the enum's
*value*. SQLModel maps the column to `sa.Enum(PatternKind)`, which stores and
reads enum *names* ("TRANSACTION", "OTP"), so every pre-existing pattern came
back as a LookupError on read and any route touching SmsPattern returned 500.

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3e8d5a1c7f2"
down_revision: str | None = "7c1f2a9d4e10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE smspattern SET kind = 'TRANSACTION' WHERE kind = 'transaction'")
    op.execute("UPDATE smspattern SET kind = 'OTP' WHERE kind = 'otp'")
    with op.batch_alter_table("smspattern") as batch_op:
        batch_op.alter_column(
            "kind",
            existing_type=sqlmodel.sql.sqltypes.AutoString(),
            existing_nullable=False,
            server_default=sa.text("'TRANSACTION'"),
        )


def downgrade() -> None:
    with op.batch_alter_table("smspattern") as batch_op:
        batch_op.alter_column(
            "kind",
            existing_type=sqlmodel.sql.sqltypes.AutoString(),
            existing_nullable=False,
            server_default="transaction",
        )
