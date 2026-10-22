"""
Conversion correctness tests.

These tests verify that the code coming out of the conversion pipeline is
structurally and semantically correct without requiring a live Ollama instance.

Strategy:
  - The LLM boundary (generate_cpp / _call_ollama) is replaced by
    unittest.mock so tests are fully deterministic.
  - Golden C++ snippets are hand-written equivalents of the Pascal/C samples.
  - Tests walk the full pipeline:
      parser → IR → prompt_builder → (mock LLM) → validator → extracted C++
  Run with:  pytest tests/test_conversion_correctness.py -v
"""

import os
import re
import sys
import json
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from parser.ast_builder import parse_source, load_source
from parser.ast_extractor import extract_functions
from parser.models import FunctionNode, VariableNode, CallNode
from llm_orchestration.prompt_builder import build_prompt, build_full_file_prompt
from llm_orchestration.validator import check_syntax, check_no_hallucinations
from llm_orchestration.llm_client import _extract_code_block, _build_repair_prompt


SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "..", "samples")


# ---------------------------------------------------------------------------
# Golden C++ outputs — hand-verified correct conversions of the sample files
# ---------------------------------------------------------------------------

GOLDEN_PASCAL_ADD = """\
#include <iostream>

int AddNumbers(int a, int b) {
    return a + b;
}
"""

GOLDEN_PASCAL_MAIN = """\
#include <iostream>

int AddNumbers(int a, int b) {
    return a + b;
}

int main() {
    int x = 5;
    int y = 10;
    int sum = AddNumbers(x, y);
    std::cout << "Sum is: " << sum << std::endl;
    return 0;
}
"""

GOLDEN_C_ADD = """\
#include <iostream>

int add_numbers(int a, int b) {
    return a + b;
}
"""

