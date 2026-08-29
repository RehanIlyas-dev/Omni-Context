import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.pipeline import RAGPipeline
from backend.config import DEFAULT_SCORE_THRESHOLD


def test_rag_pipeline():
    print("=" * 60)
    print(" TESTING END-TO-END GROQ RAG PIPELINE")
    print("=" * 60)

    # Ensure GROQ_API_KEY is available before running
    if not os.getenv("GROQ_API_KEY"):
        print("\n[ERROR] GROQ_API_KEY environment variable is missing!")
        print("Set your API key before running: export GROQ_API_KEY='your-key-here'")
        return

    # Initialize RAG Pipeline (Defaults to Groq model from config: qwen/qwen3.6-27b)
    pipeline = RAGPipeline(
        db_path="./chroma_db",
        score_threshold=DEFAULT_SCORE_THRESHOLD,
        model="qwen/qwen3.6-27b"
    )

   # Test Case 1: In-Scope Query (Non-Streaming)
    query_1 = "What vector database and embedding model does OmniContext use?"
    print(f"\n[Test 1] Query: '{query_1}'")

    response_1 = pipeline.run(query=query_1, top_k=3, stream=False)
    assert response_1.chunks_retrieved >= 1, "In-scope query should retrieve at least one chunk"
    assert isinstance(response_1.answer, str), "Non-streaming answer should be a string"

    print(f"Chunks Retrieved : {response_1.chunks_retrieved}")
    print(f"Sources Used     : {response_1.sources}")
    print(f"Generated Answer :\n{response_1.answer}\n")

    # Test Case 2: In-Scope Query (Streaming)
    query_2 = "Summarize the primary purpose of OmniContext."
    print("-" * 60)
    print(f"[Test 2 - Streaming] Query: '{query_2}'")

    response_2 = pipeline.run(query=query_2, top_k=3, stream=True)

    print(f"Chunks Retrieved : {response_2.chunks_retrieved}")
    print("Streaming Answer : ", end="", flush=True)
    
    # Iterate over stream generator chunks from Groq API
    for chunk in response_2.answer:
        print(chunk, end="", flush=True)
    print("\n\n")

   # Test Case 3: Out-of-Scope Query (Expecting No Relevant Chunks)
    query_3 = "How do you construct a commercial airplane engine?"
    print("-" * 60)
    print(f"[Test 3] Query: '{query_3}' (Out-of-scope query)")

    response_3 = pipeline.run(query=query_3, top_k=3, stream=False)
    assert response_3.chunks_retrieved == 0, "Out-of-scope query should retrieve 0 chunks"

    print(f"Chunks Retrieved : {response_3.chunks_retrieved}")
    print(f"Generated Answer :\n{response_3.answer}\n")


if __name__ == "__main__":
    test_rag_pipeline()