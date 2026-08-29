from dataclasses import dataclass
from typing import Optional
from pathlib import Path
import chromadb
from fastembed import TextEmbedding

@dataclass
class RetrievalResult:

    # Data class to hold the retrieval result for a single chunk. It also ensures that the data is structured and easily accessible.
    chunk_id: str
    text: str
    distance: float
    source: str
    file_type: str
    chunk_index: int

BASE_DIR = Path(__file__).resolve().parent.parent
    
class VectorRetriever:
    def __init__(
        self,
        db_path: str = None,
        collection_name: str = "omni_context",
        score_threshold: float = 0.7,
    ):
        self.db_path = db_path or str(BASE_DIR / "chroma_db")
        self.collection_name = collection_name
        self.score_threshold = score_threshold

        # Load Local Embedding Engine
        print("Loading embedding model for retrieval (BAAI/bge-small-en-v1.5)...")
        self.embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

        # Connect to existing ChromaDB collection
        self.client = chromadb.PersistentClient(path=self.db_path)
        self.collection = self.client.get_collection(name=self.collection_name)

    def retrieve(
        self,
        query: str,
        top_k: int = 3,
        file_type_filter: Optional[str] = None
    ) -> list[RetrievalResult]:
        
        # Convert query to vector, perform similarity search in ChromaDB and return structured results as a list of RetrievalResult objects.
        if not query.strip():
            return []

        # Vectorize Query String
        query_vector = list(self.embedding_model.embed([query]))[0].tolist()

        # Configure Optional Metadata Filters
        where_clause = None
        if file_type_filter:
            where_clause = {"file_type": file_type_filter.lower()}

        # Vector Similarity Search
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=top_k,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )

        # Extract parallel result lists from ChromaDB response
        ids = results["ids"][0] if results["ids"] else []
        documents = results["documents"][0] if results["documents"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []
        distances = results["distances"][0] if results["distances"] else []

        retrieved_items: list[RetrievalResult] = []

        # Filter by Distance Score Threshold
        for chunk_id, doc, meta, dist in zip(ids, documents, metadatas, distances):
            if dist <= self.score_threshold:
                retrieved_items.append(
                    RetrievalResult(
                        chunk_id=chunk_id,
                        text=doc,
                        distance=round(dist, 4),
                        source=meta.get("source", "unknown"),
                        file_type=meta.get("file_type", "unknown"),
                        chunk_index=meta.get("chunk_index", -1),
                    )
                )
            else:
                print(f"[Filtered Out] Chunk '{chunk_id[:8]}' distance ({dist:.4f}) exceeded threshold ({self.score_threshold})")

        return retrieved_items