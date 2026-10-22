// History persisted in sessionStorage (last 5 conversions)
const KEY = "lcm_history";

export function getHistory() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function pushHistory(entry) {
  // entry: { filename, language, timestamp, fileId }
  const hist = getHistory().filter((h) => h.fileId !== entry.fileId);
  hist.unshift(entry);
  sessionStorage.setItem(KEY, JSON.stringify(hist.slice(0, 5)));
}
