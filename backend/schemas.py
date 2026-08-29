from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from .config import DEFAULT_GROQ_MODEL

# Ingestion Schemas
class DocumentUploadResponse(BaseModel):
    filename: str
    file_type: str
    status: str
    message: str

# RAG Pipeline Schemas
class QueryRequest(BaseModel):
    query: str = Field(..., example="What vector database does OmniContext use?")
    top_k: int = Field(default=3, ge=1, le=10, description="Number of context chunks to retrieve")
    file_type_filter: Optional[str] = Field(None, example=".pdf", description="Optional file extension filter")
    model: str = Field(default=DEFAULT_GROQ_MODEL, description="Groq model ID")
    temperature: float = Field(default=0.2, ge=0.0, le=1.0)
    stream: bool = Field(default=True, description="Stream output tokens via SSE/chunked response")

# RAG Pipeline Response Schemas
class QueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[Dict[str, Any]]
    chunks_retrieved: int
    
# Batch Document Upload Response Schema    
class BatchDocumentUploadResponse(BaseModel):
    total_files: int
    successful_files: int
    failed_files: int
    details: List[DocumentUploadResponse]