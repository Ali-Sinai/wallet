from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="WALLET_", extra="ignore")

    db_path: str = "data/wallet.db"
    session_secret: str = "dev-secret-change-me"
    session_cookie_name: str = "wallet_session"
    session_max_age_seconds: int = 60 * 60 * 24 * 30

    firebase_service_account_path: str | None = None

    admin_username: str | None = None
    admin_password: str | None = None

    static_dir: str = "static"

    ingest_attempt_retention_days: int = 14

    @property
    def sqlite_url(self) -> str:
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{self.db_path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
