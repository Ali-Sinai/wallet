from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import main

# No `with` block: TestClient only runs the lifespan as a context manager, and
# startup here would migrate and seed a real database. These tests are about the
# route contract, so they exercise the endpoint alone.
client = TestClient(main.app)


@pytest.fixture
def migration_calls(monkeypatch: pytest.MonkeyPatch) -> list[None]:
    calls: list[None] = []
    monkeypatch.setattr(main, "_run_migrations", lambda: calls.append(None))
    return calls


@pytest.mark.parametrize("method", ["get", "post"])
def test_runs_migrations_with_no_auth_and_no_input(
    method: str, migration_calls: list[None]
) -> None:
    response = getattr(client, method)("/api/internal/migrate")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert len(migration_calls) == 1


def test_ignores_env_tokens_entirely(
    migration_calls: list[None], monkeypatch: pytest.MonkeyPatch
) -> None:
    """The endpoint used to gate on these. Nothing reads them now, so setting
    them must not start demanding a bearer token again."""
    monkeypatch.setenv("MIGRATE_TOKEN", "irrelevant")
    monkeypatch.setenv("CRON_SECRET", "irrelevant")
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "irrelevant")

    assert client.post("/api/internal/migrate").status_code == 200
    assert len(migration_calls) == 1


def test_rejects_a_caller_supplied_body(migration_calls: list[None]) -> None:
    """Taking no input is the point — a query string or body must not become a
    way to steer which revision gets applied."""
    response = client.post("/api/internal/migrate?revision=base", json={"revision": "base"})

    assert response.status_code == 200
    assert len(migration_calls) == 1
