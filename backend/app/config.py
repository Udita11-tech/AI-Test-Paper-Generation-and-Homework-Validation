"""
Centralized application configuration.
Reads from environment variables / .env file so nothing is hardcoded.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Gemini
    gemini_api_key: str = ""
    gemini_chat_model: str = "gemini-2.5-flash"

    # Embeddings
    embedding_provider: str = "local"  # "local" | "gemini"
    local_embedding_model: str = "all-MiniLM-L6-v2"
    gemini_embedding_model: str = "models/text-embedding-004"

    # Storage
    chroma_persist_dir: str = "./data/chroma_db"
    upload_dir: str = "./data/uploads"

    # Chunking / retrieval
    chunk_size: int = 1000
    chunk_overlap: int = 150
    top_k: int = 5

    # OCR
    tesseract_cmd: str = ""
    ocr_min_chars_per_page: int = 20

    # CORS
    frontend_origins: str = "http://localhost:3000,http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


settings = Settings()

# Ensure required directories exist at import time
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
