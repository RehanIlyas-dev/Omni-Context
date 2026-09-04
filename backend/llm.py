import os
import re
from typing import List, Dict, Any, Generator, Union, Optional
from dotenv import load_dotenv
from groq import Groq

from .config import DEFAULT_GROQ_MODEL

load_dotenv()

DEFAULT_SYSTEM_PROMPT = """You are an accurate, grounded AI assistant answering questions based on the retrieved context documents provided below.

Rules:
1. Base your answer strictly on the provided Context. Do not make up information or introduce external facts not present in the context.
2. If the answer cannot be found in the provided context, state clearly: "I cannot answer this question based on the provided documents."
3. Keep your response clear, concise, and structured. Use Markdown bullet points or numbered lists where appropriate.
4. Cite context sources using [Doc X] when referencing specific facts.
"""

_THINK_RE = re.compile(r"<think>.*?(?:</think>|</think>|$)", re.DOTALL | re.IGNORECASE)

def _strip_think(text: str) -> str:
    # Remove thinking from the LLM response. If the entire response is inside
    # think tags (common with Qwen 3 models), keep the inner content instead
    # of returning empty.
    if not text:
        return text
    stripped = _THINK_RE.sub("", text).strip()
    if stripped:
        return stripped
    # Entire response was inside think tags — extract the inner content
    inner = re.search(r"<think>(.*?)$", text, re.DOTALL | re.IGNORECASE)
    if inner:
        return inner.group(1).strip()
    return text.strip()


class LLMHandler:

    # Interface for interacting with the Groq Cloud LLM provider to generate responses based on retrieved context.
    def __init__(
        self,
        default_provider: str = "groq",
        groq_model: str = DEFAULT_GROQ_MODEL,
        system_prompt: Optional[str] = None,
    ):
        self.default_provider = default_provider.lower()
        self.groq_model = groq_model
        self.system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT

        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self._groq_client = None

    @property
    def groq_client(self) -> Groq:
        """Lazy initialization for the Groq client."""
        if self._groq_client is None:
            if not self.groq_api_key:
                raise ValueError(
                    "GROQ_API_KEY environment variable is not set. Set it to use the Groq provider."
                )
            self._groq_client = Groq(api_key=self.groq_api_key, max_retries=0)
        return self._groq_client

    def format_context(self, context_chunks: List[Union[Dict[str, Any], str]]) -> str:
        
        # Turn the list of retrieved chunks to a readable string format
        formatted_blocks = []
        for idx, chunk in enumerate(context_chunks, 1):
            if isinstance(chunk, dict):
                content = chunk.get("text") or chunk.get("content") or str(chunk)
                source = (
                    chunk.get("source")
                    or chunk.get("metadata", {}).get("source")
                    or f"Document {idx}"
                )
                formatted_blocks.append(
                    f"--- [Doc {idx} | Source: {source}] ---\n{content.strip()}"
                )
            else:
                formatted_blocks.append(f"--- [Doc {idx}] ---\n{str(chunk).strip()}")

        return "\n\n".join(formatted_blocks)

    def build_messages(
        self, query: str, context_chunks: List[Union[Dict[str, Any], str]]
    ) -> List[Dict[str, str]]:
        
        # Constructs the message payload for the LLM, combining system prompt, formatted context, and user query.
        formatted_context = self.format_context(context_chunks)
        user_content = f"Context:\n{formatted_context}\n\nUser Question:\n{query}"

        return [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_content},
        ]

    def generate(
        self,
        query: str,
        context_chunks: List[Union[Dict[str, Any], str]],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.2,
        stream: bool = False,
    ) -> Union[str, Generator[str, None, None]]:
    
        # Generates the completion using retrieved chunks and the Groq LLM provider.
        selected_provider = (provider or self.default_provider).lower()
        messages = self.build_messages(query, context_chunks)

        if selected_provider == "groq":
            target_model = model or self.groq_model
            return self._generate_groq(
                messages, model=target_model, temperature=temperature, stream=stream
            )
        else:
            raise ValueError(
                f"Unsupported provider '{selected_provider}'. Only 'groq' is supported."
            )

    def _generate_groq(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        stream: bool,
    ) -> Union[str, Generator[str, None, None]]:
        """Interfaces with Groq Cloud API."""
        response = self.groq_client.chat.completions.create(
            model=model, messages=messages, temperature=temperature, stream=stream,
            max_tokens=512,
        )

        if stream:
            def chunk_generator():
                buf = ""
                think_content = ""
                in_think = False
                yielded_any = False
                for chunk in response:
                    delta = chunk.choices[0].delta.content
                    if not delta:
                        continue
                    if not in_think and "<think" in delta:
                        in_think = True
                    if in_think:
                        buf += delta
                        close_tag = (
                            "</think:6124c78e>" if "</think:6124c78e>" in buf
                            else ("</think>" if "</think>" in buf else None)
                        )
                        if close_tag:
                            think_content = buf[:buf.find(close_tag)]
                            rest = buf[buf.find(close_tag) + len(close_tag):]
                            if rest:
                                yielded_any = True
                                yield rest
                            in_think = False
                            buf = ""
                    else:
                        yielded_any = True
                        yield delta
                # If nothing was yielded outside think tags, yield the fallback.
                # think_content is set when </think> is found; buf holds the
                # unclosed think text when the stream ends mid-think.
                fallback = think_content or buf
                if not yielded_any and fallback:
                    cleaned = re.sub(r"<think.*?>", "", fallback, flags=re.DOTALL | re.IGNORECASE).strip()
                    if cleaned:
                        yield cleaned

            return chunk_generator()
        else:
            return _strip_think(response.choices[0].message.content)