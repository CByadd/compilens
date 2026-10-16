// Short beginner programs with plain names; each one shows something different in the phases.
export const SAMPLES = [
  {
    name: 'Add two numbers',
    code: `int a; int b; int sum;
a = 5;
b = 3;
sum = a + b;
print(sum);`,
  },
  {
    name: 'Find the bigger number',
    code: `int a; int b; int max;
a = 7;
b = 4;
if (a > b) {
    max = a;
} else {
    max = b;
}
print(max);`,
  },
  {
    name: 'Even or odd',
    code: `int n;
n = 7;
if (n % 2 == 0) {
    printf("even\\n");
} else {
    printf("odd\\n");
}`,
  },
  {
    name: 'Count from 1 to 5',
    code: `int i;
i = 1;
while (i <= 5) {
    print(i);
    i = i + 1;
}`,
  },
  {
    name: 'Sum of 1 to 10',
    code: `int i; int sum;
i = 1;
sum = 0;
while (i <= 10) {
    sum = sum + i;
    i = i + 1;
}
print(sum);`,
  },
  {
    name: 'Area of a circle',
    code: `float r; float area;
r = 2.5;
area = 3.14 * r * r;
print(area);`,
  },
  {
    name: 'Math done early (4 + 6 * 2)',
    code: `int x;
x = 4 + 6 * 2;
print(x);`,
  },
  {
    name: 'Mistake: missing semicolon',
    code: `int a;
a = 5
print(a);`,
  },
  {
    name: 'Mistake: variable not declared',
    code: `int a;
a = 5;
b = a + 1;`,
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
