const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getSessionId() {
  let sid = localStorage.getItem("omni_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("omni_session_id", sid);
  }
  return sid;
}

export function clearSession() {
  localStorage.removeItem("omni_session_id");
}

function sessionHeaders(extra = {}) {
  return { "X-Session-ID": getSessionId(), ...extra };
}

export async function uploadDocuments(files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/upload/batch`, {
    method: "POST",
    headers: sessionHeaders(),
    body: formData,
  });

  if (!response.ok) throw new Error("Upload failed");
  return response.json();
}

export async function streamChatQuery(query, onChunk, onMetaData) {
  const response = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: sessionHeaders({ "Content-Type": "application/json" }),
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

export async function fetchDocuments() {
  const response = await fetch(`${API_BASE}/documents`, {
    headers: sessionHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch documents");
  return response.json();
}

export async function fetchDocumentChunks(filename) {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}/chunks`, {
    headers: sessionHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch chunks");
  return response.json();
}
