"""
Step 5-7 of the pipeline: Vector Database storage + Retrieval.

Design choice: one ChromaDB collection per chapter (collection name =
f"chapter_{chapter_id}"). This gives clean, hard isolation between chapters
(a student asking about Chapter 3 will never accidentally get chunks from
Chapter 7), makes deleting/reprocessing a single chapter trivial, and keeps
each query fast since it only searches that chapter's chunks.
"""
import logging
from functools import lru_cache

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.services.chunking import Chunk

logger = logging.getLogger(__name__)


def _collection_name(chapter_id: str) -> str:
    return f"chapter_{chapter_id}"


class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    def add_chunks(self, chapter_id: str, chunks: list[Chunk], embeddings: list[list[float]]) -> None:
        if not chunks:
            return
        collection = self.client.get_or_create_collection(
            name=_collection_name(chapter_id),
            metadata={"chapter_id": chapter_id},
        )
        collection.add(
            ids=[c.chunk_id for c in chunks],
            documents=[c.text for c in chunks],
            metadatas=[c.metadata for c in chunks],
            embeddings=embeddings,
        )

    def query(self, chapter_id: str, query_embedding: list[float], top_k: int) -> dict:
        """Returns raw Chroma query result dict, or empty structure if the
        chapter has no collection yet (nothing uploaded)."""
        try:
            collection = self.client.get_collection(name=_collection_name(chapter_id))
        except Exception:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        return collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

    def chapter_exists(self, chapter_id: str) -> bool:
        try:
            self.client.get_collection(name=_collection_name(chapter_id))
            return True
        except Exception:
            return False

    def count_chunks(self, chapter_id: str) -> int:
        try:
            collection = self.client.get_collection(name=_collection_name(chapter_id))
            return collection.count()
        except Exception:
            return 0

    def list_source_files(self, chapter_id: str) -> list[str]:
        try:
            collection = self.client.get_collection(name=_collection_name(chapter_id))
        except Exception:
            return []
        data = collection.get(include=["metadatas"])
        files = {m["source_file"] for m in data["metadatas"] if m.get("source_file")}
        return sorted(files)

    def list_chapter_ids(self) -> list[str]:
        collections = self.client.list_collections()
        ids = []
        for c in collections:
            name = c.name if hasattr(c, "name") else c
            if name.startswith("chapter_"):
                ids.append(name[len("chapter_"):])
        return ids

    def delete_chapter(self, chapter_id: str) -> None:
        try:
            self.client.delete_collection(name=_collection_name(chapter_id))
        except Exception as exc:
            logger.warning("Could not delete collection for %s: %s", chapter_id, exc)


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    return VectorStore()
