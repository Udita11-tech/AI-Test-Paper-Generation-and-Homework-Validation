"""
Student-facing endpoints: ask a doubt about a chapter, generate practice questions.
"""
import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    PracticeQuestionRequest,
    PracticeQuestionResponse,
)
from app.services.rag_engine import get_rag_engine
from app.services.vectorstore import get_vector_store

logger = logging.getLogger(__name__)
router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """Answer a student's doubt using only material from the given chapter."""
    vector_store = get_vector_store()
    if not vector_store.chapter_exists(request.chapter_id):
        raise HTTPException(
            status_code=404,
            detail=f"No material found for chapter '{request.chapter_id}'. Ask your teacher to upload it first.",
        )

    engine = get_rag_engine()
    answer, sources, grounded = engine.answer_question(
        chapter_id=request.chapter_id,
        question=request.question,
        chat_history=request.chat_history,
        top_k=request.top_k,
    )

    return ChatResponse(
        answer=answer,
        chapter_id=request.chapter_id,
        sources=sources,
        grounded=grounded,
    )


@router.post("/practice-questions", response_model=PracticeQuestionResponse)
def practice_questions(request: PracticeQuestionRequest):
    """Generate extra practice questions grounded in the chapter content."""
    vector_store = get_vector_store()
    if not vector_store.chapter_exists(request.chapter_id):
        raise HTTPException(
            status_code=404,
            detail=f"No material found for chapter '{request.chapter_id}'. Ask your teacher to upload it first.",
        )

    engine = get_rag_engine()
    questions = engine.generate_practice_questions(
        chapter_id=request.chapter_id,
        topic=request.topic,
        num_questions=request.num_questions,
        difficulty=request.difficulty,
    )

    return PracticeQuestionResponse(
        chapter_id=request.chapter_id,
        topic=request.topic,
        questions=questions,
    )
