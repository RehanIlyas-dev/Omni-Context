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

# Activate the existing venv (note: it is named with a space)
source "Omni Context/bin/activate"
```

Create a `.env` file in the repo root with your Groq key:

```
GROQ_API_KEY=your-key-here
```

(A `.env.example` is provided as a template. `.env` is git-ignored.)

## Running

```bash
uvicorn backend.main:app --reload
```

Then open the interactive docs at http://localhost:8000/docs.

## API Endpoints

| Method | Path              | Description                                                                                                                                       |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`             | Health check (`status`, `groq_configured`).                                                                                                   |
| POST   | `/upload`       | Upload a single file and index it (returns 201 on success).                                                                                       |
| POST   | `/upload/batch` | Upload many files; per-file status (`success` / `skipped`).                                                                                   |
| POST   | `/query`        | RAG query.`stream: true` → chunked text + `X-Rag-Meta` header; `stream: false` → JSON with `answer`, `sources`, `chunks_retrieved`. |

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
