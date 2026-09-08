"""Vercel Python entry point. Re-exports the FastAPI app from backend/app/main.py
so Vercel's zero-config Python runtime can serve it as a serverless function —
see vercel.json's rewrite of /api/* to this file.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
