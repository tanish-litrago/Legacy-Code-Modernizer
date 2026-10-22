# Project Handoff: Legacy Code Modernizer

## Repository
https://github.com/sandeep-sp09/Legacy-Code-Modernizer

## Current Status
All modules are implemented and verified. Full pipeline functions end-to-end with 88/88 tests passing.

```
parser/               -> AST extraction (Tree-sitter)                   [Passing]
dependency_graph/      -> NetworkX call graph                            [Passing]
llm_orchestration/     -> Prompting + validation loop (Ollama LLM)       [Passing]
backend/app/           -> FastAPI service with SSE progress streaming    [Passing]
frontend/react-app/    -> Modern React SPA (Vite + Tailwind + D3)        [Passing]
frontend/              -> Static HTML fallback + Streamlit interface     [Passing]
tests/                 -> 88 unit tests across 4 test suites             [Passing]
```

## Implemented Modules

### 1. Parser (`parser/`)
- Tree-sitter grammars for Pascal and C loaded via dedicated packages (`tree-sitter-c`, `tree-sitter-pascal`) for compatibility with Python 3.14.
- Automatic language detection from file extension (`.pas`, `.c`, `.h`, etc.).
- Extracts functions, parameters, local variables, function calls, and control-flow constructs into IR dataclasses (`FunctionNode`, `VariableNode`, `CallNode`, `ControlFlowNode`).
- Pascal main `begin..end.` blocks map to a synthetic `__main__` entry function.

### 2. Dependency Graph (`dependency_graph/`)
- `build_call_graph()` creates a NetworkX `DiGraph` with function metadata attached to nodes.
- `get_graph_context()` generates concise textual caller/callee summaries for prompt injection.
- Serializes graphs into NetworkX node-link JSON format for web visualization.

### 3. LLM Orchestration (`llm_orchestration/`)
- **Prompt builder**: Constructs structured templates pairing original source code, IR summaries, and call-graph dependencies.
- **LLM client**: Interfaces with the local Ollama REST API (`http://localhost:11434`) running `qwen2.5-coder:3b`. Includes a 3-attempt repair loop feeding compiler errors back into subsequent prompts.
- **Validator**: Tree-sitter C++ syntax parsing (with regex heuristic fallback) and symbol hallucination checks against original IR tokens.

### 4. Backend (`backend/app/`)
- `GET /health`: Health and connectivity checks.
- `POST /upload`: Saves source files and returns assigned UUID and language.
- `POST /process/{file_id}`: Runs full conversion pipeline synchronously.
- `GET /stream/{file_id}`: Streams real-time progress via Server-Sent Events (`parsing`, `graph`, `generating`, `validating`, `done`).
- `GET /result/{file_id}`: Returns cached results (modern C++, graph JSON, diff).
- Concurrency handled through `asyncio.to_thread` to maintain responsive SSE streams.

### 5. Frontend Interfaces

#### Option 1: React SPA (Primary)
- Location: `frontend/react-app/`
- Tech: React 19, Vite, Tailwind CSS v4, Lucide React, D3.js, Diff2Html.
- Features:
  - Real-time SSE streaming for live pipeline step progression.
  - Interactive D3 force-directed call graph with drag, zoom, and node inspection drawer.
  - Diff2Html table with synchronized scrolling and locked 20px line heights in both unified and side-by-side modes.
  - Light mode (default) and dark mode with high-contrast color variables.
  - Quick-load sample presets for Pascal and C codebases.
- Run: `cd frontend/react-app && npm install && npm run dev` (runs at `http://localhost:5173`).

#### Option 2: Standalone Static Web Client
- Location: `frontend/index.html`, `frontend/style.css`, `frontend/app.js`
- Features: Offline demo mode fallback, HTML5 Canvas call graph, side-by-side text diff.
- Run: `python -m http.server 3000 --directory frontend` (runs at `http://localhost:3000`).

#### Option 3: Streamlit Application
- Location: `frontend/app.py`
- Features: Rapid experimentation, Matplotlib/NetworkX plots, side-by-side code blocks.
- Run: `streamlit run frontend/app.py`.

### 6. Tests (`tests/`)
Total: 88 passing unit tests (0.54s runtime).

- `test_parser.py` (18 tests): Pascal and C parsing, control structures, nested calls, syntax boundaries.
- `test_dependency_graph.py` (10 tests): NetworkX DiGraph creation, caller/callee context generation, JSON export formats.
- `test_llm_orchestration.py` (14 tests): Prompt template rendering, Tree-sitter C++ validation, hallucination detection.
- `test_conversion_correctness.py` (46 tests): End-to-end pipeline mocks, type conversions, golden C++ assertions, repair loops, AST structural fidelity.

## Environment Details

- **Python**: 3.10+ (tested on Python 3.14).
- **Virtual environment**: `venv/` (activate via `venv\Scripts\activate` on Windows cmd or `source venv/bin/activate` on Unix).
- **Node.js**: 18+ (tested with npm 10+).
- **LLM**: `qwen2.5-coder:3b` running on local Ollama instance (`ollama serve`). Designed to run smoothly on GPUs with 6GB-8GB VRAM (RTX 3050, RTX 4060).

## How to Run the Full Stack

1. **Start Ollama**:
   ```bash
   ollama pull qwen2.5-coder:3b
   ollama serve
   ```

2. **Start Backend**:
   ```bash
   venv\Scripts\activate
   cd backend
   uvicorn app.main:app --reload
   ```
   FastAPI runs at `http://localhost:8000` (docs at `http://localhost:8000/docs`).

3. **Start React Frontend**:
   ```bash
   cd frontend/react-app
   npm run dev
   ```
   Access the UI at `http://localhost:5173`.

4. **Execute Tests**:
   ```bash
   pytest tests/ -v
   ```
