"""Runs the six phases in order and returns everything the UI needs as one JSON-able dict.

On a compile error the dict still holds the output of every phase that finished before it.
"""
import time

from .codegen import generate_asm
from .errors import CompileError
from .icg import generate
from .lexer import tokenize
from .optimizer import optimize
from .parser import parse
from .semantic import SemanticAnalyzer


def compile_source(src):
    start = time.perf_counter()
    out, phase = {}, "lexical"
    try:
        tokens = tokenize(src)
        out["tokens"] = [t.to_dict() for t in tokens]

        phase = "syntax"
        ast = parse(tokens)
        out["ast"] = ast.to_dict()

        phase = "semantic"
        sem = SemanticAnalyzer()
        try:
            sem.analyze(ast)
        finally:
            out["symbols"], out["warnings"] = sem.records, sem.warnings
        out["ast"] = ast.to_dict()  # again, now annotated with types

        phase = "internal"
        out["tac"] = generate(ast)
        out["opt_tac"], out["opt_trace"] = optimize(out["tac"])
        out["asm"] = generate_asm(out["opt_tac"])
        out["ok"] = True
    except CompileError as e:
        out.update(ok=False, phase=e.phase, error=e.to_dict())
    except RecursionError:
        out.update(ok=False, phase=phase, error={"msg": "Program is nested too deeply", "line": None, "col": None})
    out["ms"] = round((time.perf_counter() - start) * 1000, 2)
    return out
