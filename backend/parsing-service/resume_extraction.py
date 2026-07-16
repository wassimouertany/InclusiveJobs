"""
Extract text from PDF resumes: pdfplumber first, then OCR via pdf2image + pytesseract.

Configure paths with env vars TESSERACT_CMD and POPPLER_PATH, or rely on defaults
on Windows (common install locations).
"""

from __future__ import annotations

import io
import logging
import os

logger = logging.getLogger(__name__)

# Heuristic: scanned PDFs often yield almost no text from pdfplumber
MIN_MEANINGFUL_TEXT_LEN = 40

_DEFAULT_TESSERACT_WIN = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
_DEFAULT_POPPLER_WIN = r"C:\Program Files\poppler-25.12.0\Library\bin"


def _pdf_text_pdfplumber(pdf_bytes: bytes) -> str:
    import pdfplumber

    parts: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
    except Exception as exc:
        logger.warning("pdfplumber extraction failed: %s", exc)
        return ""
    return "\n".join(parts).strip()


def _configure_tesseract() -> None:
    import pytesseract

    cmd = os.getenv("TESSERACT_CMD", "").strip()
    if not cmd and os.name == "nt" and os.path.isfile(_DEFAULT_TESSERACT_WIN):
        cmd = _DEFAULT_TESSERACT_WIN
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd


def _poppler_path() -> str | None:
    p = os.getenv("POPPLER_PATH", "").strip()
    if p and os.path.isdir(p):
        return p
    if os.name == "nt" and os.path.isdir(_DEFAULT_POPPLER_WIN):
        return _DEFAULT_POPPLER_WIN
    return None


def _pdf_text_ocr(pdf_bytes: bytes) -> str:
    from pdf2image import convert_from_bytes
    import pytesseract

    _configure_tesseract()
    poppler = _poppler_path()
    kwargs: dict = {"dpi": 200}
    if poppler:
        kwargs["poppler_path"] = poppler
    try:
        images = convert_from_bytes(pdf_bytes, **kwargs)
    except Exception as exc:
        logger.warning("pdf2image conversion failed: %s", exc)
        return ""

    parts: list[str] = []
    for img in images:
        try:
            parts.append(pytesseract.image_to_string(img))
        except Exception as exc:
            logger.warning("pytesseract page failed: %s", exc)
    return "\n".join(parts).strip()


def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """OCR for a single raster image (PNG, JPEG, etc.)."""
    if not image_bytes:
        return ""
    from PIL import Image
    import pytesseract

    _configure_tesseract()
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            return pytesseract.image_to_string(img.convert("RGB")).strip()
    except Exception as exc:
        logger.warning("image OCR failed: %s", exc)
        return ""


def extract_text_from_disability_document(content: bytes, filename: str) -> str:
    """
    Text extraction for disability card uploads: PDF (text + OCR fallback) or images.
    """
    if not content:
        return ""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return extract_text_from_resume_pdf(content)
    if name.endswith(
        (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp", ".gif")
    ):
        return extract_text_from_image_bytes(content)
    logger.warning("Unsupported disability card type: %s", filename)
    return ""


def extract_text_from_resume_pdf(pdf_bytes: bytes) -> str:
    """
    Try normal PDF text extraction; if the result is too short (likely a scan),
    fall back to OCR.
    """
    if not pdf_bytes:
        return ""

    direct = _pdf_text_pdfplumber(pdf_bytes)
    if len(direct) >= MIN_MEANINGFUL_TEXT_LEN:
        return direct

    ocr = _pdf_text_ocr(pdf_bytes)
    if ocr:
        return ocr
    return direct
