import { useState, useRef, useEffect } from 'react';
import {
  UploadCloud, Send, FileText, Database, ShieldCheck, Zap,
  CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  Loader2, Clock, ArrowLeft, Hash
} from 'lucide-react';
import {
  streamChatQuery, uploadDocuments, fetchDocuments, fetchDocumentChunks
} from './services/api';

function UploadCard({ file, status }) {
  const icon = {
    done: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    uploading: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
  }[status] || <FileText className="w-4 h-4 text-slate-500" />;

  const badge = {
    done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    uploading: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  }[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  const ext = file.name.split('.').pop().toUpperCase();
  const size = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-200 truncate">{file.name}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{ext} · {size}</p>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge}`}>
        {status === 'done' ? 'Indexed' : status === 'uploading' ? 'Ingesting…' : status === 'error' ? 'Failed' : 'Pending'}
      </span>
    </div>
  );
}

function SourceCard({ src, index }) {
  const scorePercent = (src.score * 100).toFixed(0);
  const barColor = src.score >= 0.7 ? 'bg-emerald-400' : src.score >= 0.4 ? 'bg-amber-400' : 'bg-slate-500';

  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2.5 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold flex items-center justify-center ring-1 ring-blue-500/20">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{src.source}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{src.file_type || 'document'}</p>
          </div>
        </div>
        <span className="flex-shrink-0 text-[10px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md">
          {scorePercent}%
        </span>
      </div>
      <div className="relative h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${barColor}`} style={{ width: `${scorePercent}%` }} />
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400 line-clamp-3 italic">{src.content}</p>
    </div>
  );
}

function DocumentRow({ doc, isSelected, onClick }) {
  const ext = doc.file_type.replace('.', '').toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-blue-500/10 ring-1 ring-blue-500/20'
          : 'hover:bg-white/[0.04] ring-1 ring-transparent'
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isSelected ? 'bg-blue-500/15' : 'bg-white/[0.04]'
      }`}>
        <FileText className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isSelected ? 'text-blue-200' : 'text-slate-300'}`}>
          {doc.filename}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {ext} · {doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  );
}

