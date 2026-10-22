import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Play, RotateCcw, Cpu, GitBranch } from "lucide-react";

import UploadZone from "./components/UploadZone";
import Stepper from "./components/Stepper";
import CallGraph from "./components/CallGraph";
import CodePanel from "./components/CodePanel";
import DiffView from "./components/DiffView";
import HistoryPanel from "./components/HistoryPanel";
import DarkModeToggle from "./components/DarkModeToggle";
import { useSSEPipeline } from "./useSSEPipeline";
import { getHistory, pushHistory } from "./history";

const TABS = ["Code", "Diff", "Graph"];

export default function App() {
  // Light mode as primary theme mode
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("lcm_theme");
    return saved === "dark"; // Default is false (Light Mode primary)
  });
  const [upload, setUpload] = useState(null);
  const [stage, setStage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState("Code");
  const [history, setHistory] = useState(getHistory);
  const [originalSource, setOriginalSource] = useState(null);

  const abortRef = useRef(null);

  // Toggle dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("lcm_theme", dark ? "dark" : "light");
  }, [dark]);

  const resetConversion = () => {
    setStage(null);
    setLogs([]);
    setResult(null);
    setError(null);
    setRunning(false);
    abortRef.current?.();
  };

  const handleUploaded = useCallback((info) => {
    resetConversion();
    setUpload(info);
    setOriginalSource(info.sourceText); // text read locally by FileReader in UploadZone
  }, []);

  const { start, abort } = useSSEPipeline({
    onEvent: (ev) => {
      setStage(ev.stage);
      setLogs((prev) => [...prev, { stage: ev.stage, message: ev.message }]);
      if (ev.stage === "graph" && ev.payload?.graph_json) {
        setResult((prev) => ({ ...prev, dependency_graph_json: ev.payload.graph_json }));
      }
    },
    onDone: (payload) => {
      setResult(payload);
      setRunning(false);
      const entry = {
        fileId: upload.fileId,
        filename: upload.filename,
        language: upload.language,
        timestamp: Date.now(),
      };
      pushHistory(entry);
      setHistory(getHistory());
    },
    onError: (msg) => {
      setError(msg);
      setRunning(false);
    },
  });

  abortRef.current = abort;

  const runPipeline = () => {
    if (!upload) return;
    resetConversion();
    setRunning(true);
    setStage("parsing");
    start(upload.fileId);
  };

  const downloadCpp = () => {
    if (!result?.generated_cpp) return;
    const blob = new Blob([result.generated_cpp], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (upload?.filename?.replace(/\.(pas|c|h|pp|dpr|lpr)$/i, "") || "output") + ".cpp";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDone = stage === "done";

  return (
    <div className="min-h-screen" style={{ background: "var(--base)" }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-3"
        style={{
          background: "var(--header-bg)",
          borderBottom: "3px solid var(--accent-bg)",
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Logo icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-bg)", boxShadow: "0 0 10px rgba(183,216,148,0.4)" }}
          >
            <Cpu size={15} style={{ color: "var(--header-bg)" }} />
          </div>

          <span
            className="font-semibold text-sm tracking-tight"
            style={{ color: "var(--header-fg)" }}
          >
            Legacy Code Modernizer
          </span>

          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(183,216,148,0.15)",
              color: "var(--header-fg)",
              border: "1px solid rgba(183,216,148,0.3)",
            }}
          >
            Pascal / C → C++
          </span>
        </div>

        <DarkModeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Upload + History row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <UploadZone onUploaded={handleUploaded} disabled={running} />
          </div>
          <div>
            <HistoryPanel history={history} onSelect={(h) => setUpload(h)} />
          </div>
        </div>

        {/* Action buttons */}
        {upload && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={runPipeline}
              disabled={running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.97]"
              style={{
                background: running ? "var(--elevated)" : "var(--accent-dark)",
                color: running ? "var(--fg-muted)" : "#e0f8c7",
                cursor: running ? "not-allowed" : "pointer",
                border: "2px solid " + (running ? "var(--border)" : "var(--accent-dark)"),
                boxShadow: running ? "none" : "0 2px 12px rgba(32,39,52,0.18)",
              }}
            >
              <Play size={15} />
              {running ? "Converting…" : "Convert to C++"}
            </button>

            {(isDone || error) && (
              <button
                onClick={resetConversion}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.97]"
                style={{
                  background: "var(--surface)",
                  color: "var(--fg-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}

            {isDone && (
              <button
                onClick={downloadCpp}
                className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97]"
                style={{
                  background: "var(--accent-bg)",
                  color: "var(--fg)",
                  border: "1px solid transparent",
                  boxShadow: "0 2px 8px rgba(183,216,148,0.35)",
                }}
              >
                <Download size={14} /> Download .cpp
              </button>
            )}
          </div>
        )}

        {/* Stepper + live log */}
        {stage && (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 4px rgba(32,39,52,0.06)",
            }}
          >
            <Stepper currentStage={stage} error={error} />

            <div className="mt-3 max-h-20 overflow-y-auto">
              {logs.slice(-4).map((l, i) => (
                <p key={i} className="text-xs mono py-0.5" style={{ color: "var(--fg-muted)", lineHeight: 1.45 }}>
                  <span style={{ color: "var(--green)", marginRight: 6, fontWeight: 600 }}>[{l.stage}]</span>
                  {l.message}
                </p>
              ))}
              {error && (
                <p className="text-xs mono mt-1" style={{ color: "var(--red)" }}>✕ {error}</p>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {(result || running) && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "0 2px 12px rgba(32,39,52,0.07)",
            }}
          >
            {/* Tab bar */}
            <div
              className="flex items-center gap-1 px-4 py-2"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--elevated)" }}
            >
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.97] flex items-center gap-1.5"
                  style={{
                    background: tab === t ? "var(--accent-dark)" : "transparent",
                    color: tab === t ? "#e0f8c7" : "var(--fg-muted)",
                    border: `1px solid ${tab === t ? "var(--accent-dark)" : "transparent"}`,
                  }}
                >
                  {t === "Graph" && <GitBranch size={11} />}
                  {t}
                </button>
              ))}

              {isDone && result && (
                <div className="ml-auto flex items-center gap-4">
                  <Stat label="Functions" value={result.functions_found} />
                  <Stat label="Edges" value={result.edges_found} />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              {tab === "Code" && (
                <div className="flex flex-col md:flex-row gap-4">
                  <CodePanel
                    title="Original Source"
                    code={originalSource}
                    language={upload?.language || "c"}
                    badge={upload?.language?.toUpperCase()}
                  />
                  <CodePanel
                    title="Generated C++"
                    code={result?.generated_cpp}
                    language="cpp"
                    badge="C++17"
                  />
                </div>
              )}
              {tab === "Diff" && <DiffView diff={result?.diff} dark={dark} />}
              {tab === "Graph" && <CallGraph graphJson={result?.dependency_graph_json} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-right">
      <p className="text-sm font-bold mono" style={{ color: "var(--fg)", lineHeight: 1 }}>{value ?? "—"}</p>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>{label}</p>
    </div>
  );
}
