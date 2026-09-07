# Wallet — Personal Finance Tracker

Self-hosted personal finance tracker for a single user, built for the Iranian
context: amounts in Toman, Jalali (Shamsi) calendar, RTL Persian UI, and
SMS-based transaction ingestion from Iranian banks.

Design source: [`Design/iranian-finance-tracking-app`](Design/iranian-finance-tracking-app)
(Claude Design export — dark theme, green accent, Vazirmatn/Rooyin fonts).

Status: scaffolding in progress. See project plan for the data model and API
surface.

## Stack

- **Backend**: Python 3.12+, FastAPI, SQLModel, Pydantic v2, Alembic, SQLite (WAL)
- **Frontend**: React + Vite + TypeScript + Tailwind (RTL), Recharts, PWA
- **Dates**: Jalali conversion via `jdatetime`, always computed server-side
- **Runtime**: `docker compose up`, or `uv run` without Docker; images build for amd64 + arm64

## Setup

_Coming soon._

## SMS ingestion

_Coming soon: webhook payload shape and MacroDroid/Tasker setup._

## Adding a new SMS pattern

_Coming soon._
