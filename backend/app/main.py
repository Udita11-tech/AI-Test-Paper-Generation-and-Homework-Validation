"""
FastAPI application entrypoint.

Run with:  uvicorn app.main:app --reload
Docs at:   http://localhost:8000/docs
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chapters, chat

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")

app = FastAPI(
    title="Chapter Doubt-Solving Chatbot API",
    description=(
        "RAG-based backend that lets teachers upload chapter material (PDFs/notes) and lets "
        "students ask doubts that are answered strictly from that material using Gemini."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chapters.router)
app.include_router(chat.router)


@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "embedding_provider": settings.embedding_provider,
        "chat_model": settings.gemini_chat_model,
    }
