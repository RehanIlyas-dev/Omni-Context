import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.llm import LLMHandler

def test_prompt_formatting():
    handler = LLMHandler()
    mock_chunks = [
        {"text": "FastAPI is a modern web framework for Python.", "source": "docs/fastapi.txt"},
        {"text": "Qdrant is a vector similarity search engine.", "source": "docs/qdrant.txt"}
    ]
    
    messages = handler.build_messages("What is FastAPI?", mock_chunks)
    print("=== Built Prompt Structure ===")
    print(messages[1]["content"])
    assert "--- [Doc 1 | Source: docs/fastapi.txt] ---" in messages[1]["content"]
    print("Prompt formatting test passed!\n")

def test_generation():
    handler = LLMHandler(default_provider="groq")
    mock_chunks = [
        "Omni-Context uses hybrid retrieval combining dense vectors and BM25 sparse lexical search."
    ]
    query = "How does Omni-Context perform search?"

    print("=== Testing Groq Non-Streaming Generation ===")
    if os.getenv("GROQ_API_KEY"):
        try:
            response = handler.generate(query, mock_chunks, provider="groq")
            print(f"Response:\n{response}\n")
        except Exception as e:
            print(f"Groq live call skipped or failed (check API key / model access): {e}")
    else:
        print("GROQ_API_KEY not found in environment. Skipping live Groq API call.\n")

    print("=== Testing Groq Streaming Generation ===")
    if os.getenv("GROQ_API_KEY"):
        try:
            stream = handler.generate(query, mock_chunks, provider="groq", stream=True)
            print("Streaming response: ", end="")
            for chunk in stream:
                print(chunk, end="", flush=True)
            print("\n")
        except Exception as e:
            print(f"Groq streaming skipped or failed (check API key / model access): {e}")
    else:
        print("GROQ_API_KEY not found in environment. Skipping live Groq streaming call.\n")

def test_generation_mocked():
    """Verify generate() wires context -> LLM and returns the model text, without a live API key."""
    handler = LLMHandler(default_provider="groq")

    class _Msg:
        def __init__(self, content):
            self.content = content

    class _Choice:
        def __init__(self, content):
            self.message = _Msg(content)

    class _Resp:
        def __init__(self, content):
            self.choices = [_Choice(content)]

    class _Completions:
        def create(self, **kwargs):
            return _Resp("Omni-Context uses ChromaDB for vector storage.")

    class _Chat:
        completions = _Completions()

    class _Client:
        chat = _Chat()

    # Bypass lazy real-client creation / API key requirement
    handler._groq_client = _Client()

    chunks = [{"text": "Omni-Context uses ChromaDB for vector storage.", "source": "docs/x.txt"}]
    out = handler.generate("What vector DB is used?", chunks, provider="groq")
    assert isinstance(out, str)
    assert "ChromaDB" in out

    # Streaming path
    class _Delta:
        def __init__(self, content):
            self.content = content

    class _SChoice:
        def __init__(self, content):
            self.delta = _Delta(content)

    class _SChunk:
        def __init__(self, content):
            self.choices = [_SChoice(content)]

    class _SCompletions:
        def create(self, **kwargs):
            return iter([_SChunk("Omni-Context "), _SChunk("uses ChromaDB.")])

    class _SChat:
        completions = _SCompletions()

    class _SClient:
        chat = _SChat()

    handler._groq_client = _SClient()
    stream = handler.generate("What vector DB is used?", chunks, provider="groq", stream=True)
    joined = "".join(stream)
    assert "ChromaDB" in joined


if __name__ == "__main__":
    test_prompt_formatting()
    test_generation()
    test_generation_mocked()