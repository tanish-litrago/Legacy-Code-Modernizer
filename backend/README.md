# Backend (FastAPI)

FastAPI service wiring the modernization pipeline together:
Source upload -> AST parsing -> Dependency graph -> LLM translation -> Syntax validation -> Diff generation.

## Run Locally

```bash
cd backend
pip install -r ../requirements.txt
uvicorn app.main:app --reload
```

Server starts at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check endpoint returning `{"status": "ok"}` |
| `POST` | `/upload` | Multipart file upload (`.pas`, `.c`, `.h`). Returns `file_id` and detected language |
| `POST` | `/process/{file_id}` | Runs the complete conversion pipeline synchronously and returns modern C++ results |
| `GET` | `/stream/{file_id}` | Streams pipeline progress events via Server-Sent Events (SSE) |
| `GET` | `/result/{file_id}` | Retrieves cached output (generated C++, NetworkX graph JSON, unified diff) |

## SSE Streaming Protocol

`GET /stream/{file_id}` emits events with the format:

```
data: {"stage": "parsing", "message": "Parsing sample1.pas...", "payload": {}}
```

Stages emitted in order:
1. `parsing`: Tree-sitter AST extraction and IR generation.
2. `graph`: Call-graph construction and NetworkX node/link serialization.
3. `generating`: Context assembly and Ollama inference.
4. `validating`: Tree-sitter C++ syntax parsing and symbol verification.
5. `done`: Pipeline complete with generated code, diff, and graph payloads.
6. `error`: Emitted on syntax or runtime failures.

## Internal Design

- Storage: In-memory dictionary registries (`_file_registry`, `_result_registry`) index files and generated output by UUID.
- Concurrency: Pipeline execution runs in worker threads using `asyncio.to_thread` so SSE event streams flush without blocking the main event loop.
- CORS: Enabled across all origins for local frontend development.
