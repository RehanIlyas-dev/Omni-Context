# omni-context

A context management service built with FastAPI, ChromaDB, and LangChain. It ingests
documents, embeds them with FastEmbed, and stores them in a vector store for
retrieval-augmented workflows, with LLM access via Groq.

## Features

- Document ingestion and chunking (LangChain text splitters)
- Embeddings + vector storage (FastEmbed + ChromaDB)
- FastAPI HTTP API (Uvicorn)
- LLM integration via Groq

## Requirements

- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

## Setup

```bash
# Create the virtual environment and install dependencies
uv sync

# Or with pip
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Create a `.env` file (see `.env.example`) with your configuration, e.g.:

```
GROQ_API_KEY=your-key-here
```

## Running

```bash
uv run uvicorn omni_context.main:app --reload
```

Then open the interactive docs at http://localhost:8000/docs.

## Project layout

- `pyproject.toml` — project metadata and dependencies
- `uv.lock` — locked dependency versions
- `.venv/` — local virtual environment (git-ignored)
