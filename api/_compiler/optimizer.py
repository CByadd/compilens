"""Phase 5: Machine-independent optimization over TAC, with a human-readable trace.

1. Constant folding (+ propagating folded temporaries into later uses).
   Temporaries are assigned exactly once by the ICG, so propagating them is always safe.
2. Dead-code elimination: drop assignments whose target is never read, repeated until nothing changes.
   Safe because every TAC expression is side-effect free.
"""
import re

TEMP = re.compile(r"t\d+")
BINARY = {"+", "-", "*", "/", "%", "<", "<=", ">", ">=", "==", "!=", "&&", "||"}
UNARY = {"neg", "!"}
EFFECTS = {"label", "goto", "ifFalse", "print", "param", "printf"}


def literal(s):
    """Return the int/float value of a literal operand, or None for names/strings."""
    if not s or s[0] not in "0123456789.-":
        return None
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return None


def c_div(a, b):
    if isinstance(a, float) or isinstance(b, float):
        return a / b
    q = abs(a) // abs(b)  # C truncates toward zero
    return q if (a >= 0) == (b >= 0) else -q


def evaluate(op, a, b=None):
    if op in ("/", "%") and b == 0:
        raise ZeroDivisionError
    return {
        "+": lambda: a + b, "-": lambda: a - b, "*": lambda: a * b,
        "/": lambda: c_div(a, b), "%": lambda: a - b * c_div(a, b),
        "<": lambda: int(a < b), "<=": lambda: int(a <= b),
        ">": lambda: int(a > b), ">=": lambda: int(a >= b),
        "==": lambda: int(a == b), "!=": lambda: int(a != b),
        "&&": lambda: int(bool(a) and bool(b)), "||": lambda: int(bool(a) or bool(b)),
        "neg": lambda: -a, "!": lambda: int(not a),
    }[op]()


def show(op, a1, a2):
    if op == "neg":
        return f"-{a1}"
    if op == "!":
        return f"!{a1}"
    return f"{a1} {op} {a2}"


def optimize(code):
    trace, consts, out = [], {}, []

    for i, q in enumerate(code):
        q = dict(q, src=i)  # index of the raw quad, so the UI can show what changed or was removed
        for k in ("a1", "a2"):
            if q[k] in consts:
                trace.append({"msg": f"Propagated constant {q[k]} = {consts[q[k]]}", "line": q["line"]})
                q[k] = consts[q[k]]
        op = q["op"]
        if op in BINARY or op in UNARY:
            a, b = literal(q["a1"]), literal(q["a2"])
            if a is not None and (op in UNARY or b is not None):
                expr = show(op, q["a1"], q["a2"])
                try:
                    v = evaluate(op, a, b)
                except ZeroDivisionError:
                    trace.append({"msg": f"Kept '{expr}': division by zero is left for run time", "line": q["line"]})
                else:
                    v = repr(v) if isinstance(v, float) else str(v)
                    trace.append({"msg": f"Folded '{expr}' -> {v}", "line": q["line"]})
                    q.update(op="=", a1=v, a2=None)
        if q["op"] == "=" and TEMP.fullmatch(q["res"]) and literal(q["a1"]) is not None:
            consts[q["res"]] = q["a1"]
        out.append(q)

    changed = True
    while changed:
        used = {q[k] for q in out for k in ("a1", "a2") if q[k]}
        kept = []
        for q in out:
            if q["op"] not in EFFECTS and q["res"] not in used:
                kind = "temporary" if TEMP.fullmatch(q["res"]) else "variable"
                trace.append({"msg": f"Removed dead assignment to {kind} '{q['res']}' (value never used)",
                              "line": q["line"]})
            else:
                kept.append(q)
        changed = len(kept) != len(out)
        out = kept

    return out, trace
