import { FileText } from 'lucide-react';

export default function DocumentRow({ doc, isSelected, onClick }) {
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
