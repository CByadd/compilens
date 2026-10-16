"""Phase 4: Intermediate code generation. AST -> Three-Address Code quadruples.

Quad shape: {"op", "a1", "a2", "res", "line"}. Ops:
  + - * / % < <= > >= == != && ||   res = a1 op a2
  neg  !                            res = op a1
  =                                 res = a1
  label / goto                      res is the label
  ifFalse                           if a1 == 0 goto res
  print                             print a1
  param, printf                     param a1 ... ; printf a1(format), a2(arg count)
"""


class TACGenerator:
    def __init__(self):
        self.code, self.temps, self.labels = [], 0, 0

    def emit(self, op, a1=None, a2=None, res=None, line=None):
        self.code.append({"op": op, "a1": a1, "a2": a2, "res": res, "line": line})

    def new_temp(self):
        self.temps += 1
        return f"t{self.temps}"

    def new_label(self):
        self.labels += 1
        return f"L{self.labels}"

    def gen(self, node):
        getattr(self, "gen_" + node.kind)(node)
        return self.code

    def gen_Program(self, node):
        for c in node.children:
            self.gen(c)

    gen_Block = gen_Program

    def gen_Decl(self, node):
        if node.children:
            self.emit("=", self.expr(node.children[0]), res=node.ir, line=node.line)

    gen_Assign = gen_Decl

    def gen_If(self, node):
        cond = self.expr(node.children[0])
        has_else = len(node.children) == 3
        else_label = self.new_label()
        end_label = self.new_label() if has_else else else_label
        self.emit("ifFalse", cond, res=else_label, line=node.line)
        self.gen(node.children[1])
        if has_else:
            self.emit("goto", res=end_label, line=node.line)
            self.emit("label", res=else_label, line=node.line)
            self.gen(node.children[2])
        self.emit("label", res=end_label, line=node.line)

    def gen_While(self, node):
        start, end = self.new_label(), self.new_label()
        self.emit("label", res=start, line=node.line)
        cond = self.expr(node.children[0])
        self.emit("ifFalse", cond, res=end, line=node.line)
        self.gen(node.children[1])
        self.emit("goto", res=start, line=node.line)
        self.emit("label", res=end, line=node.line)

    def gen_Print(self, node):
        self.emit("print", self.expr(node.children[0]), line=node.line)

    def gen_Printf(self, node):
        args = [self.expr(c) for c in node.children]
        for a in args:
            self.emit("param", a, line=node.line)
        self.emit("printf", node.value, str(len(args)), line=node.line)

    def expr(self, node):
        """Emit code for an expression and return the address holding its value."""
        if node.kind in ("IntLit", "FloatLit"):
            return node.value
        if node.kind == "Var":
            return node.ir
        if node.kind == "Unary":
            a = self.expr(node.children[0])
            if node.value == "+":
                return a
            t = self.new_temp()
            self.emit("neg" if node.value == "-" else "!", a, res=t, line=node.line)
            return t
        left = self.expr(node.children[0])
        right = self.expr(node.children[1])
        t = self.new_temp()
        self.emit(node.value, left, right, t, node.line)
        return t


def generate(ast):
    return TACGenerator().gen(ast)
