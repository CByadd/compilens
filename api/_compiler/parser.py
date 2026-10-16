"""Phase 2: Recursive-descent parser. One method per grammar rule (report §1.3)."""
from .errors import SyntaxErrorC


class Node:
    def __init__(self, kind, line, value=None, children=None, **extra):
        self.kind, self.line, self.value = kind, line, value
        self.children = children or []
        self.type = None  # filled in by semantic analysis
        self.__dict__.update(extra)

    def to_dict(self):
        d = {"kind": self.kind, "line": self.line}
        if self.value is not None:
            d["value"] = self.value
        if self.type:
            d["type"] = self.type
        d["children"] = [c.to_dict() for c in self.children]
        return d


# Friendly messages for real-C things students will type that the subset lacks.
UNSUPPORTED = {
    "for": "'for' loops are not supported, use while",
    "do": "'do-while' is not supported, use while",
    "return": "'return' is not supported (there are no functions)",
    "break": "'break' is not supported",
    "continue": "'continue' is not supported",
    "switch": "'switch' is not supported, use if/else",
    "scanf": "'scanf' is not supported, assign values directly",
    "char": "only int and float types are supported",
    "double": "only int and float types are supported",
    "long": "only int and float types are supported",
    "void": "only int and float types are supported",
}

BINARY_LEVELS = [
    {"OR"},
    {"AND"},
    {"EQ", "NE"},
    {"LT", "LE", "GT", "GE"},
    {"PLUS", "MINUS"},
    {"MUL", "DIV", "MOD"},
]


class Parser:
    def __init__(self, tokens):
        self.toks, self.i = tokens, 0

    @property
    def cur(self):
        return self.toks[self.i]

    def advance(self):
        tok = self.toks[self.i]
        if tok.kind != "EOF":
            self.i += 1
        return tok

    def expect(self, kind, text, hint=""):
        if self.cur.kind != kind:
            found = self.cur.value or "end of input"
            raise SyntaxErrorC(f"Expected '{text}' but found '{found}'{hint}", self.cur.line, self.cur.col)
        return self.advance()

    def parse(self):
        line = self.cur.line
        stmts = []
        while self.cur.kind != "EOF":
            stmts.append(self.stmt())
        return Node("Program", line, children=stmts)

    def stmt(self):
        t = self.cur
        if t.kind in ("INT", "FLOAT"):
            return self.decl()
        if t.kind == "IF":
            return self.if_stmt()
        if t.kind == "WHILE":
            return self.while_stmt()
        if t.kind in ("PRINT", "PRINTF"):
            return self.print_stmt()
        if t.kind == "LBRACE":
            return self.block()
        if t.kind == "ID":
            if t.value in UNSUPPORTED:
                raise SyntaxErrorC(UNSUPPORTED[t.value], t.line, t.col)
            return self.assign()
        raise SyntaxErrorC(f"Unexpected '{t.value or 'end of input'}' at start of statement", t.line, t.col)

    def decl(self):
        t = self.advance()
        name = self.expect("ID", "identifier")
        if self.cur.kind == "LPAREN":
            raise SyntaxErrorC("Functions (like main) are not supported, write statements at top level",
                               name.line, name.col)
        children = []
        if self.cur.kind == "ASSIGN":
            self.advance()
            children.append(self.expr())
        self.expect("SEMI", ";")
        return Node("Decl", t.line, f"{t.value} {name.value}", children, decl_type=t.value, name=name.value)

    def assign(self):
        name = self.advance()
        self.expect("ASSIGN", "=", " (++ and += are not supported, write x = x + 1)")
        e = self.expr()
        self.expect("SEMI", ";")
        return Node("Assign", name.line, name.value, [e], name=name.value)

    def if_stmt(self):
        t = self.advance()
        self.expect("LPAREN", "(")
        cond = self.expr()
        self.expect("RPAREN", ")")
        children = [cond, self.stmt()]
        if self.cur.kind == "ELSE":
            self.advance()
            children.append(self.stmt())
        return Node("If", t.line, children=children)

    def while_stmt(self):
        t = self.advance()
        self.expect("LPAREN", "(")
        cond = self.expr()
        self.expect("RPAREN", ")")
        return Node("While", t.line, children=[cond, self.stmt()])

    def print_stmt(self):
        t = self.advance()
        self.expect("LPAREN", "(")
        if t.kind == "PRINT":
            args = [self.expr()]
            node = Node("Print", t.line, children=args)
        else:
            fmt = self.expect("STRING", "format string")
            args = []
            while self.cur.kind == "COMMA":
                self.advance()
                args.append(self.expr())
            node = Node("Printf", t.line, fmt.value, args)
        self.expect("RPAREN", ")")
        self.expect("SEMI", ";")
        return node

    def block(self):
        t = self.advance()
        stmts = []
        while self.cur.kind not in ("RBRACE", "EOF"):
            stmts.append(self.stmt())
        self.expect("RBRACE", "}")
        return Node("Block", t.line, children=stmts)

    # Expressions: one loop per precedence level, loosest first.
    def expr(self, level=0):
        if level == len(BINARY_LEVELS):
            return self.unary()
        left = self.expr(level + 1)
        while self.cur.kind in BINARY_LEVELS[level]:
            op = self.advance()
            right = self.expr(level + 1)
            left = Node("BinOp", op.line, op.value, [left, right])
        return left

    def unary(self):
        if self.cur.kind in ("PLUS", "MINUS", "NOT"):
            op = self.advance()
            return Node("Unary", op.line, op.value, [self.unary()])
        return self.primary()

    def primary(self):
        t = self.cur
        if t.kind == "ID":
            self.advance()
            return Node("Var", t.line, t.value)
        if t.kind == "INT_LIT":
            self.advance()
            return Node("IntLit", t.line, t.value)
        if t.kind == "FLOAT_LIT":
            self.advance()
            return Node("FloatLit", t.line, t.value)
        if t.kind == "LPAREN":
            self.advance()
            e = self.expr()
            self.expect("RPAREN", ")")
            return e
        raise SyntaxErrorC(f"Expected an expression but found '{t.value or 'end of input'}'", t.line, t.col)


def parse(tokens):
    return Parser(tokens).parse()
