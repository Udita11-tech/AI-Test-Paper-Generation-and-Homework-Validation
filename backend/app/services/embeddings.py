"""
Step 4 of the pipeline: Embeddings.

Provides a single `EmbeddingService` interface with two swappable backends:
  - "local":  sentence-transformers (free, runs on CPU, no API calls)
  - "gemini": Gemini Embeddings API (models/text-embedding-004)

Switching providers is a one-line .env change (EMBEDDING_PROVIDER), no other
code needs to change since VectorStore and RAGEngine only depend on this
class's `embed_texts` / `embed_query` methods.

NOTE: if you switch providers after chapters already exist, re-upload those
chapters -- embedding vectors from different models are not compatible with
each other inside the same Chroma collection.
"""
import logging
from functools import lru_cache

from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    def __init__(self):
        self.provider = settings.embedding_provider
        if self.provider == "local":
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(settings.local_embedding_model)
        elif self.provider == "gemini":
            import google.generativeai as genai

            genai.configure(api_key=settings.gemini_api_key)
            self._genai = genai
        else:
            raise ValueError(f"Unknown EMBEDDING_PROVIDER: {self.provider}")

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of document chunks (task type: retrieval_document)."""
        if not texts:
            return []
        if self.provider == "local":
            vectors = self._model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
            return [v.tolist() for v in vectors]
        else:  # gemini
            result = self._genai.embed_content(
                model=settings.gemini_embedding_model,
                content=texts,
                task_type="retrieval_document",
            )
            return result["embedding"] if isinstance(result["embedding"][0], list) else [result["embedding"]]

    def embed_query(self, text: str) -> list[float]:
        """Embed a single student question (task type: retrieval_query)."""
        if self.provider == "local":
            vector = self._model.encode([text], show_progress_bar=False, normalize_embeddings=True)[0]
            return vector.tolist()
        else:  # gemini
            result = self._genai.embed_content(
                model=settings.gemini_embedding_model,
                content=text,
                task_type="retrieval_query",
            )
            return result["embedding"]


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    """Singleton so the (potentially large) local model is only loaded once."""
    return EmbeddingService()
