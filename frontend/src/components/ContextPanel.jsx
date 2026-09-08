import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import SourceCard from './SourceCard';
import ChunkCard from './ChunkCard';

export default function ContextPanel({
  selectedDoc,
  setSelectedDoc,
  docChunks,
  setDocChunks,
  loadingChunks,
  activeSources,
}) {
  const rightPanelMode = selectedDoc ? 'chunks' : 'sources';

  return (
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
  );
}
