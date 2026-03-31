import os
from typing import Optional
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.chains.question_answering import load_qa_chain
from langchain.schema import Document
from database import db
from bson import ObjectId


EMBEDDINGS_MODEL = "models/gemini-embedding-001"
LLM_MODEL = "gemini-2.5-flash"

# Keep resume chunk within typical embedding input limits
MAX_RESUME_TEXT_CHARS = 12000


def build_candidate_text(candidate: dict) -> str:
    """
    Converts a candidate MongoDB document into a rich text description
    for embedding. This is the key to semantic matching — the more
    context you pack in, the better the vector search.
    """
    parts = [
        f"Job title: {candidate.get('profile_title', '')}",
        f"Industry: {candidate.get('industry', '')}",
        f"Years of experience: {candidate.get('years_of_experience', 0)}",
        f"Education level: {candidate.get('education_level', '')}",
        f"Key skills: {', '.join(candidate.get('key_skills', []))}",
        f"Work preference: {candidate.get('work_preference', '')}",
        f"Disability type: {candidate.get('disability_type', '')}",
        f"Accessibility needs: {candidate.get('accessibility_needs', '')}",
        f"Work accommodations required: {', '.join(candidate.get('work_accommodations', []))}",
        f"Availability: {candidate.get('availability_status', '')}",
    ]
    resume_raw = (candidate.get("resume_text_raw") or "").strip()
    if resume_raw:
        if len(resume_raw) > MAX_RESUME_TEXT_CHARS:
            resume_raw = resume_raw[:MAX_RESUME_TEXT_CHARS] + "\n[... truncated ...]"
        parts.append(f"Resume content: {resume_raw}")

    return "\n".join(p for p in parts if p.split(": ", 1)[1].strip())


def build_offer_text(offer: dict) -> str:
    """
    Converts a job offer MongoDB document into a rich text description.
    """
    parts = [
        f"Job title: {offer.get('title', '')}",
        f"Profile sought: {offer.get('profile_title', '')}",
        f"Description: {offer.get('description', '')}",
        f"Required skills: {', '.join(offer.get('required_skills', []))}",
        f"Key skills: {', '.join(offer.get('key_skills', []))}",
        f"Contract type: {offer.get('contract_type', '')}",
        f"Working conditions: {offer.get('working_conditions', '')}",
        f"Possible accommodations provided: {offer.get('possible_accommodations', '')}",
    ]
    return "\n".join(p for p in parts if p.split(": ", 1)[1].strip())


def get_embeddings():
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDINGS_MODEL,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )


def get_llm():
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=0.3,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )


async def get_all_candidates_as_docs() -> list[Document]:
    """Fetch all active candidates and turn them into LangChain Documents."""
    cursor = db.candidates.find({"availability_status": "actively_looking"})
    candidates = await cursor.to_list(length=500)
    docs = []
    for c in candidates:
        text = build_candidate_text(c)
        docs.append(Document(
            page_content=text,
            metadata={"candidate_id": str(c["_id"]), "name": f"{c.get('first_name','')} {c.get('last_name','')}".strip()}
        ))
    return docs


async def get_all_offers_as_docs() -> list[Document]:
    """Fetch all open job offers and turn them into LangChain Documents."""
    cursor = db.job_offers.find({"status": "open"})
    offers = await cursor.to_list(length=500)
    docs = []
    for o in offers:
        text = build_offer_text(o)
        docs.append(Document(
            page_content=text,
            metadata={"offer_id": str(o["_id"]), "title": o.get("title", "")}
        ))
    return docs


async def find_matching_candidates(offer: dict, top_k: int = 10) -> list[dict]:
    """
    RAG flow for recruiters:
    1. Build offer text → embed it
    2. Similarity search against all candidate embeddings
    3. Ask Gemini to score + explain each match
    Returns a list of dicts: {candidate_id, name, score, explanation}
    """
    from langchain_community.vectorstores import FAISS

    offer_text = build_offer_text(offer)
    embeddings = get_embeddings()

    candidate_docs = await get_all_candidates_as_docs()
    if not candidate_docs:
        return []

    # Build in-memory FAISS index from all candidates
    vectorstore = FAISS.from_documents(candidate_docs, embeddings)
    similar_docs = vectorstore.similarity_search_with_score(offer_text, k=top_k)

    # For each result, ask Gemini to provide a detailed compatibility score
    results = []
    for doc, distance in similar_docs:
        explanation = await _explain_match(
            entity_a=offer_text,
            entity_b=doc.page_content,
            context_a="job offer",
            context_b="candidate profile",
        )
        similarity_score = max(0, min(100, int((1 - distance) * 100)))
        results.append({
            "candidate_id": doc.metadata["candidate_id"],
            "name": doc.metadata["name"],
            "vector_score": similarity_score,
            "ai_score": explanation.get("score", similarity_score),
            "explanation": explanation.get("explanation", ""),
            "strengths": explanation.get("strengths", []),
            "concerns": explanation.get("concerns", []),
        })

    return sorted(results, key=lambda x: x["ai_score"], reverse=True)


async def find_matching_offers(candidate: dict, top_k: int = 10) -> list[dict]:
    """
    RAG flow for candidates:
    1. Build candidate text → embed it
    2. Similarity search against all job offer embeddings
    3. Ask Gemini to score + explain each match
    """
    from langchain_community.vectorstores import FAISS

    candidate_text = build_candidate_text(candidate)
    embeddings = get_embeddings()

    offer_docs = await get_all_offers_as_docs()
    if not offer_docs:
        return []

    vectorstore = FAISS.from_documents(offer_docs, embeddings)
    similar_docs = vectorstore.similarity_search_with_score(candidate_text, k=top_k)

    results = []
    for doc, distance in similar_docs:
        explanation = await _explain_match(
            entity_a=candidate_text,
            entity_b=doc.page_content,
            context_a="candidate profile",
            context_b="job offer",
        )
        similarity_score = max(0, min(100, int((1 - distance) * 100)))
        results.append({
            "offer_id": doc.metadata["offer_id"],
            "title": doc.metadata["title"],
            "vector_score": similarity_score,
            "ai_score": explanation.get("score", similarity_score),
            "explanation": explanation.get("explanation", ""),
            "strengths": explanation.get("strengths", []),
            "concerns": explanation.get("concerns", []),
        })

    return sorted(results, key=lambda x: x["ai_score"], reverse=True)


async def _explain_match(
    entity_a: str,
    entity_b: str,
    context_a: str,
    context_b: str,
) -> dict:
    """
    Asks Gemini to produce a structured compatibility analysis.
    Returns: {score: int, explanation: str, strengths: list, concerns: list}
    """
    import json

    llm = get_llm()

    prompt = f"""You are an inclusive hiring expert. Analyze the compatibility between this {context_a} and this {context_b}.

{context_a.upper()}:
{entity_a}

{context_b.upper()}:
{entity_b}

CRITICAL: Pay special attention to:
1. Whether the job's possible_accommodations match the candidate's accessibility_needs and work_accommodations
2. Whether the working_conditions suit the candidate's disability_type and work_preference
3. Skill alignment between required_skills and key_skills

Respond ONLY with a valid JSON object, no markdown, no extra text:
{{
  "score": <integer 0-100 representing overall compatibility>,
  "explanation": "<2-3 sentence summary of why they match or don't>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1 if any>", "<concern 2 if any>"]
}}"""

    try:
        response = await llm.ainvoke(prompt)
        text = response.content.strip()
        # Strip markdown fences if Gemini adds them
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return {
            "score": 50,
            "explanation": "Analysis could not be completed.",
            "strengths": [],
            "concerns": [],
        }