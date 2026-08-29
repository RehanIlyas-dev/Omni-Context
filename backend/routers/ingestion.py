import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from backend.config import ALLOWED_EXTENSIONS
from backend.schemas import DocumentUploadResponse, BatchDocumentUploadResponse
from backend import state

ingestion_router = APIRouter(tags=["Ingestion"])


@ingestion_router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(file: UploadFile = File(...)):
    # Upload a file, validate it, and ingest it into ChromaDB.
    if not state.ingestor:
        raise HTTPException(status_code=500, detail="Ingestion engine not initialized.")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file_ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    safe_name = f"{uuid.uuid4().hex}{file_ext}"
    temp_file_path = state.UPLOAD_DIR / safe_name
    try:
        with temp_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        await run_in_threadpool(state.ingestor.ingest_file, str(temp_file_path))

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


@ingestion_router.post(
    "/upload/batch",
    response_model=BatchDocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_batch_documents(files: List[UploadFile] = File(...)):
    
    # Upload multiple files, validate them, and ingest them into ChromaDB in batch.
    if not state.ingestor:
        raise HTTPException(status_code=500, detail="Ingestion engine not initialized.")

    if not files:
        raise HTTPException(status_code=400, detail="No files provided in request.")

    saved_temp_paths = []
    details = []

    try:
        # Step 1: Validate and save all incoming files locally (uuid-named).
        for file in files:
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in ALLOWED_EXTENSIONS:
                details.append(
                    DocumentUploadResponse(
                        filename=file.filename,
                        file_type=file_ext,
                        status="skipped",
                        message=f"Unsupported format '{file_ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
                    )
                )
                continue

            safe_name = f"{uuid.uuid4().hex}{file_ext}"
            temp_file_path = state.UPLOAD_DIR / safe_name
            with temp_file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_temp_paths.append(str(temp_file_path))

        # Step 2: Batch ingest valid files into ChromaDB off the event loop.
        if saved_temp_paths:
            batch_results = await run_in_threadpool(
                state.ingestor.ingest_files, saved_temp_paths
            )
            for res in batch_results:
                details.append(DocumentUploadResponse(**res))

        # Step 3: Compute summary statistics.
        successful = sum(1 for d in details if d.status == "success")
        failed = sum(1 for d in details if d.status in ("failed", "skipped"))

        return BatchDocumentUploadResponse(
            total_files=len(files),
            successful_files=successful,
            failed_files=failed,
            details=details,
        )
    finally:
        # Step 4: Clean up temporary files from server disk.
        for temp_path_str in saved_temp_paths:
            path_obj = Path(temp_path_str)
            if path_obj.exists():
                path_obj.unlink()
