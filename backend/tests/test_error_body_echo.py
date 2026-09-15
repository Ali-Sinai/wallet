from __future__ import annotations

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.errors import (
    MAX_ECHOED_BODY_BYTES,
    REDACTED,
    CaptureRequestBodyMiddleware,
    http_exception_handler_with_body,
    validation_exception_handler,
)


class Payload(BaseModel):
    amount: int
    note: str


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.add_middleware(CaptureRequestBodyMiddleware)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler_with_body)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    @app.post("/api/echo")
    def echo(body: Payload) -> dict[str, str]:
        raise HTTPException(status_code=400, detail="nope")

    @app.post("/api/login")
    def login(body: dict) -> dict[str, str]:
        raise HTTPException(status_code=401, detail="invalid credentials")

    @app.get("/api/thing")
    def thing() -> dict[str, str]:
        raise HTTPException(status_code=404, detail="missing")

    return TestClient(app)


def test_validation_error_echoes_the_body(client: TestClient) -> None:
    res = client.post("/api/echo", json={"amount": "abc"})
    assert res.status_code == 422
    payload = res.json()
    assert payload["request_body"] == {"amount": "abc"}
    assert [error["loc"] for error in payload["detail"]] == [
        ["body", "amount"],
        ["body", "note"],
    ]


def test_http_error_echoes_the_body_and_keeps_detail(client: TestClient) -> None:
    res = client.post("/api/echo", json={"amount": 5, "note": "hi"})
    assert res.status_code == 400
    assert res.json() == {"detail": "nope", "request_body": {"amount": 5, "note": "hi"}}


def test_credentials_are_redacted(client: TestClient) -> None:
    res = client.post("/api/login", json={"username": "ali", "password": "hunter2"})
    assert res.json()["request_body"] == {"username": "ali", "password": REDACTED}


def test_nested_credentials_are_redacted(client: TestClient) -> None:
    res = client.post("/api/login", json={"items": [{"fcm_token": "abc", "label": "phone"}]})
    assert res.json()["request_body"] == {"items": [{"fcm_token": REDACTED, "label": "phone"}]}


def test_credentials_are_redacted_in_the_validation_detail_too(client: TestClient) -> None:
    # Pydantic echoes the rejected value back in each error's "input".
    res = client.post("/api/echo", json={"amount": "abc", "note": "x", "password": "hunter2"})
    assert res.status_code == 422
    assert "hunter2" not in res.text


def test_malformed_json_is_echoed_as_text(client: TestClient) -> None:
    res = client.post(
        "/api/echo", content='{"amount": 5,', headers={"Content-Type": "application/json"}
    )
    assert res.status_code == 422
    assert res.json()["request_body"] == '{"amount": 5,'


def test_non_json_body_still_has_secrets_redacted(client: TestClient) -> None:
    res = client.post(
        "/api/login",
        content="username=ali&password=hunter2",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert "hunter2" not in res.text
    assert REDACTED in res.json()["request_body"]


def test_oversized_body_is_truncated(client: TestClient) -> None:
    res = client.post("/api/echo", json={"amount": 1, "note": "x" * (MAX_ECHOED_BODY_BYTES * 2)})
    echoed = res.json()["request_body"]
    assert isinstance(echoed, str)
    assert echoed.endswith("…[truncated]")
    assert len(echoed) < MAX_ECHOED_BODY_BYTES + 100


def test_request_without_a_body_omits_the_field(client: TestClient) -> None:
    res = client.get("/api/thing")
    assert res.status_code == 404
    assert res.json() == {"detail": "missing"}
