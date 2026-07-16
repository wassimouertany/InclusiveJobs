#🌐 InclusiveJobs

> **Adapted employment, for every talent.**

An AI-powered inclusive hiring platform designed to ease access to employment for people with specific needs, while helping companies adopt a responsible recruitment approach.

---

## About the project

**InclusiveJobs** is a smart digital solution connecting three types of users:

- 🧑‍💼 **Candidates with specific needs** — Create a profile, upload a resume, state their needs, and apply to adapted job offers.
- 🏢 **Recruiters (companies)** — Publish job offers, describe their work environment, and browse compatible profiles.
- 🛡️ **Administrators** — Manage and oversee the platform.

Unlike traditional platforms, InclusiveJobs uses **Generative AI (Gemini)** combined with a **RAG (Retrieval Augmented Generation)** architecture for smart matching that accounts not only for technical skills, but also for accessibility constraints, the candidate's specific needs, and the environment offered by the company.

---

## Architecture

The backend is split into four containers orchestrated with **Docker Compose**, sitting behind a single **nginx gateway** that both frontends (`frontend/`, `backoffice/`) talk to:

```
frontend/ ──┐
backoffice/ ─┼──▶ gateway (nginx, path-based routing) ──┬──▶ core-service   (users, jobs, applications, notifications, stories, badges, admin)
             │                                          ├──▶ ai-service     (RAG matching — routed at /ai/*, bypasses core-service entirely)
             │                                          └──▶ parsing-service (OCR + Gemini document extraction, internal only)
```

| Service             | Responsibility                                                                                | DB access                                                     |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **gateway**         | Single entry point, path-based routing (`/ai/*` → ai-service, rest → core-service), owns CORS | —                                                             |
| **core-service**    | Auth, users, job offers, applications, notifications, stories, badges, admin                  | Read/write, owns all collections except what ai-service reads |
| **ai-service**      | RAG matching engine (embeddings + FAISS + Gemini scoring)                                     | Read-only: `candidates`, `job_offers`, `recruiters`           |
| **parsing-service** | Stateless OCR + Gemini structured extraction from resumes/disability cards                    | None (bytes in, JSON out)                                     |

All services share one MongoDB Atlas cluster and validate JWTs independently with the same `SECRET_KEY` (no dedicated auth service).

---

## Technologies used

### Backend

| Technology                               | Role                                            | Service(s)                                   |
| ---------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| **FastAPI**                              | Async REST API framework                        | all                                          |
| **MongoDB + Motor**                      | Async NoSQL database                            | core-service, ai-service (read-only)         |
| **GridFS**                               | File storage (resumes, disability cards, logos) | core-service                                 |
| **Pydantic**                             | Data validation                                 | all                                          |
| **bcrypt + JWT**                         | Secure authentication                           | core-service (issues), ai-service (verifies) |
| **LangChain**                            | AI agent orchestration                          | ai-service, parsing-service                  |
| **Gemini API**                           | Generative AI                                   | ai-service, parsing-service                  |
| **text-embedding-001**                   | Vector embeddings (Google)                      | ai-service                                   |
| **FAISS**                                | Vector store for RAG matching                   | ai-service                                   |
| **pdfplumber / pytesseract / pdf2image** | Resume PDF text extraction (with OCR fallback)  | parsing-service                              |
| **nginx**                                | Reverse proxy / gateway / CORS                  | gateway                                      |

### Frontend

| Technology | Role           |
| ---------- | -------------- |
| **React**  | User interface |
| **Axios**  | REST API calls |

---

## ▶️ Running the project

### Full stack (Docker Compose — recommended)

From the project root, create a `.env` file (see `.env.example`) with `SECRET_KEY`, `MONGODB_URL`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, then:

```bash
docker-compose up --build
```

- Gateway (single entry point for both frontends): **http://localhost:8000**
- core-service direct / Swagger: **http://localhost:8001/docs**
- parsing-service direct / Swagger: **http://localhost:8002/docs**
- ai-service direct / Swagger: **http://localhost:8003/docs**

### Backend, service-by-service (for iterating on one service without rebuilding containers)

```bash
cd backend/core-service        # or backend/ai-service, backend/parsing-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001   # 8002 for parsing-service, 8003 for ai-service
```

core-service needs `PARSING_SERVICE_URL` (defaults to `http://localhost:8002`) to reach a locally-running parsing-service.

### Frontend

```bash
cd frontend        # or cd backoffice
npm install
npm run dev
```

The frontend is available at **http://localhost:3000**; point `VITE_API_URL` at the gateway (`http://localhost:8000`) via `.env.local`.
