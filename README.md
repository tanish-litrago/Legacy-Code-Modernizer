# Legacy Code Modernizer

Parses legacy Pascal and C source into an AST, constructs a call-dependency graph, and uses a local LLM to generate modern, idiomatic C++17.

## Architecture Pipeline

1. **parser/**: Tree-sitter AST extraction for Pascal and C source code.
2. **dependency_graph/**: NetworkX call-dependency graph with caller/callee context generation.
3. **llm_orchestration/**: Prompt builder, AST and graph context injection, Tree-sitter C++ syntax validation, and symbol hallucination checks.
4. **backend/**: FastAPI service with REST and Server-Sent Events (SSE) streaming (`POST /upload`, `POST /process`, `GET /stream/{file_id}`, `GET /result/{file_id}`).
5. **frontend/**: Modern React SPA (Vite, Tailwind CSS, D3 force graph, Diff2Html), plus a fallback static HTML client and Streamlit dashboard.

## Requirements

- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (for React frontend)
- [Ollama](https://ollama.ai) with `qwen2.5-coder:3b`

## Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows cmd
# source venv/bin/activate   # Linux / macOS

# Install dependencies
pip install -r requirements.txt
pip install tree-sitter-cpp   # optional, enables AST syntax validation
```

## LLM Setup

Pull and start the local model:

```bash
ollama pull qwen2.5-coder:3b
ollama serve
```

Model: **Qwen2.5-Coder-3B-Instruct** (Q4_K_M). Runs comfortably on GPUs with 6GB-8GB VRAM (e.g. RTX 3050, RTX 4060).

## Frontend Setup

```bash
cd frontend/react-app
npm install
npm run dev
```

The React interface starts at `http://localhost:5173`.

## Usage

### Run Tests
88 unit tests covering parsing, graph construction, prompt generation, syntax checking, and end-to-end conversion correctness:

```bash
pytest tests/ -v
```

### Start Backend
```bash
cd backend
uvicorn app.main:app --reload
```

FastAPI server runs at `http://localhost:8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check and server status |
| `POST` | `/upload` | Upload `.pas` or `.c` source file |
| `POST` | `/process/{file_id}` | Run full conversion pipeline synchronously |
| `GET` | `/stream/{file_id}` | Run conversion with real-time SSE progress events |
| `GET` | `/result/{file_id}` | Retrieve generated C++, dependency graph, and unified diff |
