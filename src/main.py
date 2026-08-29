import os
import shutil
import uuid
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional

import chromadb
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from src.config import CHROMA_DB_PATH, COLLECTION_NAME, DEFAULT_GROQ_MODEL
from src.ingest import DocumentIngestor
from src.pipeline import RAGPipeline
from src.schemas import QueryRequest, QueryResponse, DocumentUploadResponse


UPLOAD_DIR = Path("./data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ingestor: Optional[DocumentIngestor] = None
pipeline: Optional[RAGPipeline] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify System Requirements and Initialize Global Engines (Ingestor & RAG Pipeline)
    global ingestor, pipeline

    if not os.getenv("GROQ_API_KEY"):
        print("[WARNING] GROQ_API_KEY environment variable is not set!")

    print("Initializing OmniContext RAG engines...")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    ingestor = DocumentIngestor(collection_name=COLLECTION_NAME, client=client)
    pipeline = RAGPipeline(collection_name=COLLECTION_NAME, client=client, model=DEFAULT_GROQ_MODEL)
    print("OmniContext API initialized successfully.")
    yield
    client.close()


app = FastAPI(
    title="OmniContext API",
    description="Production-ready RAG Engine using FastEmbed, ChromaDB, and Groq LLMs",
    version="1.0.0",
    lifespan=lifespan,
)


# Health Check Endpoint
@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "OmniContext RAG API",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
    }

# Ingestion Endpoint
@app.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Ingestion"],
)
async def upload_document(file: UploadFile = File(...)):
    
    # Uploads the file to a temporary location, then ingests it into ChromaDB using the DocumentIngestor.
    if not ingestor:
        raise HTTPException(status_code=500, detail="Ingestion engine not initialized.")

    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = {".txt", ".md", ".pdf", ".pptx", ".ppt", ".docx", ".doc"}

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file_ext}'. Allowed: {list(allowed_extensions)}",
        )

    safe_name = f"{uuid.uuid4().hex}{file_ext}"
    temp_file_path = UPLOAD_DIR / safe_name
    try:
        with temp_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        await run_in_threadpool(ingestor.ingest_file, str(temp_file_path))

        return DocumentUploadResponse(
            filename=file.filename,
            file_type=file_ext,
            status="success",
            message=f"File '{file.filename}' processed and indexed into ChromaDB.",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest file: {str(e)}")

    finally:
        if temp_file_path.exists():
            temp_file_path.unlink()


@app.post("/query", tags=["RAG Chain"])
def query_rag(request: QueryRequest):
    """Executes vector retrieval and generates a grounded response using Groq."""
    if not pipeline:
        raise HTTPException(status_code=500, detail="RAG Pipeline not initialized.")

    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY environment variable missing on server.",
        )

    try:
        if request.stream:
            rag_response = pipeline.run(
                query=request.query,
                top_k=request.top_k,
                file_type_filter=request.file_type_filter,
                model=request.model,
                temperature=request.temperature,
                stream=True,
            )

            def stream_response_wrapper():
                for chunk in rag_response.answer:
                    yield chunk

            return StreamingResponse(stream_response_wrapper(), media_type="text/plain")

        rag_response = pipeline.run(
            query=request.query,
            top_k=request.top_k,
            file_type_filter=request.file_type_filter,
            model=request.model,
            temperature=request.temperature,
            stream=False,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Generation failed: {str(e)}")

    return QueryResponse(
        query=rag_response.query,
        answer=str(rag_response.answer),
        sources=rag_response.sources,
        chunks_retrieved=rag_response.chunks_retrieved,
    )