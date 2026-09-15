"""Error responses that echo the request body back to the sender.

A bare `{"detail": "..."}` (and especially a 422's list of field errors) says
what the server disliked but not what it actually received, which makes a bad
request from a phone or an offline-queue replay hard to reconstruct after the
fact. Every error response for an /api path therefore carries a `request_body`
field alongside `detail`, holding the payload the sender sent — parsed when it
was valid JSON, raw text when it wasn't, with credential-ish values redacted.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Enough for any payload this API takes (an SMS batch is the largest); a body
# past it is echoed truncated rather than buffered in full.
MAX_ECHOED_BODY_BYTES = 16 * 1024

REDACTED = "[redacted]"

# Substring match, so "password", "new_password", "refresh_token" and
# "X-Api-Secret" all hit.
_SENSITIVE_KEY_PARTS = ("password", "secret", "token", "authorization", "cookie", "credential")

# Same idea for bodies that aren't JSON (form posts, truncated JSON): blank out
# whatever follows a sensitive key in `key=value`, `key: value` or `"key":
# "value"` shape, up to the next separator.
_SENSITIVE_TEXT_RE = re.compile(
    r'("?[\w.-]*(?:' + "|".join(_SENSITIVE_KEY_PARTS) + r')[\w.-]*"?\s*[:=]\s*)'
    r'("[^"]*"|[^&,}\s]*)',
    re.IGNORECASE,
)

_SCOPE_KEY = "app.captured_request_body"


@dataclass
class _CapturedBody:
    """A capped tee of the request body, filled as the app reads it."""

    data: bytearray = field(default_factory=bytearray)
    truncated: bool = False

    def add(self, chunk: bytes) -> None:
        if not chunk:
            return
        room = MAX_ECHOED_BODY_BYTES - len(self.data)
        if room <= 0:
            self.truncated = True
            return
        self.data += chunk[:room]
        if len(chunk) > room:
            self.truncated = True


class CaptureRequestBodyMiddleware:
    """Remember the request body so exception handlers can echo it back.

    By the time a handler runs the body has already been consumed by the route,
    and re-reading it there yields nothing (or blocks on a client that has
    nothing left to send). So rather than buffering the body up front — which
    would change how requests stream through — this wraps `receive` and copies
    each chunk as the app pulls it, up to MAX_ECHOED_BODY_BYTES.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        captured = _CapturedBody()
        scope[_SCOPE_KEY] = captured

        async def receive_and_capture() -> Message:
            message = await receive()
            if message["type"] == "http.request":
                captured.add(message.get("body", b""))
            return message

        await self.app(scope, receive_and_capture, send)


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: REDACTED
            if isinstance(key, str) and any(p in key.lower() for p in _SENSITIVE_KEY_PARTS)
            else _redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact(item) for item in value]
    if isinstance(value, str):
        return _redact_text(value)
    return value


def _redact_text(text: str) -> str:
    return _SENSITIVE_TEXT_RE.sub(lambda m: m.group(1) + f'"{REDACTED}"', text)


def describe_request_body(request: Request) -> Any | None:
    """The body the sender sent, redacted — or None if there wasn't one.

    A route that never read its body (a GET, or a 404 on an unmatched path)
    leaves nothing captured, and the error response simply omits the field.
    """
    captured = request.scope.get(_SCOPE_KEY)
    if not isinstance(captured, _CapturedBody) or not captured.data:
        return None

    text = bytes(captured.data).decode("utf-8", errors="replace")
    if not captured.truncated:
        try:
            return _redact(json.loads(text))
        except ValueError:
            pass  # not JSON (or not valid JSON) — fall through to raw text
    redacted = _redact_text(text)
    return (redacted + "…[truncated]") if captured.truncated else redacted


def _with_request_body(request: Request, payload: dict[str, Any]) -> dict[str, Any]:
    body = describe_request_body(request)
    if body is not None:
        payload["request_body"] = body
    return payload


def echoes_body(request: Request) -> bool:
    """Only API responses carry the echo; static/SPA 404s stay as they are."""
    return request.url.path.startswith("/api")


async def http_exception_handler_with_body(
    request: Request, exc: StarletteHTTPException
) -> Response:
    # 204/304 carry no body at all, so there's nothing to add to.
    if not echoes_body(request) or exc.status_code in (204, 304):
        return await http_exception_handler(request, exc)  # type: ignore[return-value]
    return JSONResponse(
        _with_request_body(request, {"detail": exc.detail}),
        status_code=exc.status_code,
        headers=getattr(exc, "headers", None),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> Response:
    # Pydantic repeats the offending value in each error's "input", so the
    # detail gets the same redaction the echoed body does.
    detail = _redact(jsonable_encoder(exc.errors()))
    return JSONResponse(_with_request_body(request, {"detail": detail}), status_code=422)
