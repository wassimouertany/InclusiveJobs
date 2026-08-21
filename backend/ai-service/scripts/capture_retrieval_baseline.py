"""
Capture a deterministic snapshot of the RETRIEVAL half of the matching
pipeline, before refactoring rag_service.py for DRY.

Scope, deliberately:
    build_offer_text / build_candidate_text
        -> get_embeddings()
        -> get_all_candidates_as_docs() / get_all_offers_as_docs()
        -> FAISS.from_documents(...).similarity_search_with_score(query, k=10)

Out of scope, deliberately: _explain_match() / get_llm(). The LLM scoring
step is not deterministic (temperature, model updates, quota fallbacks), so
it cannot serve as a before/after reference and is never called here.

Every step reuses the real functions from rag_service.py as-is -- nothing
here reimplements retrieval logic. If the refactor changes what those
functions return, a re-run of this script on the same id will produce a
different baseline_<mode>_<id>.json, which is the point.

Usage (from backend/ai-service/, with MONGODB_URL/GOOGLE_API_KEY available):
    python scripts/capture_retrieval_baseline.py offer <job_offer_id>
    python scripts/capture_retrieval_baseline.py candidate <candidate_id>

Output: scripts/baseline_<mode>_<id>.json
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# rag_service.py and database.py live one directory up (the ai-service app
# root) and import each other with bare names (e.g. `from database import
# db`), the same way main.py runs them. Put that directory on sys.path so
# this script can import rag_service the same way, without duplicating it.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bson import ObjectId  # noqa: E402
from bson.errors import InvalidId  # noqa: E402
from langchain_community.vectorstores import FAISS  # noqa: E402

from database import db  # noqa: E402
from rag_service import (  # noqa: E402
    build_candidate_text,
    build_offer_text,
    get_all_candidates_as_docs,
    get_all_offers_as_docs,
    get_embeddings,
)

TOP_K = 10

# Per mode: which collection holds the query document, how to turn it into
# query text, and which existing rag_service function builds the corpus to
# search against -- mirrors find_matching_candidates / find_matching_offers.
MODES = {
    "offer": {
        "collection": "job_offers",
        "build_text": build_offer_text,
        "corpus_docs": get_all_candidates_as_docs,
    },
    "candidate": {
        "collection": "candidates",
        "build_text": build_candidate_text,
        "corpus_docs": get_all_offers_as_docs,
    },
}


async def capture(mode: str, doc_id: str) -> dict:
    spec = MODES[mode]
    collection = getattr(db, spec["collection"])

    try:
        oid = ObjectId(doc_id)
    except (InvalidId, TypeError) as exc:
        raise SystemExit(f"Invalid ObjectId: {doc_id!r}") from exc

    document = await collection.find_one({"_id": oid})
    if not document:
        raise SystemExit(f"No document in db.{spec['collection']} with _id={doc_id}")

    query_text = spec["build_text"](document)
    embeddings = get_embeddings()
    corpus_docs = await spec["corpus_docs"]()
    if not corpus_docs:
        raise SystemExit(
            f"{spec['corpus_docs'].__name__}() returned no documents; "
            "nothing to compare the query against."
        )

    vectorstore = FAISS.from_documents(corpus_docs, embeddings)
    similar_docs = vectorstore.similarity_search_with_score(query_text, k=TOP_K)

    results = []
    for rank, (doc, distance) in enumerate(similar_docs, start=1):
        # Exactly the formula used in find_matching_candidates/find_matching_offers.
        vector_score = max(0, min(100, int((1 - distance) * 100)))
        results.append(
            {
                "rank": rank,
                "metadata": doc.metadata,
                "distance": float(distance),
                "vector_score": vector_score,
            }
        )

    return {
        "mode": mode,
        "doc_id": doc_id,
        "top_k": TOP_K,
        "query_text_length": len(query_text),
        "corpus_size": len(corpus_docs),
        "results": results,
    }


async def main() -> None:
    if len(sys.argv) != 3 or sys.argv[1] not in MODES:
        prog = Path(__file__).name
        print(f"Usage: python {prog} <offer|candidate> <mongo_id>", file=sys.stderr)
        raise SystemExit(2)

    mode, doc_id = sys.argv[1], sys.argv[2]
    baseline = await capture(mode, doc_id)

    out_path = Path(__file__).resolve().parent / f"baseline_{mode}_{doc_id}.json"
    out_path.write_text(json.dumps(baseline, indent=2, ensure_ascii=False), encoding="utf-8")

    print(
        f"Wrote {out_path} "
        f"(corpus_size={baseline['corpus_size']}, results={len(baseline['results'])})"
    )


if __name__ == "__main__":
    asyncio.run(main())
