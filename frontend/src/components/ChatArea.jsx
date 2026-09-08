import { Zap, Clock, Loader2, Send, ChevronRight, ChevronLeft } from 'lucide-react';

export default function ChatArea({
  messages,
  inputQuery,
  setInputQuery,
  isProcessing,
  showContext,
  setShowContext,
  chatEndRef,
  handleSend,
}) {
  return (
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
  );
}
