from dataclasses import dataclass
from typing import List, Dict, Any, Union, Generator, Optional
from .retriever import VectorRetriever, RetrievalResult
from .llm import LLMHandler
from .config import (
    CHROMA_DB_PATH,
    COLLECTION_NAME,
    DEFAULT_GROQ_MODEL,
    DEFAULT_SCORE_THRESHOLD,
)


@dataclass
class RAGResponse:
    """Structured container for end-to-end RAG pipeline results."""
    query: str
    answer: Union[str, Generator[str, None, None]]
    sources: List[Dict[str, Any]]
    chunks_retrieved: int


class RAGPipeline:
    def __init__(
        self,
        db_path: str = CHROMA_DB_PATH,
        collection_name: str = COLLECTION_NAME,
        score_threshold: float = DEFAULT_SCORE_THRESHOLD,
        model: str = DEFAULT_GROQ_MODEL,
        client=None,
    ):
        # 1. Initialize Retrieval Engine
        self.retriever = VectorRetriever(
            db_path=db_path,
            collection_name=collection_name,
            score_threshold=score_threshold,
            client=client,
        )

        # 2. Initialize LLM Engine (Groq execution)
        self.llm = LLMHandler(groq_model=model)

    def run(
        self,
        query: str,
        top_k: int = 3,
        file_type_filter: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        stream: bool = False,
    ) -> RAGResponse:
        """Executes full RAG workflow: Vector Search -> Grounded Groq Generation."""
        
        # Step 1: Vector Similarity Search
        retrieved_results: List[RetrievalResult] = self.retriever.retrieve(
            query=query,
            top_k=top_k,
            file_type_filter=file_type_filter,
        )

        # Step 2: Format Chunks & Source Metadata
        formatted_chunks = [
            {
                "text": res.text,
                "source": res.source,
                "distance": res.distance,
                "file_type": res.file_type,
                "chunk_index": res.chunk_index,
            }
            for res in retrieved_results
        ]

        sources = [
            {
                "source": res.source,
                "file_type": res.file_type,
                "distance": res.distance,
                "chunk_index": res.chunk_index,
            }
            for res in retrieved_results
        ]

        # Step 3: Handle Empty Context (Short-Circuit)
        if not formatted_chunks:
            fallback_text = (
                "I cannot answer this question based on the provided documents "
                "(no relevant context matched your query within the required threshold)."
            )
            if stream:
                def empty_generator():
                    yield fallback_text
                return RAGResponse(
                    query=query,
                    answer=empty_generator(),
                    sources=[],
                    chunks_retrieved=0,
                )
            return RAGResponse(
                query=query,
                answer=fallback_text,
                sources=[],
                chunks_retrieved=0,
            )

        # Step 4: Context Injection & Groq LLM Generation
        answer = self.llm.generate(
            query=query,
            context_chunks=formatted_chunks,
            model=model,
            temperature=temperature,
            stream=stream,
        )

        return RAGResponse(
            query=query,
            answer=answer,
            sources=sources,
            chunks_retrieved=len(sources),
        )