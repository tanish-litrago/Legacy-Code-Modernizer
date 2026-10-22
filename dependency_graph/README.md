# Dependency Graph Module

Constructs a NetworkX directed graph representing function call relationships and control dependencies from parser IR.

## Files

- `graph_builder.py`: Converts lists of `FunctionNode` instances into a NetworkX `DiGraph` and extracts caller/callee text summaries for prompt injection.
- `graph_export.py`: Serializes graphs into NetworkX node-link JSON format for D3 visualization and renders PNG plots.

## Implemented Features

- [x] Function call graph construction (`build_call_graph`)
- [x] Node metadata enrichment (parameters, return type, language)
- [x] Context generation for LLM prompts (`get_graph_context`)
- [x] Node-link JSON export for web interfaces (`to_json`)
- [x] PNG export for reporting (`export_to_png`)
- [x] Unit test suite covering graph metrics and serialization (10 tests)
