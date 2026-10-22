# LLM Orchestration Module

Handles structured prompt generation, Ollama LLM execution, C++ syntax validation, hallucination checking, and compiler-directed repair loops.

## Files

- `prompt_builder.py`: Constructs system and user prompts injecting source code, AST intermediate representation, and caller/callee graph context.
- `llm_client.py`: Calls local Ollama inference API (`qwen2.5-coder:3b`) with automated retries on syntax validation errors.
- `validator.py`: Validates generated C++ with Tree-sitter and detects hallucinated function/variable identifiers against original IR tokens.

## Implemented Features

- [x] Structured prompt templates for single functions and whole source files
- [x] Context injection combining AST IR metadata and call-graph dependencies
- [x] Ollama REST API integration with streaming and timeout handling
- [x] Tree-sitter C++ syntax parsing with fallback heuristics
- [x] Symbol hallucination detection against extracted IR
- [x] Multi-pass repair loop (up to 3 attempts) re-prompting with syntax error feedback
- [x] Unit test suite covering prompting, validation, and repair flows (14 tests)
