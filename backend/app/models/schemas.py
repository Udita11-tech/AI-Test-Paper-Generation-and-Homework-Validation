"""
Pydantic schemas for all API requests and responses.
Keeping these in one place makes the API contract easy to hand to a frontend dev.
"""
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ---------- Chapters / Upload ----------

class ChapterInfo(BaseModel):
    chapter_id: str
    name: str
    subject: Optional[str] = None
    grade: Optional[str] = None
    num_chunks: int
    source_files: list[str]


class ChapterListResponse(BaseModel):
    chapters: list[ChapterInfo]


class UploadResponse(BaseModel):
    chapter_id: str
    filename: str
    pages_processed: int
    pages_ocr_used: int
    chunks_created: int
    status: Literal["success"]


class DeleteResponse(BaseModel):
    chapter_id: str
    status: Literal["deleted"]


# ---------- Chat ----------

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    chapter_id: str = Field(..., description="Which chapter's collection to search")
    question: str
    chat_history: list[ChatTurn] = Field(default_factory=list, description="Recent turns for follow-up context")
    top_k: Optional[int] = Field(default=None, description="Override default retrieval depth")


class SourceChunk(BaseModel):
    chunk_id: str
    source_file: str
    page_number: int
    text_preview: str
    similarity_score: float


class ChatResponse(BaseModel):
    answer: str
    chapter_id: str
    sources: list[SourceChunk]
    grounded: bool = Field(..., description="False if no relevant context was found in the chapter material")


# ---------- Practice question generation ----------

class PracticeQuestionRequest(BaseModel):
    chapter_id: str
    topic: Optional[str] = Field(default=None, description="Optional sub-topic within the chapter")
    num_questions: int = Field(default=5, ge=1, le=20)
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "mixed"


class PracticeQuestionResponse(BaseModel):
    chapter_id: str
    topic: Optional[str]
    questions: list[str]
