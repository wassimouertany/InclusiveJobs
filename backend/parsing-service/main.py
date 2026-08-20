import logging
from typing import Literal, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from resume_extraction import (
    extract_text_from_disability_document,
    extract_text_from_resume_pdf,
)
from services.document_specs import get_spec
from services.parser_service import ResourceExhaustedError, parse_document_text

logger = logging.getLogger(__name__)

app = FastAPI(title="InclusiveJobs Parsing Service")


class ParseRequest(BaseModel):
    text: str
    doc_type: str


@app.post("/ocr")
async def ocr(
    file: UploadFile = File(...),
    kind: Literal["resume", "disability_card"] = Form(...),
):
    content = await file.read()
    if not content:
        return {"text": ""}
    text = get_spec(kind).extract_text(content, file.filename or "")
    return {"text": text}


@app.post("/parse")
async def parse(payload: ParseRequest):
    return await parse_document_text(payload.text, payload.doc_type)


@app.post("/extract-documents")
async def extract_documents(
    resume: Optional[UploadFile] = File(None),
    disability_card: Optional[UploadFile] = File(None),
):
    """
    OCR + Gemini: extract resume fields and/or disability card fields for registration auto-fill.
    Does not persist data.
    """
    if not resume and not disability_card:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one file: resume (PDF) or disability_card (PDF/image).",
        )

    out: dict = {
        "resume": {},
        "disability_card": {},
        "quota_exceeded": False,
        "resume_text_raw": "",
        "card_text_raw": "",
    }

    if resume and resume.filename:
        if not resume.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Resume must be a PDF file.")
        rb = await resume.read()
        raw = extract_text_from_resume_pdf(rb) if rb else ""
        out["resume_text_raw"] = raw
        if raw:
            try:
                out["resume"] = await parse_document_text(raw, "resume")
            except ResourceExhaustedError:
                out["resume"] = {}
                out["quota_exceeded"] = True
            except Exception as e:
                logger.warning(f"Resume parse failed: {e}")
                out["resume"] = {}

    if disability_card and disability_card.filename:
        dc_bytes = await disability_card.read()
        raw_dc = (
            extract_text_from_disability_document(dc_bytes, disability_card.filename or "")
            if dc_bytes
            else ""
        )
        out["card_text_raw"] = raw_dc
        if raw_dc:
            try:
                out["disability_card"] = await parse_document_text(raw_dc, "disability_card")
            except ResourceExhaustedError:
                out["disability_card"] = {}
                out["quota_exceeded"] = True
            except Exception as e:
                logger.warning(f"Card parse failed: {e}")
                out["disability_card"] = {}

    return out
