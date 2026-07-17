"""
Teacher-facing endpoints: upload chapter material, list chapters, delete a chapter.
"""
import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import settings
from app.models.schemas import (
    ChapterInfo,
    ChapterListResponse,
    DeleteResponse,
    UploadResponse,
)
from app.services.ingestion import process_and_store_document
from app.services.vectorstore import get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chapters", tags=["chapters"])

ALLOWED_EXTENSIONS = {".pdf", ".txt"}


@router.post("/upload", response_model=UploadResponse)
async def upload_chapter_material(
    file: UploadFile = File(..., description="NCERT chapter PDF, scanned PDF, or .txt notes"),
    chapter_id: str = Form(..., description="Stable identifier, e.g. 'science-ch3-metals-nonmetals'"),
):
    """Upload a single file into a chapter. Can be called multiple times with the
    same chapter_id to add more material (e.g. textbook + teacher's notes)."""
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    chapter_dir = Path(settings.upload_dir) / chapter_id
    chapter_dir.mkdir(parents=True, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    dest_path = chapter_dir / safe_name

    try:
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    finally:
        await file.close()

    try:
        stats = process_and_store_document(str(dest_path), file.filename, chapter_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error processing upload")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {exc}")

    return UploadResponse(
        chapter_id=chapter_id,
        filename=file.filename,
        pages_processed=stats["pages_processed"],
        pages_ocr_used=stats["pages_ocr_used"],
        chunks_created=stats["chunks_created"],
        status="success",
    )


@router.get("", response_model=ChapterListResponse)
def list_chapters():
    """List all chapters that currently have processed material."""
    vector_store = get_vector_store()
    chapter_ids = vector_store.list_chapter_ids()

    chapters = []
    for cid in chapter_ids:
        chapters.append(
            ChapterInfo(
                chapter_id=cid,
                name=cid,
                num_chunks=vector_store.count_chunks(cid),
                source_files=vector_store.list_source_files(cid),
            )
        )
    return ChapterListResponse(chapters=chapters)


@router.delete("/{chapter_id}", response_model=DeleteResponse)
def delete_chapter(chapter_id: str):
    """Remove a chapter's collection entirely (e.g. teacher re-uploads a cleaner version)."""
    vector_store = get_vector_store()
    if not vector_store.chapter_exists(chapter_id):
        raise HTTPException(status_code=404, detail=f"Chapter '{chapter_id}' not found")

    vector_store.delete_chapter(chapter_id)

    chapter_dir = Path(settings.upload_dir) / chapter_id
    if chapter_dir.exists():
        shutil.rmtree(chapter_dir, ignore_errors=True)

    return DeleteResponse(chapter_id=chapter_id, status="deleted")
