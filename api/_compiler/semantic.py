"""Phase 3: Semantic analysis. Tree-walking visitor over a chain of scoped symbol tables."""
import re

from .errors import SemanticError


class SymbolTable:
    def __init__(self, scope_id, parent=None):
        self.id, self.parent, self.symbols = scope_id, parent, {}
        self.depth = parent.depth + 1 if parent else 0

    def define(self, name, info):
        self.symbols[name] = info

    def lookup(self, name):
        table = self
        while table:
            if name in table.symbols:
                return table.symbols[name]
            table = table.parent
        return None


class SemanticAnalyzer:
    def __init__(self):
        self.records, self.warnings = [], []
        self.scope_count = 0
        self.scope = SymbolTable(0)
        self.decl_count = {}

    def warn(self, msg, line):
        self.warnings.append({"msg": msg, "line": line})

    def analyze(self, node):
        getattr(self, "visit_" + node.kind)(node)
        return self.records, self.warnings

    def visit(self, node):
        return getattr(self, "visit_" + node.kind)(node)

    def visit_Program(self, node):
        for c in node.children:
            self.visit(c)

    def visit_Block(self, node):
        self.scope_count += 1
        self.scope = SymbolTable(self.scope_count, self.scope)
        for c in node.children:
            self.visit(c)
        self.scope = self.scope.parent

    def visit_Decl(self, node):
        if node.children:
            self.check_assign(node.decl_type, self.visit(node.children[0]), node.name, node.line)
        prev = self.scope.symbols.get(node.name)
        if prev:
            raise SemanticError(f"Redeclaration of variable '{node.name}' (first declared on line {prev['line']})",
                                node.line)
        # Shadowed names, and user names that look like ICG temporaries (t1, t2...), get a
        # distinct IR name so TAC/asm stay unambiguous.
        # shortcut: a user variable literally named e.g. "a_2" could collide; rename scheme if that matters.
        n = self.decl_count.get(node.name, 0) + 1
        self.decl_count[node.name] = n
        ir = node.name if n == 1 and not re.fullmatch(r"t\d+", node.name) else f"{node.name}_{n}"
        info = {"scope": self.scope.id, "depth": self.scope.depth, "name": node.name,
                "type": node.decl_type, "line": node.line, "ir": ir}
        self.scope.define(node.name, info)
        self.records.append(info)
        node.ir, node.type = ir, node.decl_type

    def visit_Assign(self, node):
        info = self.lookup(node.name, node.line)
        self.check_assign(info["type"], self.visit(node.children[0]), node.name, node.line)
        node.ir, node.type = info["ir"], info["type"]

    def check_assign(self, target, value, name, line):
        if target == "int" and value == "float":
            self.warn(f"Assigning float to int '{name}' truncates the fractional part", line)

    def visit_If(self, node):
        for c in node.children:
            self.visit(c)

    visit_While = visit_If

    def visit_Print(self, node):
        self.visit(node.children[0])

    def visit_Printf(self, node):
        for c in node.children:
            self.visit(c)
        specs = len(re.findall(r"%[dif]", node.value))
        if specs != len(node.children):
            self.warn(f"printf has {specs} format specifier(s) but {len(node.children)} argument(s)", node.line)

    def visit_BinOp(self, node):
        lt, rt = (self.visit(c) for c in node.children)
        if node.value == "%" and "float" in (lt, rt):
            raise SemanticError("Operator '%' needs int operands", node.line)
        if node.value in ("+", "-", "*", "/", "%"):
            node.type = "float" if "float" in (lt, rt) else "int"
        else:
            node.type = "int"  # relational and logical results are 0/1
        return node.type

    def visit_Unary(self, node):
        t = self.visit(node.children[0])
        node.type = "int" if node.value == "!" else t
        return node.type

    def visit_Var(self, node):
        info = self.lookup(node.value, node.line)
        node.ir, node.type = info["ir"], info["type"]
        return node.type

    def visit_IntLit(self, node):
        node.type = "int"
        return "int"

    def visit_FloatLit(self, node):
        node.type = "float"
        return "float"

    def lookup(self, name, line):
        info = self.scope.lookup(name)
        if not info:
            raise SemanticError(f"Undeclared variable '{name}'", line)
        return info
