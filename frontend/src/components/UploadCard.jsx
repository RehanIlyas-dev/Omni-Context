import { CheckCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';

export default function UploadCard({ file, status }) {
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
