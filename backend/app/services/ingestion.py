"""
Orchestrates the full pipeline for a single uploaded file:

Document -> Text Extraction -> Chunking -> Embeddings -> Vector Database

Kept separate from the router so it can later be moved onto a background
task queue (Celery/RQ) without touching API request handling.
"""
import logging

from app.services.chunking import chunk_pages
from app.services.document_processor import extract_text
from app.services.embeddings import get_embedding_service
from app.services.vectorstore import get_vector_store

logger = logging.getLogger(__name__)


def process_and_store_document(file_path: str, filename: str, chapter_id: str) -> dict:
    """Runs the full pipeline for one file and stores results in the chapter's collection.

    Returns summary stats used to build the UploadResponse.
    """
    pages = extract_text(file_path, filename)
    if not pages:
        raise ValueError(
            "No text could be extracted from this file, even after attempting OCR. "
            "The file may be empty, corrupted, or unreadable."
        )

    pages_ocr_used = sum(1 for p in pages if p.used_ocr)

    chunks = chunk_pages(pages, chapter_id=chapter_id, source_file=filename)
    if not chunks:
        raise ValueError("Text was extracted but produced no valid chunks.")

    embedder = get_embedding_service()
    embeddings = embedder.embed_texts([c.text for c in chunks])

    vector_store = get_vector_store()
    vector_store.add_chunks(chapter_id, chunks, embeddings)

    logger.info(
        "Ingested '%s' into chapter '%s': %d pages (%d via OCR), %d chunks",
        filename, chapter_id, len(pages), pages_ocr_used, len(chunks),
    )

    return {
        "pages_processed": len(pages),
        "pages_ocr_used": pages_ocr_used,
        "chunks_created": len(chunks),
    }
