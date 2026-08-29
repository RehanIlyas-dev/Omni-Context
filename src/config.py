from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

CHROMA_DB_PATH = str(BASE_DIR / "chroma_db")
COLLECTION_NAME = "omni_context"

EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"
DEFAULT_GROQ_MODEL = "qwen/qwen3.6-27b"
DEFAULT_SCORE_THRESHOLD = 0.4

ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf", ".pptx", ".ppt", ".docx", ".doc"}
