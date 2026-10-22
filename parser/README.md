# Parser and AST Module

Parses raw Pascal and C source code into an Abstract Syntax Tree (AST) using Tree-sitter, then extracts an Intermediate Representation (IR) containing function signatures, variable scopes, call sites, and control-flow blocks.

## Files

- `ast_builder.py`: Loads grammar bindings (`tree-sitter-c`, `tree-sitter-pascal`) and parses source text into concrete syntax trees.
- `ast_extractor.py`: Traverses syntax trees to generate structured IR dataclasses.
- `models.py`: Data models defining `FunctionNode`, `VariableNode`, `CallNode`, and `ControlFlowNode`.

## Implemented Features

- [x] Tree-sitter Pascal grammar loading
- [x] Tree-sitter C grammar loading
- [x] Automatic language resolution from file extensions
- [x] Extraction of function and procedure signatures with parameters and return types
- [x] Extraction of control-flow structures (if, while, for)
- [x] Variable declaration parsing with scope associations
- [x] Unit test suite covering language edge cases (18 tests)
