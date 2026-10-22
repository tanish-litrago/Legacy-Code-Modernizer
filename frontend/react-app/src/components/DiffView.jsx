import { useEffect, useRef, useState } from "react";
import { html as diff2htmlHtml } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { Columns, AlignJustify } from "lucide-react";

export default function DiffView({ diff, dark }) {
  const [outputFormat, setOutputFormat] = useState("side-by-side");
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !diff) return;
    try {
      ref.current.innerHTML = diff2htmlHtml(diff, {
        drawFileList: false,
        matching: "lines",
        outputFormat: outputFormat,
        colorScheme: dark ? "dark" : "light",
        highlight: true,
        renderNothingWhenEmpty: false,
      });
    } catch (e) {
      console.error("Diff render error:", e);
      if (ref.current) {
        ref.current.innerHTML = `<pre class="p-4 text-xs font-mono" style="color:var(--red)">Error rendering diff: ${e.message}</pre>`;
      }
    }
  }, [diff, outputFormat, dark]);

  if (!diff) {
    return (
      <div
        className="rounded-xl flex items-center justify-center text-sm font-medium"
        style={{
          height: 180,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--fg-muted)",
        }}
      >
        Diff will appear here after conversion
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 1px 6px rgba(32,39,52,0.06)",
      }}
    >
      {/* Diff Controls Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: "var(--elevated)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wider mono"
          style={{ color: "var(--fg-muted)" }}
        >
          Changes ({outputFormat === "side-by-side" ? "Split View" : "Unified View"})
        </span>

        {/* View mode toggle */}
        <div
          className="flex items-center p-0.5 rounded-lg"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={() => setOutputFormat("side-by-side")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              background: outputFormat === "side-by-side" ? "var(--accent-dark)" : "transparent",
              color: outputFormat === "side-by-side" ? "#e0f8c7" : "var(--fg-muted)",
            }}
          >
            <Columns size={12} />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={() => setOutputFormat("line-by-line")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              background: outputFormat === "line-by-line" ? "var(--accent-dark)" : "transparent",
              color: outputFormat === "line-by-line" ? "#e0f8c7" : "var(--fg-muted)",
            }}
          >
            <AlignJustify size={12} />
            <span>Unified</span>
          </button>
        </div>
      </div>

      {/* Diff content scroll container */}
      <div
        className="overflow-x-auto overflow-y-auto"
        style={{
          maxHeight: 520,
          background: "var(--surface)",
        }}
        ref={ref}
      />
    </div>
  );
}
