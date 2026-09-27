from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "Spatial Security Backend"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "*"]

    # SMTP Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "alerts@spatial-security.local"
    ALERT_RECIPIENT: str = "rohitramesh738@gmail.com"
    SMTP_MOCK_MODE: bool = False

    # Gemini AI Settings
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"


    @property
    def effective_smtp_user(self) -> str:
        return self.SMTP_USERNAME or self.SMTP_USER

    @property
    def effective_from_email(self) -> str:
        return self.effective_smtp_user or self.SMTP_FROM_EMAIL

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
