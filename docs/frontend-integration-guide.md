# Frontend Integration Guide: Legacy Code Modernizer

## Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check endpoint returning `{"status": "ok"}` |
| `POST` | `/upload` | Upload `.pas` or `.c` file as multipart form data |
| `POST` | `/process/{file_id}` | Run conversion pipeline synchronously |
| `GET` | `/stream/{file_id}` | Stream live progress events via Server-Sent Events (SSE) |
| `GET` | `/result/{file_id}` | Retrieve stored conversion results |

## Integration Flows

### Flow A: Real-Time Streaming (Recommended for React SPA)

```
1. POST /upload              -> Receive file_id
2. EventSource /stream/{id}  -> Listen for stage events ('parsing', 'graph', 'generating', 'validating', 'done')
3. On 'done' event           -> Receive final C++, diff, and graph JSON in the SSE payload
```

Example in JavaScript:
```javascript
const eventSource = new EventSource(`http://localhost:8000/stream/${fileId}`);

eventSource.onmessage = (e) => {
  const { stage, message, payload } = JSON.parse(e.data);
  console.log(`[Stage: ${stage}] ${message}`);

  if (stage === "done") {
    console.log("Modern C++:", payload.generated_cpp);
    console.log("Graph:", payload.graph_json);
    console.log("Diff:", payload.diff);
    eventSource.close();
  } else if (stage === "error") {
    console.error("Conversion failed:", message);
    eventSource.close();
  }
};
```

### Flow B: Synchronous REST

```
1. POST /upload              -> Receive file_id
2. POST /process/{file_id}   -> Await completion and receive output payload
3. GET /result/{file_id}     -> Re-fetch cached results if needed later
```

## Response Payloads

### `/upload` Response
```json
{
  "file_id": "c9bf9e57-1685-4c89-bafb-ff5af830be8a",
  "filename": "sample1.pas",
  "language": "pascal",
  "message": "File uploaded successfully"
}
```

### `/process` and `/result` Response
```json
{
  "file_id": "c9bf9e57-1685-4c89-bafb-ff5af830be8a",
  "status": "completed",
  "generated_cpp": "#include <iostream>\n\nint addNumbers(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    std::cout << addNumbers(5, 10) << std::endl;\n    return 0;\n}\n",
  "dependency_graph_json": "{\"directed\": true, \"multigraph\": false, \"graph\": {}, \"nodes\": [{\"id\": \"AddNumbers\"}], \"links\": []}",
  "diff": "--- sample1.pas\n+++ sample1.cpp\n@@ -1,15 +1,12 @@\n...",
  "functions_found": 2,
  "edges_found": 1
}
```

## Dependency Graph Format

`dependency_graph_json` adheres to NetworkX node-link specifications:

```json
{
  "directed": true,
  "multigraph": false,
  "graph": {},
  "nodes": [
    {"id": "AddNumbers", "parameters": ["a", "b"], "language": "pascal"},
    {"id": "__main__", "parameters": [], "language": "pascal"}
  ],
  "links": [
    {"source": "__main__", "target": "AddNumbers", "line": 13}
  ]
}
```

This structure feeds directly into D3 force simulations (`d3.forceSimulation(nodes)` and `d3.forceLink(links)`).

## Unified Diff Format

The backend generates standard unified diff text:

```diff
--- sample1.pas
+++ sample1.cpp
@@ -1,15 +1,12 @@
-program Sample1;
+#include <iostream>
```

Compatible with `diff2html` (`Diff2Html.html(diff, { outputFormat: 'side-by-side' })`) or custom split view parsers.

## Supported File Extensions

| Language | Extensions |
|---|---|
| Pascal | `.pas`, `.pp`, `.dpr`, `.lpr` |
| C | `.c`, `.h` |

## HTTP Status Codes

| Code | Status | Cause |
|---|---|---|
| `200` | OK | Successful operation |
| `400` | Bad Request | Unsupported extension, empty file, or invalid source |
| `404` | Not Found | Unknown `file_id` or unprocessed result query |
| `500` | Internal Server Error | Unhandled processing failure |
| `503` | Service Unavailable | Ollama instance offline or unreachable at port 11434 |
