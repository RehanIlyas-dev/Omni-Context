from pathlib import Path
import sys
import chromadb

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.config import CHROMA_DB_PATH, COLLECTION_NAME


def inspect_chroma_db(db_path: str = None, collection_name: str = None):
    db_path = db_path or str(CHROMA_DB_PATH)
    collection_name = collection_name or COLLECTION_NAME
    db_directory = Path(db_path)
    if not db_directory.exists():
        print(f"Error: Database directory '{db_path}' does not exist. Run ingest.py first.")
        return

    # Connect to local persistent ChromaDB
    client = chromadb.PersistentClient(path=db_path)

    # Get target collection
    try:
        collection = client.get_collection(name=collection_name)
    except ValueError:
        print(f"Collection '{collection_name}' not found in database.")
        return

    # Print record counts
    total_records = collection.count()
    print("=" * 60)
    print(f" DATABASE STATS | Collection: '{collection_name}'")
    print(f" Total Stored Vector Chunks: {total_records}")
    print("=" * 60)

    if total_records == 0:
        print("Collection is empty.")
        return

    # Fetch stored records (documents, metadata, embeddings)
    # Using collection.get() to retrieve records without running similarity search
    results = collection.get(
        include=["documents", "metadatas", "embeddings"],
        limit=5  # Display first 5 chunks for sample view
    )

    ids = results["ids"]
    docs = results["documents"]
    metadatas = results["metadatas"]
    embeddings = results["embeddings"]

    print("\nSAMPLE RECORD INSPECTION (First 5 records):\n")

    for idx, (chunk_id, doc, meta) in enumerate(zip(ids, docs, metadatas), start=1):
        embedding_dim = len(embeddings[idx - 1]) if embeddings is not None else "N/A"
        
        print(f"--- [ Chunk #{idx} ] ---")
        print(f"ID           : {chunk_id}")
        print(f"Source File  : {meta.get('source', 'N/A')}")
        print(f"File Type    : {meta.get('file_type', 'N/A')}")
        print(f"Chunk Index  : {meta.get('chunk_index', 'N/A')}")
        print(f"Vector Dim   : {embedding_dim} float values")
        print(f"Text Content :\n\"{doc[:150]}...\"\n")


if __name__ == "__main__":
    inspect_chroma_db()