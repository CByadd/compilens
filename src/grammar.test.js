import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildLL1, buildLR, parseGrammar, parseLL1, parseLR, tokenizeInput } from './grammar.js'

const EXPR_LL = `E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`
const EXPR_LR = `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`
const SCC = `S -> C C
C -> c C | d`
const APPEL = `S -> ( L ) | x
L -> S | L , S`

const sorted = set => [...set].sort()

test('FIRST and FOLLOW match the Dragon Book (expression grammar)', () => {
  const ll = buildLL1(parseGrammar(EXPR_LL))
  assert.deepEqual(sorted(ll.first.E), ['(', 'id'])
  assert.deepEqual(sorted(ll.first["E'"]), ['+', 'ε'])
  assert.deepEqual(sorted(ll.first["T'"]), ['*', 'ε'])
  assert.deepEqual(sorted(ll.follow.E), ['$', ')'])
  assert.deepEqual(sorted(ll.follow["E'"]), ['$', ')'])
  assert.deepEqual(sorted(ll.follow.T), ['$', ')', '+'])
  assert.deepEqual(sorted(ll.follow.F), ['$', ')', '*', '+'])
  assert.equal(ll.conflicts.length, 0)
})

test('LL(1) parse accepts and rejects', () => {
  const g = parseGrammar(EXPR_LL), ll = buildLL1(g)
  assert.equal(parseLL1(g, ll, tokenizeInput('id + id * id', g.ts)).accepted, true)
  const bad = parseLL1(g, ll, tokenizeInput('id + * id', g.ts))
  assert.equal(bad.accepted, false)
  assert.match(bad.steps.at(-1).action, /no rule for T/)
})

test('left recursion gives LL(1) conflicts and a hint', () => {
  const ll = buildLL1(parseGrammar(EXPR_LR))
  assert.ok(ll.conflicts.length > 0)
  assert.ok(ll.hints.some(h => h.includes('left-recursive')))
})

test('LR(0) canonical collection sizes match the textbooks', () => {
  assert.equal(buildLR(parseGrammar(EXPR_LR)).states.length, 12) // Dragon Book I0..I11
  assert.equal(buildLR(parseGrammar(SCC)).states.length, 7)
  assert.equal(buildLR(parseGrammar(APPEL)).states.length, 9) // Appel fig. 3.20
})

test('LR(0) conflicts: expression grammar has shift/reduce, S -> C C has none', () => {
  assert.ok(buildLR(parseGrammar(EXPR_LR)).states.some(s => s.conflict === 'shift/reduce'))
  assert.ok(buildLR(parseGrammar(SCC)).states.every(s => !s.conflict))
})

test('LR(0) parse', () => {
  const g = parseGrammar(SCC), lr = buildLR(g)
  const ok = parseLR(lr, tokenizeInput('c d d', g.ts))
  assert.equal(ok.accepted, true)
  assert.equal(ok.steps[0].action, 'Shift c, go to state 3')
  assert.equal(parseLR(lr, tokenizeInput('c d', g.ts)).accepted, false)
  const a = parseGrammar(APPEL)
  assert.equal(parseLR(buildLR(a), tokenizeInput('(x,(x,x))', a.ts)).accepted, true)
})

test('epsilon rules reduce without popping', () => {
  const g = parseGrammar('S -> a S | ε')
  const lr = buildLR(g)
  assert.equal(lr.states[0].conflict, 'shift/reduce') // S -> . reduces on every token, including a
  assert.equal(parseLR(lr, ['a', 'a']).accepted, true)
  assert.equal(parseLL1(g, buildLL1(g), ['a', 'a']).accepted, true)
})

test('grammar input errors and tokenizer', () => {
  assert.throws(() => parseGrammar('E E + T'), /Line 1/)
  assert.throws(() => parseGrammar(''), /at least one rule/)
  assert.throws(() => parseGrammar('S -> a $'), /reserved/)
  assert.deepEqual(tokenizeInput('id+id*id', ['id', '+', '*']), ['id', '+', 'id', '*', 'id'])
  assert.throws(() => tokenizeInput('id - id', ['id', '+']), /"-" is not a terminal/)
  assert.deepEqual(parseGrammar('S -> A b').warnings.length, 1)
})

