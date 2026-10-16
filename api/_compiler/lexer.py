"""Phase 1: Lexical analysis. One master regex with named groups."""
import re

from .errors import LexicalError

KEYWORDS = {"int", "float", "if", "else", "while", "printf", "print"}

# Order matters: longer operators before their prefixes, floats before ints.
TOKEN_SPEC = [
    ("NEWLINE", r"\n"),
    ("SKIP", r"[ \t\r]+"),
    ("COMMENT", r"//[^\n]*|/\*[\s\S]*?\*/"),
    ("FLOAT_LIT", r"\d+\.\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?"),
    ("INT_LIT", r"\d+"),
    ("STRING", r'"(?:[^"\\\n]|\\.)*"'),
    ("ID", r"[A-Za-z_]\w*"),
    ("LE", r"<="), ("GE", r">="), ("EQ", r"=="), ("NE", r"!="),
    ("AND", r"&&"), ("OR", r"\|\|"),
    ("LT", r"<"), ("GT", r">"), ("ASSIGN", r"="), ("NOT", r"!"),
    ("PLUS", r"\+"), ("MINUS", r"-"), ("MUL", r"\*"), ("DIV", r"/"), ("MOD", r"%"),
    ("LPAREN", r"\("), ("RPAREN", r"\)"), ("LBRACE", r"\{"), ("RBRACE", r"\}"),
    ("SEMI", r";"), ("COMMA", r","),
    ("MISMATCH", r"."),
]
MASTER = re.compile("|".join(f"(?P<{name}>{pat})" for name, pat in TOKEN_SPEC))


class Token:
    def __init__(self, kind, value, line, col):
        self.kind, self.value, self.line, self.col = kind, value, line, col

    def to_dict(self):
        return {"kind": self.kind, "value": self.value, "line": self.line, "col": self.col}

    def __repr__(self):
        return f"{self.kind}({self.value!r})@{self.line}:{self.col}"


def tokenize(src):
    tokens, line, line_start = [], 1, 0
    for m in MASTER.finditer(src):
        kind, value = m.lastgroup, m.group()
        col = m.start() - line_start + 1
        if kind == "NEWLINE":
            line, line_start = line + 1, m.end()
            continue
        if kind == "COMMENT":
            # block comments can span lines; keep line numbers right
            nl = value.count("\n")
            if nl:
                line, line_start = line + nl, m.start() + value.rfind("\n") + 1
            continue
        if kind == "SKIP":
            continue
        if kind == "MISMATCH":
            if value == "#":
                raise LexicalError("Preprocessor lines like #include are not supported, remove them", line, col)
            if value == '"':
                raise LexicalError("Unterminated string literal", line, col)
            raise LexicalError(f"Unexpected character {value!r}", line, col)
        if kind == "ID" and value in KEYWORDS:
            kind = value.upper()
        tokens.append(Token(kind, value, line, col))
    tokens.append(Token("EOF", "", line, len(src) - line_start + 1))
    return tokens
