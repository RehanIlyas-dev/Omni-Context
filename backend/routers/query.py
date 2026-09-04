import json
import os

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse

from backend.schemas import QueryRequest, QueryResponse
from backend import state

query_router = APIRouter(tags=["RAG Chain"])


@query_router.post("/query")
def query_rag(request: QueryRequest, x_session_id: str = Header(default="default")):
    # Executes vector retrieval and generates a grounded response using Groq
    if not state.pipeline:
        raise HTTPException(status_code=500, detail="RAG Pipeline not initialized.")

    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY environment variable missing on server.",
        )

    try:
        if request.stream:
            rag_response = state.pipeline.run(
                query=request.query,
                top_k=request.top_k,
                file_type_filter=request.file_type_filter,
                model=request.model,
                temperature=request.temperature,
                stream=True,
                session_id=x_session_id,
            )

            def stream_response_wrapper():
                for chunk in rag_response.answer:
                    yield chunk

            # Retrieval metadata is available before streaming starts; expose it
            # as a header so the client still gets citations while streaming.
            meta = {
                "query": rag_response.query,
                "chunks_retrieved": rag_response.chunks_retrieved,
                "sources": rag_response.sources,
            }
            headers = {"X-Rag-Meta": json.dumps(meta, ensure_ascii=True)}
            return StreamingResponse(
                stream_response_wrapper(), media_type="text/plain", headers=headers
            )

        rag_response = state.pipeline.run(
            query=request.query,
            top_k=request.top_k,
            file_type_filter=request.file_type_filter,
            model=request.model,
            temperature=request.temperature,
            stream=False,
            session_id=x_session_id,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Generation failed: {str(e)}")

    return QueryResponse(
        query=rag_response.query,
        answer=str(rag_response.answer),
        sources=rag_response.sources,
        chunks_retrieved=rag_response.chunks_retrieved,
        cached=rag_response.cached,
        similarity_score=rag_response.similarity_score,
    )
