import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.retriever import VectorRetriever

def test_retrieval():
    print("=" * 60)
    print(" TESTING OMNICONTEXT RETRIEVER")
    print("=" * 60)

    # Initialize retriever with distance threshold = 1.2
    retriever = VectorRetriever(db_path="./chroma_db", score_threshold=0.7)

    # Test Query 1: Relevant Query
    query_1 = "What is OmniContext and what vector database does it use?"
    print(f"\n[Test 1] Query: '{query_1}'")
    results_1 = retriever.retrieve(query=query_1, top_k=3)

    print(f"Retrieved {len(results_1)} relevant chunk(s):")
    for i, res in enumerate(results_1, start=1):
        print(f"\n  Match #{i}:")
        print(f"  - Distance Score : {res.distance} (Lower = Better)")
        print(f"  - Source Document: {res.source} ({res.file_type})")
        print(f"  - Chunk Text     : \"{res.text}\"")

    # Test Query 2: Irrelevant / Out of Scope Query (Testing Threshold Filtering)
    query_2 = "What is the capital of France and how to bake chocolate cake?"
    print(f"\n" + "-" * 60)
    print(f"[Test 2] Query: '{query_2}' (Out-of-scope query)")
    results_2 = retriever.retrieve(query=query_2, top_k=3)

    print(f"Retrieved {len(results_2)} relevant chunk(s) after thresholding.")

if __name__ == "__main__":
    test_retrieval()