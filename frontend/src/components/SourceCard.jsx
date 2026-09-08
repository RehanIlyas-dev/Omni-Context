export default function SourceCard({ src, index }) {
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
