"""
Step 1-2 of the pipeline: Documents -> Text Extraction.

Uses PyMuPDF (fitz) to pull selectable text directly out of the PDF, which is
fast and accurate for digital/typed PDFs (most NCERT PDFs are like this).

For pages where PyMuPDF extracts little/no text (a strong signal the page is a
scanned image), we render that single page to an image and run Tesseract OCR
on it. This means a single PDF can mix digital and scanned pages correctly.

Swapping Tesseract for Gemini Vision later only requires changing
`_ocr_page_image()` -- everything else in the pipeline stays the same.
"""
import io
import logging
import re
from dataclasses import dataclass

import fitz  # PyMuPDF
import pytesseract
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

if settings.tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd


@dataclass
class PageText:
    page_number: int  # 1-indexed
    text: str
    used_ocr: bool


def _clean_text(text: str) -> str:
    """Collapse whitespace/newlines noise that PDFs commonly introduce."""
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _ocr_page_image(page: "fitz.Page", dpi: int = 300) -> str:
    """Render a PDF page to an image and OCR it with Tesseract.

    To later switch to Gemini Vision: replace the body of this function with
    a call to the Gemini Vision API using the same `img` bytes, and return
    the extracted text string. No other file needs to change.
    """
    pix = page.get_pixmap(dpi=dpi)
    img_bytes = pix.tobytes("png")
    image = Image.open(io.BytesIO(img_bytes))
    try:
        text = pytesseract.image_to_string(image)
    except Exception as exc:  # pytesseract not installed / binary missing etc.
        logger.error("OCR failed on a page: %s", exc)
        text = ""
    return text


def extract_text_from_pdf(file_path: str) -> list[PageText]:
    """Extract text from every page of a PDF, falling back to OCR per-page.

    Returns a list of PageText, one entry per page, in order.
    """
    doc = fitz.open(file_path)
    pages: list[PageText] = []

    try:
        for i, page in enumerate(doc):
            page_number = i + 1
            raw_text = page.get_text("text") or ""
            used_ocr = False

            if len(raw_text.strip()) < settings.ocr_min_chars_per_page:
                ocr_text = _ocr_page_image(page)
                if len(ocr_text.strip()) > len(raw_text.strip()):
                    raw_text = ocr_text
                    used_ocr = True

            cleaned = _clean_text(raw_text)
            if cleaned:
                pages.append(PageText(page_number=page_number, text=cleaned, used_ocr=used_ocr))
    finally:
        doc.close()

    return pages


def extract_text_from_txt(file_path: str) -> list[PageText]:
    """Support plain .txt notes uploaded directly (no OCR needed)."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    cleaned = _clean_text(content)
    if not cleaned:
        return []
    return [PageText(page_number=1, text=cleaned, used_ocr=False)]


def extract_text(file_path: str, filename: str) -> list[PageText]:
    """Dispatch extraction based on file extension."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif lower.endswith(".txt"):
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type for: {filename}. Supported: .pdf, .txt")
