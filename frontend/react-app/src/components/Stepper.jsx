import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

const STAGES = [
  { key: "parsing",    label: "Parse" },
  { key: "graph",      label: "Graph" },
  { key: "generating", label: "Generate" },
  { key: "validating", label: "Validate" },
  { key: "done",       label: "Done" },
];

function stageIndex(key) {
  return STAGES.findIndex((s) => s.key === key);
}

export default function Stepper({ currentStage, error }) {
  const currentIdx = stageIndex(currentStage);

  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((s, i) => {
        const isDone   = i < currentIdx || currentStage === "done";
        const isActive = s.key === currentStage && !error;
        const isError  = error && i === currentIdx;

        let icon;
        if (isError) {
          icon = <XCircle size={15} style={{ color: "var(--red)" }} />;
        } else if (isDone) {
          icon = <CheckCircle2 size={15} style={{ color: "var(--green)" }} />;
        } else if (isActive) {
          icon = <Loader2 size={15} className="animate-spin" style={{ color: "var(--green)" }} />;
        } else {
          icon = <Circle size={15} style={{ color: "var(--fg-muted)", opacity: 0.35 }} />;
        }

        const isHighlighted = isDone || isActive;

        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-300"
              style={{
                background: isHighlighted
                  ? "var(--accent-dim)"
                  : isError
                  ? "rgba(192,57,43,0.12)"
                  : "transparent",
                border: `1.5px solid ${
                  isHighlighted
                    ? "var(--green)"
                    : isError
                    ? "var(--red)"
                    : "transparent"
                }`,
                fontSize: 12,
                fontWeight: isHighlighted ? 600 : 500,
                color: isHighlighted
                  ? "var(--green)"
                  : isError
                  ? "var(--red)"
                  : "var(--fg-muted)",
                whiteSpace: "nowrap",
                boxShadow: isActive ? "0 0 10px rgba(183,216,148,0.3)" : "none",
              }}
            >
              {icon}
              <span>{s.label}</span>
            </div>

            {i < STAGES.length - 1 && (
              <div
                className="flex-1 h-px mx-1.5 transition-all duration-500"
                style={{
                  background: i < currentIdx ? "var(--green)" : "var(--border)",
                  height: i < currentIdx ? "2px" : "1px",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
