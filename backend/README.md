# Chapter Doubt-Solving Chatbot — Backend (RAG + Gemini)

A FastAPI backend implementing the pipeline:

```
Documents → Text Extraction (+OCR) → Chunking → Embeddings → ChromaDB → Retrieval → Gemini → Answer
```

Teachers upload chapter material (PDFs, scanned PDFs, or `.txt` notes). Students then ask doubts that
are answered **only** from that chapter's material — no generic AI guessing.

This is backend-only, built to be dropped behind a React frontend later. Every endpoint is plain JSON
over HTTP, CORS-enabled for a local frontend dev server.

---

## 1. Setup

```bash
cd chapter-doubt-chatbot
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Tesseract OCR** (system binary, not just the Python wrapper) must be installed separately for scanned
PDFs to work:
- Ubuntu/Debian: `sudo apt install tesseract-ocr`
- Mac: `brew install tesseract`
- Windows: install from https://github.com/UB-Mannheim/tesseract/wiki, then set `TESSERACT_CMD` in `.env`
  to the installed `tesseract.exe` path.

If Tesseract isn't installed, digital (non-scanned) PDFs still work fine — OCR is only invoked as a
per-page fallback.

Copy the env template and add your Gemini API key:

```bash
cp .env.example .env
# edit .env and set GEMINI_API_KEY=...
```

Get a free Gemini API key at https://aistudio.google.com/apikey.

## 2. Run

```bash
python run.py
# or: uvicorn app.main:app --reload
```

Interactive API docs (Swagger UI): **http://localhost:8000/docs**

---

## 3. How it works

| Step | Where | What |
|---|---|---|
| 1-2. Extraction | `services/document_processor.py` | PyMuPDF pulls text per page; any page with too little extracted text is rendered to an image and OCR'd with Tesseract. Mixed digital/scanned PDFs work fine. |
| 3. Chunking | `services/chunking.py` | `RecursiveCharacterTextSplitter` (LangChain), ~1000 chars with 150 overlap, tagged with `chapter_id`, `source_file`, `page_number` metadata. |
| 4. Embeddings | `services/embeddings.py` | Local `sentence-transformers` (`all-MiniLM-L6-v2`) by default — free, offline. Swap to Gemini embeddings via `.env` (`EMBEDDING_PROVIDER=gemini`). |
| 5. Vector DB | `services/vectorstore.py` | ChromaDB, **one collection per chapter** (`chapter_<chapter_id>`) — hard isolation so a question about Chapter 3 can never surface Chapter 7 content. |
| 6-7. Retrieval | `services/rag_engine.py` | Question embedded with the same model, top-k most similar chunks pulled from that chapter's collection. |
| 8-9. Generation | `services/rag_engine.py` | Retrieved chunks + recent chat history sent to Gemini 2.5 Flash with a system prompt that forces answers to be grounded in that context only. |

If retrieval finds nothing relevant, the chatbot says so explicitly instead of letting Gemini improvise
an answer — this is what `grounded: false` in the chat response signals to the frontend.

### Why one Chroma collection per chapter?
- Retrieval never crosses chapter boundaries (no metadata-filter bugs possible).
- Deleting/reprocessing a chapter is a single `delete_collection` call.
- Query speed stays fast as the platform accumulates many chapters/books.

---

## 4. API Reference

### Upload chapter material (teacher)
```
POST /chapters/upload
Content-Type: multipart/form-data

file: <PDF or TXT>
chapter_id: "science-ch3-metals-nonmetals"
```
Call multiple times with the same `chapter_id` to add more files (e.g. textbook + teacher notes) — they
accumulate in the same collection.

### List chapters
```
GET /chapters
```

### Delete a chapter
```
DELETE /chapters/{chapter_id}
```

### Ask a doubt (student)
```
POST /chat
{
  "chapter_id": "science-ch3-metals-nonmetals",
  "question": "Why does iron rust but gold doesn't?",
  "chat_history": [
    {"role": "user", "content": "What are metals?"},
    {"role": "assistant", "content": "Metals are elements that..."}
  ]
}
```
Response includes the answer, `grounded` (whether real chapter context backed it), and `sources` (which
file/page the answer came from — useful for a "cited from page 12" UI badge).

### Generate practice questions
```
POST /practice-questions
{
  "chapter_id": "science-ch3-metals-nonmetals",
  "topic": "reactivity series",
  "num_questions": 5,
  "difficulty": "medium"
}
```

### Health check
```
GET /health
```

---

## 5. Quick test with curl

```bash
# 1. Upload a chapter PDF
curl -X POST http://localhost:8000/chapters/upload \
  -F "file=@/path/to/chapter3.pdf" \
  -F "chapter_id=science-ch3"

# 2. Ask a question
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"chapter_id": "science-ch3", "question": "What is corrosion?"}'
```

---

## 6. Extending this backend

The architecture leaves clean seams for the roadmap features you listed:

- **Answer keys / generated question papers**: reuse the same upload pipeline — treat a question paper
  or answer key PDF as its own "chapter" (e.g. `chapter_id="science-ch3-answerkey"`), or add it into the
  same chapter collection so `/chat` can already answer about it.
- **Homework mistake explanations / revision recommendations**: these need student performance data
  (which this backend doesn't store yet). Add a `HomeworkResult` model + a new endpoint that feeds the
  specific mistake + relevant chapter chunks into `RAGEngine.answer_question`-style logic.
- **Gemini Vision OCR**: only `_ocr_page_image()` in `document_processor.py` needs to change — swap the
  Tesseract call for a Gemini Vision call; the rest of the pipeline is untouched.
- **Auth / multi-teacher support**: currently `chapter_id` is a free-form string with no ownership model.
  Add a proper `Chapter` DB table (Postgres/SQLite) with teacher/class ownership before production use.
- **Background processing**: large PDF uploads currently process synchronously. For production, move
  `process_and_store_document()` (in `services/ingestion.py`) onto a task queue (Celery/RQ) and poll a
  status endpoint instead.

## 7. Project structure

```
chapter-doubt-chatbot/
├── app/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── config.py                # env-driven settings
│   ├── models/schemas.py        # Pydantic request/response models
│   ├── services/
│   │   ├── document_processor.py  # PDF/OCR text extraction
│   │   ├── chunking.py            # text splitting
│   │   ├── embeddings.py          # local / Gemini embedding backends
│   │   ├── vectorstore.py         # ChromaDB wrapper
│   │   ├── ingestion.py           # pipeline orchestrator
│   │   └── rag_engine.py          # retrieval + Gemini generation
│   └── routers/
│       ├── chapters.py          # upload / list / delete chapters
│       └── chat.py              # /chat and /practice-questions
├── data/
│   ├── uploads/                 # raw uploaded files, organized per chapter
│   └── chroma_db/                # ChromaDB persistent storage
├── requirements.txt
├── .env.example
└── run.py
```
