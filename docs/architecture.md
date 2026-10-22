# Architecture Overview

```
[Source .pas/.c] 
      |
      v
[parser/] --------> Tree-sitter AST -> IR (FunctionNode, VariableNode, CallNode)
      |
      v
[dependency_graph/] -> NetworkX DiGraph (call graph & context)
      |
      v
[llm_orchestration/] -> Prompt (Source + IR + Call Graph) -> Ollama (qwen2.5-coder:3b) -> C++
      |                                                                                  |
      v                                                                                  v
   [validator]  <------------------------------------------------------------ Syntax & Symbol Checks
      |
      v (Pipeline complete)
[backend/] ---------> FastAPI Service (REST /process + SSE /stream)
      |
      v
[frontend/] --------> React SPA (Vite, Tailwind, D3 Graph, Diff2Html)
```

## Data Flow

1. **Ingestion**: Source file uploaded via `POST /upload`. Assigned UUID in `_file_registry`.
2. **Parsing**: Tree-sitter extracts concrete syntax trees and maps symbols into intermediate representation dataclasses.
3. **Graph Analysis**: NetworkX models caller/callee relationships and yields serialized node-link JSON.
4. **Prompt Assembly & LLM Generation**: LLM prompt combines original source code, IR symbols, and caller/callee signatures. Ollama returns C++ candidates.
5. **Validation Loop**: Generated C++ parsed via Tree-sitter. Unresolved syntax errors or hallucinated tokens trigger automated repair prompts (up to 3 iterations).
6. **Streaming & Delivery**: Progress pushed to client via SSE `GET /stream/{file_id}`, caching completed C++, graph JSON, and unified diff in `_result_registry`.