test('SLR(1) removes the LR(0) conflicts of the expression grammar (Dragon Book)', () => {
  const g = parseGrammar(EXPR_LR), slr = buildLR(g, 'slr')
  assert.ok(slr.states.every(s => !s.conflict))
  assert.deepEqual(slr.action[2], { '+': ['r2'], '*': ['s7'], '(': [], ')': ['r2'], id: [], $: ['r2'] }) // I2: E -> T . , T -> T . * F
  assert.equal(parseLR(slr, tokenizeInput('id + id * id', g.ts)).accepted, true)
  assert.equal(parseLR(slr, tokenizeInput('id + * id', g.ts)).accepted, false)
})

test('SLR(1) on epsilon grammars and the dangling else', () => {
  const parens = parseGrammar('S -> ( S ) S | ε')
  assert.ok(buildLR(parens, 'slr').states.every(s => !s.conflict))
  assert.equal(parseLR(buildLR(parens, 'slr'), tokenizeInput('( ( ) ) ( )', parens.ts)).accepted, true)
  const dangling = parseGrammar(`S -> i E t S | i E t S e S | a
E -> b`)
  assert.ok(buildLR(dangling, 'slr').states.some(s => s.conflict === 'shift/reduce')) // ambiguous: no LR parser fixes it
})

const ASSIGN = `S -> L = R | R
L -> * R | id
R -> L`
const MERGE = `S -> a A d | b B d | a B e | b A e
A -> c
B -> c`

test('CLR(1) and LALR(1) state counts match the Dragon Book', () => {
  assert.equal(buildLR(parseGrammar(SCC), 'clr').states.length, 10) // I0..I9
  assert.equal(buildLR(parseGrammar(SCC), 'lalr').states.length, 7) // I36, I47, I89 merged
  assert.equal(buildLR(parseGrammar(ASSIGN), 'clr').states.length, 14) // I0..I13
  assert.equal(buildLR(parseGrammar(ASSIGN), 'lalr').states.length, 10)
  const lalr = buildLR(parseGrammar(SCC), 'lalr')
  assert.deepEqual(lalr.states.filter(s => s.merged.length > 1).map(s => s.merged), [[3, 6], [4, 7], [8, 9]])
})

test('LR(1) lookaheads in the closure', () => {
  const clr = buildLR(parseGrammar(SCC), 'clr')
  // I0: [S' -> .S, $] [S -> .CC, $] [C -> .cC, c/d] [C -> .d, c/d]
  assert.deepEqual(clr.states[0].items, [[0, 0, ['$']], [1, 0, ['$']], [2, 0, ['c', 'd']], [3, 0, ['c', 'd']]])
})

test('the hierarchy: S -> L = R is LALR(1) but not SLR(1); the merge grammar is CLR(1) but not LALR(1)', () => {
  const a = parseGrammar(ASSIGN)
  assert.ok(buildLR(a, 'slr').states.some(s => s.conflict === 'shift/reduce'))
  for (const k of ['lalr', 'clr']) {
    const lr = buildLR(a, k)
    assert.ok(lr.states.every(s => !s.conflict), k)
    assert.equal(parseLR(lr, tokenizeInput('* id = id', a.ts)).accepted, true, k)
  }
  const m = parseGrammar(MERGE)
  assert.ok(buildLR(m, 'clr').states.every(s => !s.conflict))
  assert.ok(buildLR(m, 'lalr').states.some(s => s.conflict === 'reduce/reduce'))
  assert.equal(parseLR(buildLR(m, 'clr'), tokenizeInput('a c e', m.ts)).accepted, true)
  assert.equal(parseLR(buildLR(m, 'clr'), tokenizeInput('a c c', m.ts)).accepted, false)
})
