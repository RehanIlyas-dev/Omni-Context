import os
from contextlib import asynccontextmanager

import chromadb
from fastapi import FastAPI

from backend.config import CHROMA_DB_PATH, COLLECTION_NAME, DEFAULT_GROQ_MODEL, REDIS_URL
from backend.ingest import DocumentIngestor
from backend.pipeline import RAGPipeline
from backend.semantic_cache import RedisSemanticCache
from backend.routers import ingestion_router, query_router
from backend.openapi_patch import patch_upload_openapi
from backend import state


@asynccontextmanager
async def lifespan(app: FastAPI):

    if not os.getenv("GROQ_API_KEY"):
        print("[WARNING] GROQ_API_KEY environment variable is not set!")

    print("Initializing OmniContext RAG engines...")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

    # Semantic cache — graceful if Redis is down
    state.cache = RedisSemanticCache(redis_url=REDIS_URL)

    state.ingestor = DocumentIngestor(collection_name=COLLECTION_NAME, client=client)
    state.pipeline = RAGPipeline(
        collection_name=COLLECTION_NAME,
        client=client,
        model=DEFAULT_GROQ_MODEL,
        cache=state.cache,
    )
    print("OmniContext API initialized successfully.")
    yield
    client.close()


app = FastAPI(
    title="OmniContext API",
    description="Production-ready RAG Engine using FastEmbed, ChromaDB, and Groq LLMs",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(ingestion_router)
app.include_router(query_router)

patch_upload_openapi(app)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": "OmniContext RAG API",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "cache_enabled": state.cache is not None and state.cache.connected,
    }
