# OmniContext

A full-stack Retrieval-Augmented Generation (RAG) engine. Upload documents, generate semantic embeddings, and get grounded, citation-aware answers through a streaming chat interface.

**Backend:** FastAPI · ChromaDB · FastEmbed · Groq · Redis semantic cache
**Frontend:** React 19 · Vite 8 · Tailwind CSS 4
**Infra:** Docker · CI/CD · Render · Vercel

---

## Live Demo

- **Frontend:** [omni-context-three.vercel.app](https://omni-context-three.vercel.app)
- **Backend API:** [omni-context-jys7.onrender.com](https://omni-context-jys7.onrender.com)
- **Swagger Docs:** [omni-context-jys7.onrender.com/docs](https://omni-context-jys7.onrender.com/docs)

---

## Features

- **Document Ingestion** — Upload PDF, TXT, DOCX, MD, PPTX. Auto-chunked via LangChain text splitters.
- **Semantic Embeddings** — FastEmbed (`BAAI/bge-small-en-v1.5`) generates 384-dim vectors locally on CPU.
- **Vector Search** — ChromaDB with cosine distance retrieval and configurable score threshold.
- **Streaming RAG** — Groq-powered generation (`qwen/qwen3.6-27b`) with real-time token streaming.
- **Semantic Cache** — Redis-backed vector cache (RedisVL). Near-duplicate queries return cached responses instantly.
- **Professional UI** — Dark theme chat interface with file upload, ingestion queue, source cards, and chunk viewer.
- **Swagger UI** — Full API documentation at `/docs` with file picker support.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Redis running locally

### Setup

```bash
# Clone the repo
git clone https://github.com/RehanIlyas-dev/Omni-Context.git
cd Omni-Context

uv sync
source "Omni Context/bin/activate"

cd frontend && npm install && cd ..

cp .env.example .env
# Edit .env with your GROQ_API_KEY
```

### Run

```bash
# Start Redis
redis-server --daemonize yes

# Start backend (terminal 1)
uvicorn backend.main:app --reload

# Start frontend (terminal 2)
cd frontend && npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/upload` | Upload and index a single file |
| POST | `/upload/batch` | Upload multiple files with per-file status |
| GET | `/documents` | List all ingested files with chunk counts |
| GET | `/documents/{filename}/chunks` | Get ordered chunks for a file |
| POST | `/query` | RAG query — streaming or non-streaming |

### Query

```json
{
  "query": "What is OmniContext?",
  "stream": true,
  "top_k": 3,
  "file_type_filter": ".pdf"
}
```

### Response (non-streaming)

```json
{
  "answer": "OmniContext is a RAG engine that...",
  "sources": [{"source": "doc.pdf", "score": 0.87, "content": "..."}],
  "chunks_retrieved": 3,
  "cached": false,
  "similarity_score": 0.87
}
```

---

## Testing

```bash
# Run all tests
python -m pytest backend/tests/ -v

# Run individual test files
python backend/tests/test_retriever.py
python backend/tests/test_llm.py
python backend/tests/test_api.py
python backend/tests/test_pipeline.py
```

- `test_retriever.py` — fully local, no API key needed
- `test_api.py` — uses FastAPI TestClient
- `test_llm.py` / `test_pipeline.py` — require `GROQ_API_KEY`

---

## Project Structure

```
Omni-Context/
├── .github/workflows/ci-cd.yml
├── .gitignore
├── .env.example
├── docker-compose.yml
├── pyproject.toml
├── uv.lock
├── backend/
│   ├── __init__.py
│   ├── config.py
│   ├── main.py
│   ├── state.py
│   ├── schemas.py
│   ├── ingest.py
│   ├── retriever.py
│   ├── pipeline.py
│   ├── llm.py
│   ├── semantic_cache.py
│   ├── openapi_patch.py
│   ├── Dockerfile
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── ingestion.py
│   │   └── query.py
│   └── tests/
│       ├── conftest.py
│       ├── inspect_db.py
│       ├── test_api.py
│       ├── test_llm.py
│       ├── test_pipeline.py
│       └── test_retriever.py
├── frontend/
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── vercel.json
│   ├── vite.config.js
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       ├── main.jsx
│       ├── assets/
│       │   └── vite.svg
│       └── services/
│           └── api.js
└── data/
```

---

## Author

Made with ❤️ by Rehan
