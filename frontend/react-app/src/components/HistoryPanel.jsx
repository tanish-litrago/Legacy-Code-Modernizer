import { Clock, FileCode2 } from "lucide-react";

export default function HistoryPanel({ history, onSelect }) {
  if (!history.length) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest"
        style={{ borderBottom: "1px solid var(--border)", color: "var(--fg-muted)" }}
      >
        <Clock size={13} /> Recent
      </div>
      <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
        {history.map((h) => (
          <li key={h.fileId}>
            <button
              onClick={() => onSelect(h)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] active:scale-[0.99]"
            >
              <FileCode2 size={15} style={{ color: "var(--accent-dark)", flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--fg)" }}>{h.filename}</p>
                <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                  {h.language.toUpperCase()} · {new Date(h.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
