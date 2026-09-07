from __future__ import annotations

import pytest

from app.split_math import (
    ME,
    LineItem,
    SplitError,
    custom_amounts_split,
    equal_split,
    itemized_split,
    my_actual_share,
    percentage_split,
)


def test_equal_split_divides_evenly():
    shares = equal_split(9000, ["p1", "p2", "p3"])
    assert shares == {"p1": 3000, "p2": 3000, "p3": 3000}
    assert sum(shares.values()) == 9000


def test_equal_split_remainder_goes_to_front_of_order():
    # 10000 / 3 = 3333.33 -> base 3333, remainder 1 cent
    shares = equal_split(10000, ["p1", "p2", "p3"])
    assert shares["p1"] == 3334  # absorbs the remainder, being first in order
    assert shares["p2"] == 3333
    assert shares["p3"] == 3333
    assert sum(shares.values()) == 10000


def test_equal_split_remainder_multiple_cents_front_loaded():
    # 10 cents remainder across 7 participants: front 3 get +1 (10000 % 7 = 5... check)
    total = 10000
    n = 7
    shares = equal_split(total, [f"p{i}" for i in range(n)])
    assert sum(shares.values()) == total
    remainder = total % n
    for i in range(n):
        expected = total // n + (1 if i < remainder else 0)
        assert shares[f"p{i}"] == expected


def test_equal_split_including_me_puts_me_first():
    shares = equal_split(10, [ME, "p1", "p2", "p3"])
    # 10 // 4 = 2, remainder 2 -> ME and p1 absorb the extra cent each
    assert shares[ME] == 3
    assert shares["p1"] == 3
    assert shares["p2"] == 2
    assert shares["p3"] == 2
    assert sum(shares.values()) == 10


def test_equal_split_exclude_myself_omits_me_key():
    # "split equally but exclude myself": caller simply doesn't include ME in the list
    shares = equal_split(9000, ["p1", "p2", "p3"])
    assert ME not in shares
    assert sum(shares.values()) == 9000


def test_equal_split_rejects_empty_participants():
    with pytest.raises(SplitError):
        equal_split(1000, [])


def test_percentage_split_sums_exactly():
    shares = percentage_split(10000, {ME: 50.0, "p1": 30.0, "p2": 20.0})
    assert sum(shares.values()) == 10000
    assert shares[ME] == 5000
    assert shares["p1"] == 3000
    assert shares["p2"] == 2000


def test_percentage_split_with_rounding_still_sums_exactly():
    # 33.33 / 33.33 / 33.34 on 100 -> forces a rounding remainder
    shares = percentage_split(100, {"p1": 33.33, "p2": 33.33, "p3": 33.34})
    assert sum(shares.values()) == 100


def test_percentage_split_rejects_bad_total():
    with pytest.raises(SplitError):
        percentage_split(1000, {"p1": 50.0, "p2": 40.0})


def test_custom_amounts_split_accepts_exact_total():
    shares = custom_amounts_split(10000, {ME: 4000, "p1": 6000})
    assert shares == {ME: 4000, "p1": 6000}


def test_custom_amounts_split_rejects_mismatched_total():
    with pytest.raises(SplitError):
        custom_amounts_split(10000, {ME: 4000, "p1": 5999})


def test_itemized_split_aggregates_per_participant():
    items = [
        LineItem(participant_id=ME, amount_cents=1000, label="pizza"),
        LineItem(participant_id="p1", amount_cents=2000, label="drinks"),
        LineItem(participant_id="p1", amount_cents=500, label="dessert"),
    ]
    shares = itemized_split(3500, items)
    assert shares == {ME: 1000, "p1": 2500}


def test_itemized_split_rejects_mismatched_total():
    items = [LineItem(participant_id=ME, amount_cents=1000)]
    with pytest.raises(SplitError):
        itemized_split(2000, items)


def test_my_actual_share_is_total_minus_others():
    shares = {ME: 3000, "p1": 3000, "p2": 3000}
    assert my_actual_share(9000, shares) == 3000


def test_my_actual_share_when_i_paid_nothing():
    shares = {"p1": 5000, "p2": 5000}
    assert my_actual_share(10000, shares) == 0


def test_reports_count_only_my_share_not_gross():
    """A shared transaction should contribute only my share to spending reports,
    not the gross amount — mirrors app.reporting.spend_amount's gross=False path."""
    from datetime import UTC, datetime

    from app.models import Direction, Transaction
    from app.reporting import spend_amount

    tx = Transaction(
        id=1,
        amount_cents=9000,
        direction=Direction.WITHDRAWAL,
        account_id=1,
        occurred_at=datetime(2026, 1, 1, tzinfo=UTC),
        source="manual",
        is_shared=True,
    )
    my_shares = {1: 3000}  # I only actually paid 3000 of the 9000 total
    assert spend_amount(tx, my_shares, gross=False) == 3000
    assert spend_amount(tx, my_shares, gross=True) == 9000
