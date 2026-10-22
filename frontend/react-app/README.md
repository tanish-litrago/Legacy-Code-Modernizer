# Modernizer React Client

Single-page application for uploading legacy source code, observing conversion progress in real time, inspecting call graphs, and reviewing generated C++ diffs.

## Tech Stack

- **Framework**: React 19 + Vite 6
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **Icons**: Lucide React
- **Data Visualization**: D3.js (force-directed call graph)
- **Diff Rendering**: Diff2Html (unified and side-by-side modes)

## Project Structure

```
frontend/react-app/
├── src/
│   ├── components/
│   │   ├── CodePanel.jsx       # Source display, modern C++ output, Diff2Html table
│   │   ├── GraphViewer.jsx     # D3 force-directed call graph with node inspection
│   │   ├── PipelineStepper.jsx # Visual pipeline progress indicators
│   │   └── Presets.jsx         # Sample Pascal and C file presets
│   ├── App.jsx                 # Main state container, theme toggle, SSE listeners
│   ├── main.jsx                # Application root entry
│   └── index.css               # Global theme variables, diff styling, typography
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

Node.js 18+ and npm 9+.

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Runs at `http://localhost:5173`. Expects the backend to run at `http://localhost:8000`.

### Production Build

```bash
npm run build
```

Generates optimized assets in `dist/`.

## Key Features

1. **Server-Sent Events (SSE)**: Listens on `/stream/{file_id}` to update each stage (parsing, graph, LLM, validation, done) in the UI without polling.
2. **D3 Graph**: Dynamic node layout with zoom, pan, drag, and caller/callee drawer details.
3. **Diff Viewer**: Normalized 20px line heights across both side-by-side and unified diff modes to prevent vertical misalignment.
4. **Theme Palettes**: Includes light and dark modes with dedicated edge and diff contrast tokens. Defaults to light mode.
