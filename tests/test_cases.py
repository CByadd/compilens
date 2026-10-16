"""TC-01 .. TC-10 from report chapter 7. Run: python tests/test_cases.py  (or pytest)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from _compiler.optimizer import literal  # noqa: E402
from _compiler.pipeline import compile_source  # noqa: E402


def tac_text(code):
    return [(q["op"], q["a1"], q["a2"], q["res"]) for q in code]


def test_tc01_declarations():
    r = compile_source("int a; float b; a = 10; b = 3.14;")
    assert r["ok"], r
    assert [(s["name"], s["type"]) for s in r["symbols"]] == [("a", "int"), ("b", "float")]
    assert [c["kind"] for c in r["ast"]["children"]] == ["Decl", "Decl", "Assign", "Assign"]


def test_tc02_syntax_error_location():
    r = compile_source("int a; a = (5 + 3;")
    assert not r["ok"] and r["phase"] == "syntax"
    assert (r["error"]["line"], r["error"]["col"]) == (1, 18)
    assert "')'" in r["error"]["msg"]
    assert "tokens" in r  # earlier phase output still returned


def test_tc03_undeclared():
    r = compile_source("x = 10;")
    assert r["phase"] == "semantic" and "Undeclared variable 'x'" in r["error"]["msg"]


def test_tc04_redeclaration():
    r = compile_source("int a; int a;")
    assert r["phase"] == "semantic" and "Redeclaration of variable 'a'" in r["error"]["msg"]


def test_tc05_precedence():
    r = compile_source("int a; int b; a = 1; b = a + 3 * 2; print(b);")
    assert r["ok"], r
    plus = r["ast"]["children"][3]["children"][0]
    assert plus["value"] == "+" and plus["children"][1]["value"] == "*"
    assert ("*", "3", "2", "t1") in tac_text(r["tac"]) and ("+", "a", "t1", "t2") in tac_text(r["tac"])


def test_tc06_constant_folding():
    r = compile_source("int x; x = 4 + 6 * 2; print(x);")
    assert r["ok"], r
    assert tac_text(r["opt_tac"]) == [("=", "16", None, "x"), ("print", "x", None, None)]
    msgs = [t["msg"] for t in r["opt_trace"]]
    assert "Folded '6 * 2' -> 12" in msgs and "Folded '4 + 12' -> 16" in msgs


def test_tc07_dead_code():
    r = compile_source("int a; int b; a = 5; b = 10; print(a);")
    assert r["ok"], r
    assert ("=", "10", None, "b") not in tac_text(r["opt_tac"])
    assert any("'b'" in t["msg"] for t in r["opt_trace"])


def test_tc08_if_else():
    r = compile_source("int a; int b; a = 7; if (a > 5) { b = 1; } else { b = 2; } print(b);")
    assert r["ok"], r
    ops = [q["op"] for q in r["tac"]]
    assert ops == ["=", ">", "ifFalse", "=", "goto", "label", "=", "label", "print"]
    asm = [a["text"] for a in r["asm"]]
    assert "JE L1" in asm and "JMP L2" in asm and "L1:" in asm and "L2:" in asm


def test_tc09_while():
    r = compile_source("int i; int sum; i = 0; sum = 0; while (i < 5) { sum = sum + i; i = i + 1; } print(sum);")
    assert r["ok"], r
    asm = [a["text"] for a in r["asm"]]
    assert asm.index("L1:") < asm.index("JE L2") < asm.index("JMP L1") < asm.index("L2:")


def test_tc10_full_program():
    src = "int a; int s; a = 0; s = 0; while (a < 3) { s = s + a; a = a + 1; } print(s);"
    r = compile_source(src)
    assert r["ok"], r
    for key in ("tokens", "ast", "symbols", "tac", "opt_tac", "asm"):
        assert r[key], key
    # every artifact carries a source line for cross-phase highlighting
    assert all(x["line"] for key in ("tokens", "tac", "opt_tac", "asm") for x in r[key])


def test_errors_and_guards():
    assert compile_source("int a; a = 1 @ 2;")["phase"] == "lexical"
    assert "#include" in compile_source("#include <stdio.h>\nint a;")["error"]["msg"]
    assert "main" in compile_source("int main() { return 0; }")["error"]["msg"]
    assert "for" in compile_source("for (i = 0; i < 3; i = i + 1) {}")["error"]["msg"]
    deep = compile_source("int a; a = " + "(" * 3000 + "1" + ")" * 3000 + ";")
    assert not deep["ok"] and "deeply" in deep["error"]["msg"]
    assert compile_source("float f; f = 5 % 2.0;")["phase"] == "semantic"
    w = compile_source("int a; a = 2.5;")
    assert w["ok"] and "truncates" in w["warnings"][0]["msg"]


def test_c_semantics_in_folding():
    r = compile_source("int a; int b; a = -7 / 2; b = -7 % 2; print(a); print(b);")
    vals = {q["res"]: q["a1"] for q in r["opt_tac"] if q["op"] == "="}
    assert vals == {"a": "-3", "b": "-1"}
    assert "Kept" in compile_source("int a; a = 1 / 0; print(a);")["opt_trace"][0]["msg"]
    assert literal("inf") is None and literal("t1") is None and literal("2.5") == 2.5


def test_shadowing_gets_unique_ir_names():
    r = compile_source("int a; a = 1; { int a; a = 2; print(a); } print(a);")
    assert r["ok"], r
    assert [s["ir"] for s in r["symbols"]] == ["a", "a_2"]
    assert compile_source("int t1; t1 = 3; print(t1);")["opt_tac"][0]["res"] == "t1_1"


if __name__ == "__main__":
    tests = [f for name, f in sorted(globals().items()) if name.startswith("test_")]
    for t in tests:
        t()
    print(f"{len(tests)} tests passed")
