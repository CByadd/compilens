import { test } from 'node:test'
import assert from 'node:assert/strict'
import { explainAsm, explainQuad, formatQuad, highlightC, tokenCategory } from './format.js'

test('highlightC colours C by token category and keeps every character', () => {
  const src = 'int a; // note\na = 2.5 * x1;\nprintf("hi\\n", a);'
  const parts = highlightC(src)
  assert.equal(parts.map(([, t]) => t).join(''), src)
  const cls = Object.fromEntries(parts.filter(([c]) => c).map(([c, t]) => [t, c]))
  assert.equal(cls.int, 'tok-kw')
  assert.equal(cls.printf, 'tok-kw')
  assert.equal(cls.a, 'tok-id')
  assert.equal(cls.x1, 'tok-id')
  assert.equal(cls['2.5'], 'tok-lit')
  assert.equal(cls['"hi\\n"'], 'tok-lit')
  assert.equal(cls['// note'], 'hl-comment')
})

test('explainQuad', () => {
  const q = (op, a1, a2, res) => explainQuad({ op, a1, a2, res })
  assert.equal(q('=', '11', null, 'a'), 'Store the value 11 in a')
  assert.equal(q('=', 't2', null, 'a'), 'Copy t2 into a')
  assert.equal(q('>', 'a', 'b', 't3'), 't3 = 1 if a > b, otherwise 0')
  assert.equal(q('*', '3', '2', 't1'), 'Compute 3 * 2, save it in t1')
  assert.equal(q('ifFalse', 't3', null, 'L1'), 'If t3 is 0 (false), jump to L1')
})

test('explainAsm', () => {
  assert.equal(explainAsm('MOV R0, #11'), 'Put the number 11 into register R0')
  assert.equal(explainAsm('MOV a, R0'), 'Store R0 into variable a in memory')
  assert.equal(explainAsm('MOV R2, a'), 'Load variable a from memory into register R2')
  assert.equal(explainAsm('ADD R2, R1, #10'), 'R2 = R1 + 10')
  assert.equal(explainAsm('CMPGT R4, R2, R3'), 'R4 = 1 if R2 > R3, otherwise 0')
  assert.equal(explainAsm('CMP R4, #0'), 'Compare R4 with 0')
  assert.equal(explainAsm('JE L1'), 'If they were equal (the condition was false), jump to L1')
  assert.equal(explainAsm('L2:'), 'Label L2: a place jumps can go to')
  assert.equal(explainAsm('PRINTF "%d\\n", #1'), 'Call printf with 1 argument(s)')
})

test('formatQuad covers every TAC op the backend emits', () => {
  const q = (op, a1, a2, res) => formatQuad({ op, a1, a2, res })
  assert.equal(q('*', '3', '2', 't1'), 't1 = 3 * 2')
  assert.equal(q('=', 't1', null, 'x'), 'x = t1')
  assert.equal(q('label', null, null, 'L1'), 'L1:')
  assert.equal(q('goto', null, null, 'L2'), 'goto L2')
  assert.equal(q('ifFalse', 't3', null, 'L1'), 'ifFalse t3 goto L1')
  assert.equal(q('print', 'max', null, null), 'print max')
  assert.equal(q('param', 'x', null, null), 'param x')
  assert.equal(q('printf', '"%d"', '1', null), 'call printf, "%d", 1')
  assert.equal(q('neg', 'a', null, 't1'), 't1 = -a')
  assert.equal(q('!', 'a', null, 't1'), 't1 = !a')
})

test('tokenCategory', () => {
  assert.equal(tokenCategory('WHILE'), 'kw')
  assert.equal(tokenCategory('ID'), 'id')
  assert.equal(tokenCategory('FLOAT_LIT'), 'lit')
  assert.equal(tokenCategory('STRING'), 'lit')
  assert.equal(tokenCategory('LE'), 'op')
})
