from pathlib import Path
from typing import Optional

from backend.ingest import DocumentIngestor
from backend.pipeline import RAGPipeline

# Shared backend instances, populated during application startup (lifespan).
ingestor: Optional[DocumentIngestor] = None
pipeline: Optional[RAGPipeline] = None

# Directory for temporarily staging uploaded files before ingestion.
UPLOAD_DIR = Path("./data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)