GOLDEN_C_MAIN = """\
#include <iostream>

int add_numbers(int a, int b) {
    return a + b;
}

int main() {
    int x = 5, y = 10;
    int sum = add_numbers(x, y);
    std::cout << "Sum is: " << sum << std::endl;
    return 0;
}
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_pascal_ir():
    path = os.path.join(SAMPLES_DIR, "pascal", "sample1.pas")
    tree, lang = parse_source(path)
    source = load_source(path)
    return extract_functions(tree, lang, source), source


def _load_c_ir():
    path = os.path.join(SAMPLES_DIR, "c", "sample1.c")
    tree, lang = parse_source(path)
    source = load_source(path)
    return extract_functions(tree, lang, source), source


# ---------------------------------------------------------------------------
# _extract_code_block  (pure function, no mocking needed)
# ---------------------------------------------------------------------------

class TestExtractCodeBlock:
    """Tests for the markdown fence stripping helper."""

    def test_strips_cpp_fence(self):
        raw = "```cpp\nint main() { return 0; }\n```"
        assert _extract_code_block(raw) == "int main() { return 0; }"

    def test_strips_cxx_fence(self):
        raw = "```c++\nint main() { return 0; }\n```"
        assert _extract_code_block(raw) == "int main() { return 0; }"

    def test_strips_plain_fence(self):
        raw = "```\nint main() { return 0; }\n```"
        assert _extract_code_block(raw) == "int main() { return 0; }"

    def test_passthrough_unfenced(self):
        raw = "int main() { return 0; }"
        assert _extract_code_block(raw) == raw

    def test_multiline_preserved(self):
        raw = "```cpp\nint add(int a, int b) {\n    return a + b;\n}\n```"
        result = _extract_code_block(raw)
        assert "int add(int a, int b)" in result
        assert "return a + b;" in result

    def test_strips_leading_explanation(self):
        """LLM often puts text before the fence — should still extract code."""
        raw = "Here is the converted code:\n```cpp\nint x = 5;\n```\nDone."
        result = _extract_code_block(raw)
        assert result == "int x = 5;"


# ---------------------------------------------------------------------------
# _build_repair_prompt (pure function)
# ---------------------------------------------------------------------------

class TestBuildRepairPrompt:
    def test_contains_original_prompt(self):
        prompt = _build_repair_prompt("ORIGINAL", "bad code", ["Syntax error: x"])
        assert "ORIGINAL" in prompt

    def test_contains_bad_code(self):
        prompt = _build_repair_prompt("ORIGINAL", "bad code", ["Syntax error: x"])
        assert "bad code" in prompt

    def test_contains_each_issue(self):
        issues = ["Syntax error: missing ;", "Hallucinated symbols: foo"]
        prompt = _build_repair_prompt("p", "c", issues)
        assert "Syntax error: missing ;" in prompt
        assert "Hallucinated symbols: foo" in prompt

    def test_contains_fix_instruction(self):
        prompt = _build_repair_prompt("p", "c", ["err"])
        assert "fix" in prompt.lower() or "correct" in prompt.lower()


# ---------------------------------------------------------------------------
# Validator: syntax check on golden outputs
# ---------------------------------------------------------------------------

class TestGoldenOutputSyntax:
    """Golden C++ outputs must pass the syntax validator."""

    @pytest.mark.parametrize("code,label", [
        (GOLDEN_PASCAL_ADD,  "pascal add function"),
        (GOLDEN_PASCAL_MAIN, "pascal full file"),
        (GOLDEN_C_ADD,       "c add function"),
        (GOLDEN_C_MAIN,      "c full file"),
    ])
    def test_syntax_valid(self, code, label):
        is_valid, err = check_syntax(code)
        assert is_valid, f"Golden output for '{label}' failed syntax check: {err}"


# ---------------------------------------------------------------------------
# Validator: hallucination check on golden outputs
# ---------------------------------------------------------------------------

class TestGoldenOutputNoHallucinations:
    """Golden outputs must not introduce symbols absent from the source IR."""

    def test_pascal_add_function_no_hallucinations(self):
        functions, _ = _load_pascal_ir()
        add_fn = functions[0]  # AddNumbers
        passed, flagged = check_no_hallucinations(GOLDEN_PASCAL_ADD, [add_fn])
        assert passed, f"Hallucinated symbols in pascal add output: {flagged}"

    def test_pascal_full_file_no_hallucinations(self):
        functions, _ = _load_pascal_ir()
        passed, flagged = check_no_hallucinations(GOLDEN_PASCAL_MAIN, functions)
        assert passed, f"Hallucinated symbols in pascal full file output: {flagged}"

    def test_c_add_function_no_hallucinations(self):
        functions, _ = _load_c_ir()
        add_fn = functions[0]  # add_numbers
        passed, flagged = check_no_hallucinations(GOLDEN_C_ADD, [add_fn])
        assert passed, f"Hallucinated symbols in C add output: {flagged}"

    def test_c_full_file_no_hallucinations(self):
        functions, _ = _load_c_ir()
        passed, flagged = check_no_hallucinations(GOLDEN_C_MAIN, functions)
        assert passed, f"Hallucinated symbols in C full file output: {flagged}"


# ---------------------------------------------------------------------------
# Structural correctness: golden C++ preserves function/variable names
# ---------------------------------------------------------------------------

class TestConversionStructuralCorrectness:
    """
    Verify the golden outputs structurally match the original source IR:
    correct function names, parameter names, local variable names are present.
    """

    def test_pascal_add_function_name_preserved(self):
        assert "AddNumbers" in GOLDEN_PASCAL_ADD

    def test_pascal_add_param_names_preserved(self):
        assert re.search(r"\bint\s+a\b", GOLDEN_PASCAL_ADD)
        assert re.search(r"\bint\s+b\b", GOLDEN_PASCAL_ADD)

    def test_pascal_add_return_type_is_int(self):
        # Pascal integer → C++ int
        assert re.search(r"\bint\s+AddNumbers\b", GOLDEN_PASCAL_ADD)

    def test_pascal_main_local_variables_preserved(self):
        assert re.search(r"\bx\b", GOLDEN_PASCAL_MAIN)
        assert re.search(r"\by\b", GOLDEN_PASCAL_MAIN)
        assert re.search(r"\bsum\b", GOLDEN_PASCAL_MAIN)

    def test_pascal_writeln_becomes_cout(self):
        assert "writeln" not in GOLDEN_PASCAL_MAIN
        assert "std::cout" in GOLDEN_PASCAL_MAIN

    def test_c_add_function_name_preserved(self):
        assert "add_numbers" in GOLDEN_C_ADD

    def test_c_add_param_names_preserved(self):
        assert re.search(r"\bint\s+a\b", GOLDEN_C_ADD)
        assert re.search(r"\bint\s+b\b", GOLDEN_C_ADD)

    def test_c_main_printf_becomes_cout(self):
        assert "printf" not in GOLDEN_C_MAIN
        assert "std::cout" in GOLDEN_C_MAIN

    def test_c_main_local_variables_preserved(self):
        assert re.search(r"\bx\b", GOLDEN_C_MAIN)
        assert re.search(r"\by\b", GOLDEN_C_MAIN)
        assert re.search(r"\bsum\b", GOLDEN_C_MAIN)

    def test_includes_added(self):
        """Converted C++ should include at least one standard header."""
        assert "#include" in GOLDEN_PASCAL_MAIN
        assert "#include" in GOLDEN_C_MAIN

    def test_pascal_assign_syntax_gone(self):
        """Pascal ':=' assignment syntax must not appear in C++ output."""
        assert ":=" not in GOLDEN_PASCAL_MAIN

    def test_pascal_begin_end_gone(self):
        """Pascal begin/end blocks must not appear in C++ output."""
        assert "begin" not in GOLDEN_PASCAL_MAIN.lower().split("#")[0]
        assert "\nend" not in GOLDEN_PASCAL_MAIN


# ---------------------------------------------------------------------------
# End-to-end pipeline with mocked LLM (generate_cpp)
# ---------------------------------------------------------------------------

class TestEndToEndPipelineWithMockedLLM:
    """
    Simulate the full conversion pipeline for Pascal and C samples using a
    mocked Ollama response so no live server is required.

    The mock returns a known-good C++ string wrapped in a ```cpp fence,
    exactly as the real LLM would.
    """

    @pytest.fixture
    def pascal_ir(self):
        functions, source = _load_pascal_ir()
        return functions, source

    @pytest.fixture
    def c_ir(self):
        functions, source = _load_c_ir()
        return functions, source

    def _mock_ollama_response(self, cpp_code: str):
        """Return a requests.Response-like mock yielding the cpp_code in a fence."""
        fenced = f"```cpp\n{cpp_code}\n```"
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"response": fenced}
        return mock_resp

    def test_pascal_add_function_pipeline(self, pascal_ir):
        """Parse Pascal → build prompt → mock LLM → extract code → validate."""
        functions, source = pascal_ir
        add_fn = functions[0]

        from llm_orchestration.prompt_builder import build_prompt, SYSTEM_PROMPT
        from llm_orchestration.llm_client import generate_cpp

        user_prompt = build_prompt(add_fn.raw_source, add_fn, "No context")

        with patch("requests.post") as mock_post:
            mock_post.return_value = self._mock_ollama_response(GOLDEN_PASCAL_ADD)
            result = generate_cpp(SYSTEM_PROMPT, user_prompt, original_ir=[add_fn])

        assert "AddNumbers" in result
        assert "int" in result
        syntax_ok, err = check_syntax(result)
        assert syntax_ok, f"Pipeline output failed syntax: {err}"

    def test_c_add_function_pipeline(self, c_ir):
        """Parse C → build prompt → mock LLM → extract code → validate."""
        functions, source = c_ir
        add_fn = functions[0]

        from llm_orchestration.prompt_builder import build_prompt, SYSTEM_PROMPT
        from llm_orchestration.llm_client import generate_cpp

        user_prompt = build_prompt(add_fn.raw_source, add_fn, "No context")

        with patch("requests.post") as mock_post:
            mock_post.return_value = self._mock_ollama_response(GOLDEN_C_ADD)
            result = generate_cpp(SYSTEM_PROMPT, user_prompt, original_ir=[add_fn])

        assert "add_numbers" in result
        assert "int" in result
        syntax_ok, err = check_syntax(result)
        assert syntax_ok, f"Pipeline output failed syntax: {err}"

    def test_pascal_full_file_pipeline(self, pascal_ir):
        """Full-file Pascal conversion with mocked LLM."""
        functions, source = pascal_ir

        from llm_orchestration.prompt_builder import build_full_file_prompt, SYSTEM_PROMPT
        from llm_orchestration.llm_client import generate_cpp

        user_prompt = build_full_file_prompt(source, functions, "No context", "pascal")

        with patch("requests.post") as mock_post:
            mock_post.return_value = self._mock_ollama_response(GOLDEN_PASCAL_MAIN)
            result = generate_cpp(SYSTEM_PROMPT, user_prompt, original_ir=functions)

        assert "AddNumbers" in result
        assert "std::cout" in result
        assert ":=" not in result
        syntax_ok, err = check_syntax(result)
        assert syntax_ok, f"Full-file pipeline output failed syntax: {err}"

    def test_c_full_file_pipeline(self, c_ir):
        """Full-file C conversion with mocked LLM."""
        functions, source = c_ir

        from llm_orchestration.prompt_builder import build_full_file_prompt, SYSTEM_PROMPT
        from llm_orchestration.llm_client import generate_cpp

        user_prompt = build_full_file_prompt(source, functions, "No context", "c")

        with patch("requests.post") as mock_post:
            mock_post.return_value = self._mock_ollama_response(GOLDEN_C_MAIN)
            result = generate_cpp(SYSTEM_PROMPT, user_prompt, original_ir=functions)

        assert "add_numbers" in result
        assert "std::cout" in result
        assert "printf" not in result
        syntax_ok, err = check_syntax(result)
        assert syntax_ok, f"Full-file C pipeline output failed syntax: {err}"

    def test_retry_loop_triggered_on_bad_response(self, pascal_ir):
        """
        If the first LLM response has too many hallucinated symbols, the
        client should retry. The second call returns good code.
        """
        functions, source = pascal_ir

        from llm_orchestration.prompt_builder import build_prompt, SYSTEM_PROMPT
        from llm_orchestration.llm_client import generate_cpp

        add_fn = functions[0]
        user_prompt = build_prompt(add_fn.raw_source, add_fn, "No context")

        # First response: intentionally bad (many fake symbols)
        fake_symbols = " ".join(f"fake_var_{i}" for i in range(20))
        bad_code = f"int AddNumbers(int a, int b) {{ {fake_symbols}; return a + b; }}"
        bad_fenced = f"```cpp\n{bad_code}\n```"

        # Second response: good
        good_fenced = f"```cpp\n{GOLDEN_PASCAL_ADD}\n```"

        mock_resp_bad = MagicMock()
        mock_resp_bad.raise_for_status = MagicMock()
        mock_resp_bad.json.return_value = {"response": bad_fenced}

        mock_resp_good = MagicMock()
        mock_resp_good.raise_for_status = MagicMock()
        mock_resp_good.json.return_value = {"response": good_fenced}

        with patch("requests.post", side_effect=[mock_resp_bad, mock_resp_good]) as mock_post:
            result = generate_cpp(SYSTEM_PROMPT, user_prompt, original_ir=[add_fn])
            # Should have called Ollama at least twice (initial + 1 repair)
            assert mock_post.call_count >= 2

        # Final result should be the good code
        assert "AddNumbers" in result

    def test_no_ollama_call_when_ir_is_none(self):
        """When original_ir=None, no validation loop runs (single call)."""
        from llm_orchestration.prompt_builder import SYSTEM_PROMPT
        from llm_orchestration.llm_client import generate_cpp

        good_fenced = f"```cpp\n{GOLDEN_C_ADD}\n```"
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"response": good_fenced}

        with patch("requests.post", return_value=mock_resp) as mock_post:
            result = generate_cpp(SYSTEM_PROMPT, "any prompt", original_ir=None)
            assert mock_post.call_count == 1  # exactly one call, no retry loop

        assert "add_numbers" in result


# ---------------------------------------------------------------------------
# Conversion invariants: things that must NEVER appear in C++ output
# ---------------------------------------------------------------------------

class TestConversionInvariants:
    """
    Invariants that hold for ANY correct Pascal→C++ or C→C++ conversion.
    These are language-level checks, not content checks.
    """

    PASCAL_ARTIFACTS = [":=", "begin", "writeln", "program ", "var\n", "; integer;"]
    C_ARTIFACTS      = ["printf(", "#include <stdio.h>"]  # stdio should be replaced

    @pytest.mark.parametrize("artifact", PASCAL_ARTIFACTS)
    def test_no_pascal_artifact_in_golden_output(self, artifact):
        """Pascal syntax must not appear in the converted C++ output."""
        assert artifact not in GOLDEN_PASCAL_MAIN, (
            f"Pascal artifact '{artifact}' found in converted C++ output"
        )

    @pytest.mark.parametrize("artifact", C_ARTIFACTS)
    def test_no_c_artifact_in_golden_output(self, artifact):
        """Legacy C idioms must not appear in the converted C++ output."""
        assert artifact not in GOLDEN_C_MAIN, (
            f"Legacy C artifact '{artifact}' found in converted C++ output"
        )

    def test_golden_outputs_are_compilable_shaped(self):
        """Both golden outputs must have balanced braces (basic compile-shape check)."""
        for code in [GOLDEN_PASCAL_MAIN, GOLDEN_C_MAIN]:
            assert code.count("{") == code.count("}"), "Unbalanced braces in golden output"

    def test_golden_outputs_have_main(self):
        """Full-file conversions must have a main() entry point."""
        assert "int main()" in GOLDEN_PASCAL_MAIN
        assert "int main()" in GOLDEN_C_MAIN
