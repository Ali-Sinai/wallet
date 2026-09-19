"""OTP seller hints, pattern kind, and the body kept on unparsed attempts

Revision ID: 7c1f2a9d4e10
Revises: 41cc47319b05
Create Date: 2026-09-16 13:40:00.000000

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c1f2a9d4e10"
down_revision: str | None = "41cc47319b05"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "otpsellerhint",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sender", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("matched_pattern_id", sa.Integer(), nullable=True),
        sa.Column("seller", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=True),
        sa.Column("received_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["matched_pattern_id"], ["smspattern.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    # Existing patterns all read money movements; the OTP ones are seeded at
    # startup (see seed_data.ensure_otp_patterns), not here.
    op.add_column(
        "smspattern",
        sa.Column(
            "kind",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="transaction",
        ),
    )
    op.add_column(
        "smsingestattempt",
        sa.Column("raw_body", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("smsingestattempt", "raw_body")
    op.drop_column("smspattern", "kind")
    op.drop_table("otpsellerhint")
