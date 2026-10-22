# Tests

The test suite covers parser extraction, call-graph construction, LLM orchestration and validation, and end-to-end conversion correctness.

All 88 tests run offline without a live Ollama instance by mocking network calls.

## Test Suites

| File | Tests | Coverage |
|---|---|---|
| `test_parser.py` | 18 | Pascal and C AST parsing, function/variable extraction, control flow |
| `test_dependency_graph.py` | 10 | NetworkX DiGraph creation, caller/callee context, JSON/PNG export |
| `test_llm_orchestration.py` | 14 | Prompt generation, C++ syntax checking via Tree-sitter, hallucination checks |
| `test_conversion_correctness.py` | 46 | End-to-end pipeline validation, type translations, C++ correctness, error recoveries |

## Running Tests

Run all unit tests:
```bash
pytest tests/ -v
```

Run a specific suite:
```bash
pytest tests/test_conversion_correctness.py -v
```

Use sample Pascal and C files in `samples/` as reference test fixtures.
