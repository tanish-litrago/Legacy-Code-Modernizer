import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import delphi from "highlight.js/lib/languages/delphi"; // closest to Pascal

// Syntax styles are provided in index.css for full Light + Dark mode support
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", c);
hljs.registerLanguage("pascal", delphi);

function CodePanel({ title, code, language, badge }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && code) {
      ref.current.textContent = code;
      hljs.highlightElement(ref.current);
    }
  }, [code, language]);

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden flex-1 min-w-0"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--elevated)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest mono"
          style={{ color: "var(--fg-muted)" }}
        >
          {title}
        </span>
        {badge && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent-dark)",
              border: "1px solid var(--accent-bg)",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Code body — compact, attractive, IDE-standard line-height */}
      <div className="overflow-auto flex-1 p-3.5" style={{ maxHeight: 480 }}>
        {code ? (
          <pre
            className="m-0 text-[13px]"
            style={{
              color: "var(--fg)",
              lineHeight: 1.42,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <code ref={ref} className={`language-${language} hljs`} />
          </pre>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {[80, 60, 70, 50, 65].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded animate-pulse"
                style={{ width: `${w}%`, background: "var(--elevated)" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CodePanel;
