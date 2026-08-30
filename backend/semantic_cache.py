import json
import logging
import uuid
import numpy as np
from typing import Optional, Dict, Any
from fastembed import TextEmbedding
from redisvl.index import SearchIndex
from redisvl.query import VectorQuery

logger = logging.getLogger(__name__)


class RedisSemanticCache:

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        index_name: str = "rag_semantic_cache",
        distance_threshold: float = 0.12, # Cosine distance threshold
        ttl: int = 86400, # Time-to-live for cached entries in seconds (default: 1 day)
    ):
        self.distance_threshold = distance_threshold
        self.ttl = ttl
        self.connected = False
        self.index_name = index_name

        # Initialize the embedding model
        self.embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")

        schema = {
            "index": {"name": index_name, "prefix": "cache"},
            "fields": [
                {"name": "prompt", "type": "text"},
                {"name": "response_json", "type": "text"},
                {
                    "name": "prompt_vector",
                    "type": "vector",
                    "attrs": {
                        "dims": 384,
                        "distance_metric": "cosine",
                        "algorithm": "hnsw",
                    },
                },
            ],
        }

        try:
            self.index = SearchIndex.from_dict(schema)
            self.index.connect(redis_url)
            self.index.create(overwrite=False)
            self.connected = True
            logger.info("[CACHE] Redis semantic cache connected successfully.")
        except Exception as e:
            logger.warning(f"[CACHE] Redis unavailable, cache disabled: {e}")
            self.index = None

    def _embed_text(self, text: str) -> np.ndarray:
        embeddings = list(self.embedder.embed([text.strip().lower()]))
        return np.array(embeddings[0], dtype=np.float32) 

    def get(self, query: str) -> Optional[Dict[str, Any]]:
        if not self.connected:
            return None

        try:
            query_vector = self._embed_text(query)

            v_query = VectorQuery(
                vector=query_vector.tolist(),
                vector_field_name="prompt_vector",
                return_fields=["prompt", "response_json", "vector_distance"],
                num_results=1,
            )

            results = self.index.query(v_query)

            if results and len(results) > 0:
                top_match = results[0]
                vector_distance = float(top_match.get("vector_distance", 1.0))

                if vector_distance <= self.distance_threshold:
                    logger.info(
                        f"[CACHE HIT] Similarity: {round((1 - vector_distance) * 100, 2)}% "
                        f"| Matched Query: '{top_match['prompt']}'"
                    )
                    cached_payload = json.loads(top_match["response_json"])
                    cached_payload["cached"] = True
                    cached_payload["similarity_score"] = round(1 - vector_distance, 4)
                    return cached_payload

            logger.info("[CACHE MISS] Executing standard ChromaDB + Groq pipeline.")
            return None
        except Exception as e:
            logger.warning(f"[CACHE] Get failed, falling through: {e}")
            return None

    def set(self, query: str, response_payload: Dict[str, Any]):
        if not self.connected:
            return

        try:
            query_vector = self._embed_text(query)

            key = f"cache:{uuid.uuid4().hex[:12]}"
            self.index.client.hset(key, mapping={
                "prompt": query.strip(),
                "response_json": json.dumps(response_payload),
                "prompt_vector": query_vector.tobytes(),
            })
            if self.ttl:
                self.index.client.expire(key, self.ttl)
        except Exception as e:
            logger.warning(f"[CACHE] Set failed: {e}")

    def clear(self):
        if self.connected:
            self.index.clear()
