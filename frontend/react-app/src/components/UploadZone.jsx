import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileCode2, X } from "lucide-react";

const ACCEPTED = [".c", ".h", ".pas", ".pp", ".dpr", ".lpr"];

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export default function UploadZone({ onUploaded, disabled }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const upload = useCallback(async (f) => {
    setError(null);
    setFile(f);
    setUploading(true);
    try {
      // Read source text locally — no round-trip needed
      const sourceText = await readFileText(f);

      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      onUploaded({
        fileId: data.file_id,
        filename: data.filename,
        language: data.language,
        sourceText,            // ← pass raw text to parent
      });
    } catch (e) {
      setError(e.message);
      setFile(null);
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) upload(f);
  }, [upload]);

  const onPick = (e) => {
    const f = e.target.files[0];
    if (f) upload(f);
  };

  const reset = () => { setFile(null); setError(null); };

  return (
    <div
      onClick={() => !disabled && !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className="relative flex flex-col items-center justify-center gap-3 rounded-2xl border transition-all duration-200 cursor-pointer select-none"
      style={{
        background: dragging ? "var(--accent-dim)" : "var(--surface)",
        borderColor: dragging ? "var(--accent-bg)" : "var(--border)",
        borderStyle: "dashed",
        borderWidth: 2,
        padding: "3rem 2rem",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
        boxShadow: "0 1px 6px rgba(32,39,52,0.06)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={onPick}
      />

      {uploading ? (
        <>
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>Uploading…</p>
        </>
      ) : file && !error ? (
        <div className="flex items-center gap-3">
          <FileCode2 size={28} style={{ color: "var(--accent-dark)" }} />
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--fg)" }}>{file.name}</p>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>Ready to convert</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="ml-2 p-1 rounded-lg transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <UploadCloud size={36} style={{ color: dragging ? "var(--accent-dark)" : "var(--fg-muted)" }} />
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>
              Drop a Pascal or C file here
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
              or click to browse — {ACCEPTED.join(", ")}
            </p>
          </div>
        </>
      )}

      {error && (
        <p className="text-xs mt-1 font-mono" style={{ color: "var(--red)" }}>{error}</p>
      )}
    </div>
  );
}
