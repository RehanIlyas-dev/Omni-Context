import { Hash } from 'lucide-react';

export default function ChunkCard({ chunk }) {
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
