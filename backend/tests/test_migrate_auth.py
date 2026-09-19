from __future__ import annotations

import pytest

from app.config import get_settings
from app.main import migrate_authorized


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """get_settings is lru_cache'd, so a test touching TURSO_AUTH_TOKEN has to
    clear it both before and after, or it leaks a cached Settings either way."""
    for name in ("MIGRATE_TOKEN", "TURSO_AUTH_TOKEN", "CRON_SECRET"):
        monkeypatch.delenv(name, raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_open_when_nothing_configured() -> None:
    assert migrate_authorized(None) is True


@pytest.mark.parametrize("env_var", ["MIGRATE_TOKEN", "TURSO_AUTH_TOKEN", "CRON_SECRET"])
def test_each_configured_token_is_accepted(env_var: str, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(env_var, "s3cret")
    get_settings.cache_clear()

    assert migrate_authorized("Bearer s3cret") is True
    assert migrate_authorized("Bearer wrong") is False
    assert migrate_authorized("s3cret") is False
    assert migrate_authorized(None) is False


def test_any_of_several_tokens_is_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MIGRATE_TOKEN", "from-migrate")
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "from-turso")
    monkeypatch.setenv("CRON_SECRET", "from-cron")
    get_settings.cache_clear()

    assert migrate_authorized("Bearer from-migrate") is True
    assert migrate_authorized("Bearer from-turso") is True
    assert migrate_authorized("Bearer from-cron") is True
    assert migrate_authorized("Bearer nope") is False
