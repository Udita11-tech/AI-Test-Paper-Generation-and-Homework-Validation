"""
Step 3 of the pipeline: Chunking.

Splits extracted page text into overlapping chunks sized for good retrieval
granularity, while preserving page-number metadata so answers can cite
"page X of chapter_name.pdf".
"""
import hashlib
from dataclasses import dataclass, field

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.services.document_processor import PageText


@dataclass
class Chunk:
    chunk_id: str
    text: str
    metadata: dict = field(default_factory=dict)


def _make_chunk_id(chapter_id: str, source_file: str, page_number: int, index: int) -> str:
    raw = f"{chapter_id}:{source_file}:{page_number}:{index}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def chunk_pages(
    pages: list[PageText],
    chapter_id: str,
    source_file: str,
) -> list[Chunk]:
    """Turn extracted pages into retrieval-ready chunks with metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: list[Chunk] = []
    for page in pages:
        pieces = splitter.split_text(page.text)
        for idx, piece in enumerate(pieces):
            piece = piece.strip()
            if not piece:
                continue
            chunk_id = _make_chunk_id(chapter_id, source_file, page.page_number, idx)
            chunks.append(
                Chunk(
                    chunk_id=chunk_id,
                    text=piece,
                    metadata={
                        "chapter_id": chapter_id,
                        "source_file": source_file,
                        "page_number": page.page_number,
                        "used_ocr": page.used_ocr,
                    },
                )
            )
    return chunks
