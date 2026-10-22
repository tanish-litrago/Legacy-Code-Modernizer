# Frontend Interfaces

The project provides three frontend options depending on your preferred workflow.

## Frontend Options

### Option 1: React Single-Page Application (Primary)

Modern React web application built with Vite and Tailwind CSS. Connects to the FastAPI backend with real-time SSE streaming.

- **Location**: `frontend/react-app/`
- **Tech Stack**: React 19, Vite, Tailwind CSS v4, Lucide React, D3.js, Diff2Html.
- **Key Features**:
  - **Live Pipeline Streaming**: Connects to `GET /stream/{file_id}` to display progress as the backend parses, builds graphs, generates code, and validates syntax.
  - **D3 Call Graph**: Force-directed interactive graph with drag, zoom, node selection, and caller/callee inspection drawer.
  - **Diff Viewer**: Integrated Diff2Html supporting synchronized side-by-side and line-by-line views with fixed 20px line heights.
  - **Theme System**: Supports light and dark modes with dedicated high-contrast palettes. Light mode is configured as default.
  - **Sample Presets**: Quick-load buttons for bundled Pascal and C examples.

#### Running the React Client:
```bash
cd frontend/react-app
npm install
npm run dev
```

Opens at `http://localhost:5173`.

---

### Option 2: Standalone Static Client

Lightweight vanilla HTML, CSS, and JavaScript interface using HTML5 Canvas for graph rendering.

- **Location**: `frontend/index.html`, `frontend/style.css`, `frontend/app.js`
- **Features**: Offline demo mode fallback, Canvas force-directed graph, side-by-side text diff.

#### Running the Static Client:
```bash
# Using Python
python -m http.server 3000 --directory frontend

# Or using Node
npx serve frontend
```

Opens at `http://localhost:3000`.

---

### Option 3: Streamlit Dashboard

Python-based dashboard for rapid testing and experimentation.

- **Location**: `frontend/app.py`
- **Features**: Matplotlib and NetworkX graph visualization, side-by-side text comparison columns, backend status checks.

#### Running the Streamlit App:
```bash
pip install streamlit networkx matplotlib requests
streamlit run frontend/app.py
```

---

## Backend API Endpoints

The frontends integrate with the following FastAPI routes:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check endpoint |
| `POST` | `/upload` | Upload `.pas` or `.c` source file |
| `POST` | `/process/{file_id}` | Run conversion pipeline synchronously |
| `GET` | `/stream/{file_id}` | Stream conversion progress via Server-Sent Events |
| `GET` | `/result/{file_id}` | Retrieve completed modern C++, graph JSON, and diff |
