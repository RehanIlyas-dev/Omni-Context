const API_BASE = "/api";

// Uploads multiple documents to the backend and returns the result.
export async function uploadDocuments(files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/upload/batch`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Upload failed");
  return response.json();
}

// Streams a chat query to the backend and invokes callbacks for each chunk of data received.
export async function streamChatQuery(query, onChunk, onMetaData) {
  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, stream: true }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Streaming failed");
  }

  const metaHeader = response.headers.get("X-Rag-Meta");
  if (metaHeader) {
    try {
      const meta = JSON.parse(metaHeader);
      onMetaData(meta.sources, false);
    } catch { /* ignore malformed header */ }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

// Fetches the list of all ingested documents from the backend.
export async function fetchDocuments() {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) throw new Error("Failed to fetch documents");
  return response.json();
}

// Fetches chunks for a specific document by filename.
export async function fetchDocumentChunks(filename) {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}/chunks`);
  if (!response.ok) throw new Error("Failed to fetch chunks");
  return response.json();
}
