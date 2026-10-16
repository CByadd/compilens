class CompileError(Exception):
    phase = "internal"

    def __init__(self, msg, line=None, col=None):
        super().__init__(msg)
        self.msg, self.line, self.col = msg, line, col

    def to_dict(self):
        return {"msg": self.msg, "line": self.line, "col": self.col}


class LexicalError(CompileError):
    phase = "lexical"


class SyntaxErrorC(CompileError):
    phase = "syntax"


class SemanticError(CompileError):
    phase = "semantic"
