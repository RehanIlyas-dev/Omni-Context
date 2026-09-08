import { useRef, useState } from 'react';
import { UploadCloud, Database, ShieldCheck, RotateCcw } from 'lucide-react';
import UploadCard from './UploadCard';
import DocumentRow from './DocumentRow';

export default function Sidebar({
  documents,
  uploadStatuses,
  selectedDoc,
  handleDocClick,
  handleFiles,
  handleDrop,
  handleNewSession,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  return (
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
            onDrop={(e) => { handleDrop(e); setIsDragging(false); }}
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

      <div className="p-4 border-t border-white/[0.06] space-y-3">
        <button
          onClick={handleNewSession}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] ring-1 ring-white/[0.06] text-xs font-medium text-slate-400 hover:text-slate-200 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Session
        </button>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>FastAPI + Redis Connected</span>
        </div>
      </div>
    </aside>
  );
}
