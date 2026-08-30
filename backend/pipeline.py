from dataclasses import dataclass
from typing import List, Dict, Any, Union, Generator, Optional
from .retriever import VectorRetriever, RetrievalResult
from .semantic_cache import RedisSemanticCache
from .llm import LLMHandler
from .config import (
    CHROMA_DB_PATH,
    COLLECTION_NAME,
    DEFAULT_GROQ_MODEL,
    DEFAULT_SCORE_THRESHOLD,
)


@dataclass
class RAGResponse:
    query: str
    answer: Union[str, Generator[str, None, None]]
    sources: List[Dict[str, Any]]
    chunks_retrieved: int
    cached: bool = False
    similarity_score: Optional[float] = None


class RAGPipeline:
    def __init__(
        self,
        db_path: str = CHROMA_DB_PATH,
        collection_name: str = COLLECTION_NAME,
        score_threshold: float = DEFAULT_SCORE_THRESHOLD,
        model: str = DEFAULT_GROQ_MODEL,
        client=None,
        cache: Optional[RedisSemanticCache] = None,
    ):
        self.retriever = VectorRetriever(
            db_path=db_path,
            collection_name=collection_name,
            score_threshold=score_threshold,
            client=client,
        )

        self.llm = LLMHandler(groq_model=model)
        self.cache = cache

    def run(
        self,
        query: str,
        top_k: int = 3,
        file_type_filter: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        stream: bool = True,
    ) -> RAGResponse:
        # Step 0: Check semantic cache (skip if filtering or streaming — cached
        # answer is a plain string, but streaming callers expect a generator)
        if self.cache and not file_type_filter:
            cached = self.cache.get(query)
            if cached:
                answer_text = cached["answer"]
                if stream:
                    def cached_stream():
                        yield answer_text
                    return RAGResponse(
                        query=query,
                        answer=cached_stream(),
                        sources=cached.get("sources", []),
                        chunks_retrieved=cached.get("chunks_retrieved", 0),
                        cached=True,
                        similarity_score=cached.get("similarity_score"),
                    )
                return RAGResponse(
                    query=query,
                    answer=answer_text,
                    sources=cached.get("sources", []),
                    chunks_retrieved=cached.get("chunks_retrieved", 0),
                    cached=True,
                    similarity_score=cached.get("similarity_score"),
                )

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
                "score": round(1 - res.distance, 4),
                "content": res.text,
                "chunk_index": res.chunk_index,
            }
            for res in retrieved_results
        ]

        # Step 3: Handle Empty Context
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

        # Step 5: Cache the result (only non-stream; streaming generators
        # are not serializable — callers will get a cache miss next time
        # for that exact query until a non-stream request populates it)
        if self.cache and not stream:
            self.cache.set(query, {
                "query": query,
                "answer": answer,
                "sources": sources,
                "chunks_retrieved": len(sources),
            })

        return RAGResponse(
            query=query,
            answer=answer,
            sources=sources,
            chunks_retrieved=len(sources),
        )
