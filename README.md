# Omni-Context

Omni-Context — The  retrieval-augmented generation (RAG) API built with
**FastAPI**, **ChromaDB**, **FastEmbed**, and **Groq**. It ingests unstructured documents,
generates semantic embeddings, persists them in a vector store, and serves grounded,
citation-aware answers through a streaming-capable HTTP interface.

## Features

- Document ingestion + chunking (LangChain text splitters)
- Embeddings + vector storage (FastEmbed + ChromaDB, cosine distance)
- FastAPI HTTP API (single + batch upload, streaming & non-streaming query)
- LLM grounding via Groq (default model `qwen/qwen3.6-27b`)

## Requirements

- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

## Setup

```bash
# Create the virtual environment and install dependencies
uv sync

# Activate the virtual environment (note: it is named with a space; `uv sync` recreates it as `.venv`).
- Run API: `uvicorn backend.main:app --reload`
  - NOT `omni_context.main:app` — there is no `omni_context` package; all code is under `backend/`.
- Run tests: `python -m pytest backend/tests/`
  - `test_retriever.py` is fully local. `test_pipeline.py` / `test_llm.py` need a live `GROQ_API_KEY` (they skip their body if unset).
- Run ingestion as a module: `python -m backend.ingest`
  - `backend/` uses relative imports (`from .config import ...`), so always use `python -m backend.<module>` — never `python backend/ingest.py`.
```

Create a `.env` file in the repo root with your keys:

```
GROQ_API_KEY=your-key-here
REDIS_URL=redis://localhost:6379
```

(A `.env.example` is provided as a template. `.env` is git-ignored.)

## Running

Make sure Redis is running before starting the API:

```bash
redis-server --daemonize yes
```

Then start the API:

```bash
uvicorn backend.main:app --reload
```

Then open the interactive docs at http://localhost:8000/docs.

## API Endpoints

| Method | Path              | Description                                                                                                                                       |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`             | Health check (`status`, `groq_configured`, `cache_enabled`).                                                                                                   |
| POST   | `/upload`       | Upload a single file and index it (returns 201 on success).                                                                                       |
| POST   | `/upload/batch` | Upload many files; per-file status (`success` / `skipped`).                                                                                   |
| POST   | `/query`        | RAG query.`stream: true` → chunked text + `X-Rag-Meta` header; `stream: false` → JSON with `answer`, `sources`, `chunks_retrieved`, `cached`, `similarity_score`. |

### Semantic Cache

When enabled (Redis reachable at `REDIS_URL`), the `/query` endpoint caches responses by **semantic similarity** rather than exact string match:

- **1st query** (cache miss): runs ChromaDB retrieval + Groq generation → returns `cached: False`
- **2nd query** (exact match): `cached: True`, `similarity: 1.0` → instant response
- **Near-duplicate** (e.g. "Tell me about Rehan" after "What is Rehan?"): `cached: True`, `similarity: 0.9154` if cosine distance ≤ 0.12

Cache is **skipped** for file-type filtered queries and streaming responses (streaming generators aren't serializable). Configure `REDIS_URL` in `.env` to enable.

```env
REDIS_URL=redis://localhost:6379
```

All ingestion runs the embedding step off the event loop. Unsupported file types
in `/upload/batch` are reported as `skipped` rather than failing the whole request.

## Project layout

```
Omni-Context/
├── .env.example
├── .gitignore
├── README.md
├── pyproject.toml
├── uv.lock
└── backend/
    ├── __init__.py
    ├── config.py
    ├── ingest.py
    ├── llm.py
    ├── main.py
    ├── pipeline.py
    ├── retriever.py
    ├── schemas.py
    ├── state.py
    ├── routers/
    │   ├── __init__.py
    │   ├── ingestion.py
    │   └── query.py
    └── tests/
        ├── conftest.py
        ├── inspect_db.py
        ├── test_api.py
        ├── test_llm.py
        ├── test_pipeline.py
        └── test_retriever.py
```

## Testing

```bash
python -m pytest backend/tests/
```

- `test_retriever.py` runs locally (no API key required).
- `test_pipeline.py` / `test_llm.py` exercise the live Groq API and skip their body if `GROQ_API_KEY` is unset.

To rebuild the vector store from the sample docs in `data/`:

```bash
python -m backend.ingest
```

(`chroma_db/` and `data/*` are git-ignored and must not be committed.)

## Frontend (planned)

The intended client is a **React + Vite + Tailwind CSS** single-page app that calls
this API (`/query`, `/upload`, `/upload/batch`). It is not yet scaffolded in this
repository — this FastAPI service is the backend integration point.
