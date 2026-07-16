# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InclusiveJobs is an inclusive hiring platform that matches job seekers with disabilities to employers. The core innovation is a RAG-based matching engine that considers accessibility needs (disability type, work accommodations, preferred work arrangement) when ranking candidates/offers.

## Development Commands

### Full stack (Docker Compose — primary mode)
```bash
docker-compose up --build
# Gateway (single entry point for both frontends): http://localhost:8000
# core-service direct:     http://localhost:8001/docs
# parsing-service direct:  http://localhost:8002/docs
# ai-service direct:       http://localhost:8003/docs
```
Requires a `.env` at the repo root with `SECRET_KEY`, `MONGODB_URL`, `GOOGLE_API_KEY`, `GROQ_API_KEY` (see `.env.example`).

### Backend, service-by-service (for iterating on a single service without rebuilding containers)
```bash
cd backend/core-service        # or backend/ai-service, backend/parsing-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001   # 8002 for parsing-service, 8003 for ai-service
```
core-service needs `PARSING_SERVICE_URL` (defaults to `http://localhost:8002`) to reach a locally-running parsing-service.

### Frontend (React + Vite)
```bash
cd frontend        # or cd backoffice
npm install
npm run dev        # http://localhost:3000 (frontend) — backoffice runs on its own Vite port
npm run lint       # TypeScript type-check (tsc --noEmit) — no test suite exists
npm run build      # Production build
```

## Required Environment Variables

**`backend/.env`**:
- `MONGODB_URL` — MongoDB Atlas connection string
- `SECRET_KEY` — JWT signing secret
- `GOOGLE_API_KEY` — Gemini API key (used for embeddings and LLM)

**`frontend/.env.local`**:
- `VITE_API_URL` — Backend URL (defaults to `http://localhost:8000`)
- `GEMINI_API_KEY` — For any client-side Gemini calls

## Architecture

### User Roles & Collections
Three roles stored in separate MongoDB collections: `CANDIDATE`, `RECRUITER`, `ADMIN`. The JWT token embeds both email and role. Role-specific FastAPI dependency guards (`get_current_candidate()`, `get_current_recruiter()`, `get_current_admin()`) live in `backend/auth.py`.

### Data Models (`backend/models.py`)
- **CandidateDB**: disability_type (MOTOR/VISUAL/HEARING/COGNITIVE/PSYCHOLOGICAL/OTHER), work_accommodations, accessibility_needs, work_preference (FULLY_REMOTE/HYBRID/ON_SITE/FLEXIBLE_HOURS/PART_TIME), resume_text_raw (plain text extracted from uploaded PDF)
- **RecruiterDB**: company info, inclusion_strategy, employees_with_disability
- **JobOfferDB**: required_skills, possible_accommodations, contract_type (PERMANENT/FIXED_TERM/CIVP/KARAMA/INTERNSHIP), saved_candidates

### RAG Matching Engine (`backend/rag_service.py`)
1. Builds rich text profiles from candidate + job offer fields
2. Embeds using Google `models/gemini-embedding-001` via LangChain
3. Indexes with in-memory FAISS for cosine similarity search
4. Scores top-k results using `gemini-2.5-flash` — returns structured JSON with score and accessibility compatibility explanation

Two match directions: find candidates for a job offer, or find offers for a candidate. Routes are in `backend/routes_ai.py`.

### Document Processing
- **`backend/resume_extraction.py`**: Extracts text from PDFs — tries pdfplumber first, falls back to OCR (pdf2image + pytesseract). Auto-detects Tesseract path on Windows.
- **`backend/services/parser_service.py`**: Uses Gemini to parse OCR'd text into structured JSON for both resumes (skills, experience, education) and disability cards (type, card number, expiry). Handles English, French, and Arabic.

### File Storage
Binary files (resumes, disability cards, logos) are stored in MongoDB GridFS. Fields like `resume_id`, `disability_card_id`, `logo_id` on the DB models hold the GridFS ObjectId. Upload utility is in `backend/utils.py`.

### Frontend State & HTTP
- **Auth state**: Zustand store at `frontend/src/store/authStore.ts` — persists JWT token and user profile
- **HTTP client**: Axios instance at `frontend/src/services/apiClient.ts` — intercepts all requests to inject `Authorization: Bearer <token>`
- **API base URL**: Configured in `frontend/src/config/api.ts` via `VITE_API_URL`
- **Routing**: React Router DOM v7, route definitions in `frontend/src/navigation/routes.ts`, main layout in `frontend/src/App.tsx`

### CORS
Backend allows `http://localhost:3000` and `http://localhost:5173` (and their `127.0.0.1` equivalents). Configured in `backend/main.py`.
