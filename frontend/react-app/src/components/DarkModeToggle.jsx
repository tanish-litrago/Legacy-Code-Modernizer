import { Moon, Sun } from "lucide-react";

export default function DarkModeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 active:scale-95"
      style={{
        background: "rgba(183,216,148,0.15)",
        border: "1px solid rgba(183,216,148,0.3)",
        color: "#e0f8c7",
      }}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
