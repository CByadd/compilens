export const SAMPLES = [
  {
    name: 'Walkthrough: max of two (report §8.1)',
    code: `int a; int b; int max;
a = 5 + 3 * 2;      // constant folding: 3 * 2 -> 6, 5 + 6 -> 11
b = 10;
if (a > b) {
    max = a;
} else {
    max = b;
}
print(max);`,
  },
  {
    name: 'While loop: sum 0..4',
    code: `int i; int sum;
i = 0;
sum = 0;
while (i < 5) {
    sum = sum + i;
    i = i + 1;
}
printf("sum = %d\\n", sum);`,
  },
  {
    name: 'Operator precedence',
    code: `int a; int b;
a = 4;
b = a + 3 * 2 - (a - 1) / 3;
print(b);`,
  },
  {
    name: 'Constant folding',
    code: `int x;
x = 4 + 6 * 2;
print(x);`,
  },
  {
    name: 'Dead code elimination',
    code: `int a; int b;
a = 5;
b = 10;     // b is never read, so the optimizer removes it
print(a);`,
  },
  {
    name: 'Floats and type widening',
    code: `float r; float area; int whole;
r = 2.5;
area = 3.14 * r * r;
whole = area;       // warning: float -> int truncates
printf("area = %f, whole = %d\\n", area, whole);`,
  },
  {
    name: 'Nested scopes and shadowing',
    code: `int a;
a = 1;
{
    int a;          // a new 'a' in an inner scope
    a = 2;
    print(a);
}
print(a);`,
  },
  {
    name: 'Error: missing parenthesis',
    code: `int a;
a = (5 + 3;`,
  },
  {
    name: 'Error: undeclared variable',
    code: `int a;
a = 1;
x = a + 10;`,
  },
  {
    name: 'Error: redeclaration',
    code: `int a;
int a;`,
  },
]

export const GRAMMARS = [
  {
    name: 'S → C C (works in all five)',
    grammar: `S -> C C
C -> c C | d`,
    input: 'c c d d',
  },
  {
    name: 'Expressions, LL(1) form (all but LR(0))',
    grammar: `E  -> T E'
E' -> + T E' | ε
T  -> F T'
T' -> * F T' | ε
F  -> ( E ) | id`,
    input: 'id + id * id',
  },
  {
    name: 'Expressions, left-recursive (SLR(1) and up)',
    grammar: `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`,
    input: 'id + id * id',
  },
  {
    name: 'Lists (every LR parser, not LL(1))',
    grammar: `S -> ( L ) | x
L -> S | L , S`,
    input: '( x , ( x , x ) )',
  },
  {
    name: 'Balanced parentheses (all but LR(0))',
    grammar: `S -> ( S ) S | ε`,
    input: '( ( ) ) ( )',
  },
  {
    name: 'Assignments S → L = R (LALR(1) and CLR(1) only)',
    grammar: `S -> L = R | R
L -> * R | id
R -> L`,
    input: '* id = id',
  },
  {
    name: 'LALR merge conflict (CLR(1) only)',
    grammar: `S -> a A d | b B d | a B e | b A e
A -> c
B -> c`,
    input: 'a c e',
  },
  {
    name: 'Dangling else (ambiguous: fails all five)',
    grammar: `S -> i E t S | i E t S e S | a
E -> b`,
    input: 'i b t i b t a e a',
  },
]