function ChunkCard({ chunk }) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <Hash className="w-3 h-3" />
          Chunk {chunk.chunk_index + 1}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">{chunk.content}</p>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const [uploadStatuses, setUploadStatuses] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docChunks, setDocChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments()
      .then((data) => setDocuments(data.documents || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDocClick = async (doc) => {
    if (selectedDoc?.filename === doc.filename) {
      setSelectedDoc(null);
      setDocChunks([]);
      return;
    }
    setSelectedDoc(doc);
    setLoadingChunks(true);
    setActiveSources([]);
    try {
      const data = await fetchDocumentChunks(doc.filename);
      setDocChunks(data.chunks || []);
    } catch {
      setDocChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleFiles = async (files) => {
    if (!files.length) return;
    const fileList = Array.from(files);
    setUploadStatuses(fileList.map((f) => ({ file: f, status: 'uploading' })));

    try {
      const result = await uploadDocuments(files);
      const perFile = result.details || [];
      setUploadStatuses((prev) =>
        prev.map((entry, i) => {
          const r = perFile[i];
          return {
            ...entry,
            status: r?.status === 'success' ? 'done' : 'error',
          };
        })
      );
      fetchDocuments()
        .then((data) => setDocuments(data.documents || []))
        .catch(() => {});
    } catch {
      setUploadStatuses((prev) => prev.map((e) => ({ ...e, status: 'error' })));
    }

    setTimeout(() => setUploadStatuses([]), 5000);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSend = async () => {
    if (!inputQuery.trim() || isProcessing) return;

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    const userMessage = { id: userMsgId, sender: 'user', text: inputQuery };
    const initialAssistantMessage = {
      id: assistantMsgId, sender: 'assistant', text: '', isStreaming: true, sources: [], cached: false,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInputQuery('');
    setIsProcessing(true);
    setSelectedDoc(null);
    setDocChunks([]);

    try {
      await streamChatQuery(
        inputQuery,
        (token) => {
          setMessages((prev) =>
            prev.map((msg) => msg.id === assistantMsgId ? { ...msg, text: msg.text + token } : msg)
          );
        },
        (sources, cached) => {
          setMessages((prev) =>
            prev.map((msg) => msg.id === assistantMsgId
              ? { ...msg, sources, cached, isStreaming: false }
              : msg
            )
          );
          setActiveSources(sources || []);
        }
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg) => msg.id === assistantMsgId
          ? { ...msg, text: 'Failed to connect to the backend. Please try again.', isStreaming: false }
          : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const rightPanelMode = selectedDoc ? 'chunks' : 'sources';

  return (
    <div className="flex h-screen bg-[#0a0b0e] text-slate-200 font-sans antialiased selection:bg-blue-500/20 selection:text-blue-200">
      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="w-72 flex-shrink-0 border-r border-white/[0.06] bg-[#0d0e12] flex flex-col">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-100 tracking-tight">OmniContext</h1>
              <p className="text-[10px] text-slate-500 font-medium">RAG Engine</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2.5">Upload</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-xl p-5 text-center transition-all cursor-pointer group ${
                isDragging
                  ? 'bg-blue-500/5 ring-2 ring-blue-500/30 border-blue-500/30'
                  : 'bg-white/[0.02] ring-1 ring-white/[0.06] hover:ring-blue-500/20 hover:bg-blue-500/[0.03]'
              } border border-transparent`}
            >
              <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors ${
                isDragging ? 'bg-blue-500/10' : 'bg-white/[0.04] group-hover:bg-blue-500/10'
              }`}>
                <UploadCloud className={`w-5 h-5 transition-colors ${isDragging ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
              </div>
              <p className="text-xs font-medium text-slate-300">Drop files here</p>
              <p className="text-[10px] text-slate-500 mt-1">PDF, TXT, DOCX, MD, PPTX</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.docx,.pptx"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>

          {uploadStatuses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ingestion Queue</p>
              {uploadStatuses.map((entry, i) => (
                <UploadCard key={i} file={entry.file} status={entry.status} />
              ))}
            </div>
          )}

          {documents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Ingested Files ({documents.length})
              </p>
              <div className="space-y-1">
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.filename}
                    doc={doc}
                    isSelected={selectedDoc?.filename === doc.filename}
                    onClick={() => handleDocClick(doc)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>FastAPI + Redis Connected</span>
          </div>
        </div>
      </aside>

      {/* ─── CENTER CHAT ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex-shrink-0 border-b border-white/[0.06] bg-[#0d0e12]/60 backdrop-blur-sm px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-400">RAG Chat</span>
            {isProcessing && (
              <span className="flex items-center gap-1.5 text-[10px] text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Thinking
              </span>
            )}
          </div>
          <button
            onClick={() => setShowContext(!showContext)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 transition-colors"
            title={showContext ? 'Hide context panel' : 'Show context panel'}
          >
            {showContext ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h2 className="text-base font-semibold text-slate-200 mb-1.5">Ask anything about your documents</h2>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Upload files in the sidebar, then ask a question. The system retrieves the most relevant chunks and generates an answer grounded in your data.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                    {msg.sender === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-medium text-slate-500">Assistant</span>
                        {msg.cached && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                            <Zap className="w-2.5 h-2.5" /> Cache
                          </span>
                        )}
                        {msg.isStreaming && (
                          <span className="flex items-center gap-1.5 text-[10px] text-blue-400">
                            <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                            Streaming
                          </span>
                        )}
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white/[0.04] text-slate-200 border border-white/[0.06] rounded-bl-md'
                    }`}>
                      {msg.text || (msg.isStreaming ? (
                        <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      ) : null)}
                    </div>
                    {msg.sender === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{msg.sources.length} source{msg.sources.length > 1 ? 's' : ''} retrieved</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-4 border-t border-white/[0.06] bg-[#0d0e12]/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto flex gap-2.5">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask about your documents…"
                className="w-full bg-white/[0.03] ring-1 ring-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-blue-500/30 focus:bg-white/[0.05] transition-all"
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={isProcessing || !inputQuery.trim()}
              className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </main>

      {/* ─── RIGHT CONTEXT PANEL ─── */}
      {showContext && (
        <aside className="w-80 flex-shrink-0 border-l border-white/[0.06] bg-[#0d0e12] flex flex-col overflow-hidden">
          {rightPanelMode === 'chunks' ? (
            <>
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedDoc(null); setDocChunks([]); }}
                    className="p-1 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h2 className="text-xs font-semibold text-slate-300 truncate">{selectedDoc?.filename}</h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 ml-8">
                  {docChunks.length} chunk{docChunks.length !== 1 ? 's' : ''} · {selectedDoc?.file_type?.replace('.', '').toUpperCase()}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {loadingChunks ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-3" />
                    <p className="text-xs text-slate-500">Loading chunks…</p>
                  </div>
                ) : docChunks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <p className="text-xs text-slate-500">No chunks found</p>
                  </div>
                ) : (
                  docChunks.map((chunk) => (
                    <ChunkCard key={chunk.chunk_index} chunk={chunk} />
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h2 className="text-xs font-semibold text-slate-300">Retrieved Context</h2>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Chunks ranked by cosine similarity</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {activeSources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <p className="text-xs text-slate-500">No context retrieved yet</p>
                    <p className="text-[10px] text-slate-600 mt-1">Send a query to see sources</p>
                  </div>
                ) : (
                  activeSources.map((src, idx) => (
                    <SourceCard key={idx} src={src} index={idx} />
                  ))
                )}
              </div>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
