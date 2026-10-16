"""Phase 6: Target code generation. Optimized TAC -> pseudo-assembly for a load/store VM with R0-R7.

Variables live in memory (MOV R1, x loads, MOV x, R1 stores); temporaries live in registers.
"""
import re

from .optimizer import literal

TEMP = re.compile(r"t\d+")
MNEMONIC = {
    "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "%": "MOD",
    "<": "CMPLT", "<=": "CMPLE", ">": "CMPGT", ">=": "CMPGE", "==": "CMPEQ", "!=": "CMPNE",
    "&&": "AND", "||": "OR", "neg": "NEG", "!": "NOT",
}
NUM_REGS = 8


class CodeGen:
    def __init__(self):
        self.asm, self.reg_of, self.next = [], {}, 0
        self.line = None

    def emit(self, text):
        self.asm.append({"text": text, "line": self.line})

    def alloc(self):
        # shortcut: plain round-robin, a statement needing more than 8 live registers would clobber one;
        # add spilling if the language grows function calls or very long expressions.
        r = f"R{self.next % NUM_REGS}"
        self.next += 1
        return r

    def value(self, a):
        """Operand for an ALU instruction: immediate, register, or a variable loaded into a register."""
        if literal(a) is not None:
            return f"#{a}"
        if TEMP.fullmatch(a):
            return self.reg_of[a]
        r = self.alloc()
        self.emit(f"MOV {r}, {a}")
        return r

    def store(self, res, r):
        if TEMP.fullmatch(res):
            self.reg_of[res] = r
        else:
            self.emit(f"MOV {res}, {r}")

    def gen(self, q):
        self.line = q["line"]
        op, a1, a2, res = q["op"], q["a1"], q["a2"], q["res"]
        if op == "label":
            self.emit(f"{res}:")
        elif op == "goto":
            self.emit(f"JMP {res}")
        elif op == "ifFalse":
            x = self.value(a1)
            if x.startswith("#"):
                r = self.alloc()
                self.emit(f"MOV {r}, {x}")
                x = r
            self.emit(f"CMP {x}, #0")
            self.emit(f"JE {res}")
        elif op == "print":
            self.emit(f"OUT {self.mem_or_value(a1)}")
        elif op == "param":
            self.emit(f"PUSH {self.mem_or_value(a1)}")
        elif op == "printf":
            self.emit(f"PRINTF {a1}, #{a2}")
        elif op == "=":
            if TEMP.fullmatch(a1) and not TEMP.fullmatch(res):
                self.emit(f"MOV {res}, {self.reg_of[a1]}")
            else:
                r = self.alloc()
                self.emit(f"MOV {r}, {self.mem_or_value(a1)}")
                self.store(res, r)
        elif op in ("neg", "!"):
            x = self.value(a1)
            r = self.alloc()
            self.emit(f"{MNEMONIC[op]} {r}, {x}")
            self.store(res, r)
        else:
            x, y = self.value(a1), self.value(a2)
            r = self.alloc()
            self.emit(f"{MNEMONIC[op]} {r}, {x}, {y}")
            self.store(res, r)

    def mem_or_value(self, a):
        """OUT/PUSH/MOV may read a variable straight from memory."""
        if literal(a) is None and not TEMP.fullmatch(a):
            return a
        return self.value(a)


def generate_asm(tac):
    cg = CodeGen()
    for q in tac:
        cg.gen(q)
    return cg.asm
