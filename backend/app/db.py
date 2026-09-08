from collections.abc import Generator

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

from app.config import get_settings

settings = get_settings()
connect_args: dict[str, object] = {} if settings.uses_turso else {"check_same_thread": False}
engine = create_engine(settings.database_url, connect_args=connect_args)


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection: object, connection_record: object) -> None:
    # WAL mode is a local-file concept; Turso/libSQL manages its own
    # durability remotely and doesn't support PRAGMA journal_mode over the
    # wire the same way, so skip it there. Foreign keys still apply either way.
    cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
    if not settings.uses_turso:
        cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
