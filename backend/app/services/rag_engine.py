"""
Step 6-9 of the pipeline: Query embedding -> Retrieval -> Gemini generation.

This is where the "R" (retrieval) and "G" (generation) of RAG meet. The
system prompt explicitly instructs Gemini to answer ONLY from the retrieved
chapter context, in simple student-friendly language, and to say so plainly
when the answer isn't in the material -- this is what makes the chatbot
trustworthy for an educational setting instead of hallucinating.
"""
import logging

import google.generativeai as genai

from app.config import settings
from app.models.schemas import ChatTurn, SourceChunk
from app.services.embeddings import get_embedding_service
from app.services.vectorstore import get_vector_store

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.gemini_api_key)

SYSTEM_INSTRUCTION = """You are a friendly, patient teaching assistant helping school students (NCERT \
curriculum) understand a specific chapter they are studying.

Rules you must follow strictly:
1. Answer ONLY using the information given in the "Chapter context" below. Do not use outside knowledge, \
even if you know the answer from elsewhere.
2. If the chapter context does not contain enough information to answer the question, say clearly: \
"I couldn't find this in the uploaded chapter material" and suggest the student ask their teacher or \
check another chapter -- do NOT make up an answer.
3. Explain concepts in simple, age-appropriate language, as if teaching a curious student. Use short \
sentences, and a small example if it helps.
4. If it's a follow-up question, use the recent conversation for context, but still ground the factual \
content in the chapter context provided.
5. Do not mention "the context", "the document", or "chunks" in your answer -- just answer naturally as a \
teacher would, referring to "the chapter" or "your book" if needed.
"""

NO_CONTEXT_DISTANCE_THRESHOLD = 0.9  # Chroma cosine distance; higher = less similar. Tune per embedding model.


class RAGEngine:
    def __init__(self):
        self.embedder = get_embedding_service()
        self.vector_store = get_vector_store()
        self.model = genai.GenerativeModel(
            model_name=settings.gemini_chat_model,
            system_instruction=SYSTEM_INSTRUCTION,
        )

    def _retrieve(self, chapter_id: str, question: str, top_k: int) -> tuple[list[SourceChunk], list[str]]:
        query_vector = self.embedder.embed_query(question)
        result = self.vector_store.query(chapter_id, query_vector, top_k)

        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]
        ids = result.get("ids", [[]])[0]

        sources: list[SourceChunk] = []
        context_texts: list[str] = []
        for doc, meta, dist, chunk_id in zip(documents, metadatas, distances, ids):
            sources.append(
                SourceChunk(
                    chunk_id=chunk_id,
                    source_file=meta.get("source_file", "unknown"),
                    page_number=meta.get("page_number", 0),
                    text_preview=(doc[:200] + "...") if len(doc) > 200 else doc,
                    similarity_score=round(1 - dist, 4) if dist is not None else 0.0,
                )
            )
            context_texts.append(doc)

        return sources, context_texts

    def answer_question(
        self,
        chapter_id: str,
        question: str,
        chat_history: list[ChatTurn] | None = None,
        top_k: int | None = None,
    ) -> tuple[str, list[SourceChunk], bool]:
        """Returns (answer_text, sources, grounded)."""
        top_k = top_k or settings.top_k
        sources, context_texts = self._retrieve(chapter_id, question, top_k)

        if not context_texts:
            return (
                "I couldn't find any material for this chapter yet. Please ask your teacher to upload "
                "the chapter notes or textbook first.",
                [],
                False,
            )

        grounded = any(s.similarity_score >= (1 - NO_CONTEXT_DISTANCE_THRESHOLD) for s in sources)

        context_block = "\n\n---\n\n".join(
            f"[Source: {s.source_file}, page {s.page_number}]\n{text}"
            for s, text in zip(sources, context_texts)
        )

        history_block = ""
        if chat_history:
            recent = chat_history[-6:]  # keep prompt small
            history_block = "\n".join(f"{turn.role}: {turn.content}" for turn in recent)

        prompt = f"""Chapter context:
{context_block}

Recent conversation (if any):
{history_block if history_block else "(no prior conversation)"}

Student's question: {question}

Answer the student's question following your rules."""

        try:
            response = self.model.generate_content(prompt)
            answer_text = response.text.strip()
        except Exception as exc:
            logger.error("Gemini generation failed: %s", exc)
            answer_text = (
                "Sorry, I ran into a problem generating an answer just now. Please try again in a moment."
            )
            grounded = False

        return answer_text, sources, grounded

    def generate_practice_questions(
        self,
        chapter_id: str,
        topic: str | None,
        num_questions: int,
        difficulty: str,
    ) -> list[str]:
        """Generate extra practice questions grounded in the chapter content."""
        search_query = topic or "key concepts, definitions, and important facts in this chapter"
        sources, context_texts = self._retrieve(chapter_id, search_query, top_k=max(settings.top_k, 6))

        if not context_texts:
            return ["No chapter material found. Please upload the chapter content first."]

        context_block = "\n\n---\n\n".join(context_texts)
        topic_line = f" focused specifically on the topic '{topic}'" if topic else ""

        prompt = f"""Chapter context:
{context_block}

Based only on the chapter context above, generate {num_questions} practice questions{topic_line} for a \
student to test their understanding. Difficulty level: {difficulty}.

Return ONLY a numbered list of questions, one per line, no answers, no extra commentary."""

        try:
            response = self.model.generate_content(prompt)
            raw_lines = [line.strip() for line in response.text.strip().split("\n") if line.strip()]
            # Strip leading numbering like "1." or "1)" for a clean list
            questions = [line.lstrip("0123456789.)- ").strip() for line in raw_lines]
            return [q for q in questions if q]
        except Exception as exc:
            logger.error("Gemini practice-question generation failed: %s", exc)
            return ["Sorry, I couldn't generate practice questions right now. Please try again."]


_engine_instance: RAGEngine | None = None


def get_rag_engine() -> RAGEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = RAGEngine()
    return _engine_instance
