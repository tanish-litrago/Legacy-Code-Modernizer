// Shared hook: open SSE stream for a file_id, fire callbacks per stage
// Returns: { start, abort }
export function useSSEPipeline({ onEvent, onError, onDone }) {
  let controller = null;

  function start(fileId) {
    controller = new AbortController();
    const url = `/stream/${fileId}`;

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // SSE lines: "data: {...}\n\n"
          const parts = buf.split("\n\n");
          buf = parts.pop(); // last incomplete chunk stays in buffer
          for (const part of parts) {
            if (!part.startsWith("data:")) continue;
            try {
              const json = JSON.parse(part.slice(5).trim());
              onEvent(json);
              if (json.stage === "done") onDone(json.payload);
              if (json.stage === "error") onError(json.message);
            } catch {
              // ignore malformed lines
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") onError(err.message);
      });
  }

  function abort() {
    controller?.abort();
  }

  return { start, abort };
}
