// Grammar algorithms for the Parser Lab: FIRST/FOLLOW, LL(1) table + parse, LR(0)/SLR(1)/LALR(1)/CLR(1) states, tables + parse.
// Pure functions, no React, so they are easy to test (grammar.test.js).

export const EPS = 'ε'
const EPS_WORDS = new Set(['ε', 'eps', 'epsilon', 'λ', "''"])
const MAX_STEPS = 1000

// "E -> E + T | T" per line. Symbols are space separated. Left side of the first rule is the start symbol.
export function parseGrammar(text) {
  const prods = [], nts = [], warnings = []
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$|#.*$/, '').trim()
    if (!line) return
    const m = line.match(/^(\S+)\s*(?:->|→|::=)\s*(.*)$/)
    if (!m) throw new Error(`Line ${i + 1}: write rules as  A -> x y | z`)
    const lhs = m[1]
    if (lhs === '$') throw new Error(`Line ${i + 1}: $ is reserved for end of input`)
    if (!nts.includes(lhs)) nts.push(lhs)
    for (const alt of m[2].split('|')) {
      const syms = alt.trim().split(/\s+/).filter(Boolean)
      if (syms.includes('$')) throw new Error(`Line ${i + 1}: $ is reserved for end of input`)
      prods.push({ lhs, rhs: syms.length === 1 && EPS_WORDS.has(syms[0]) ? [] : syms })
    }
  })
  if (!prods.length) throw new Error('Write at least one rule, for example  S -> a S | b')
  const ts = []
  for (const p of prods) {
    for (const s of p.rhs) {
      if (EPS_WORDS.has(s)) throw new Error(`${p.lhs} → … ${s} …: ε must be on its own, as a whole alternative`)
      if (!nts.includes(s) && !ts.includes(s)) {
        ts.push(s)
        if (/^[A-Z]/.test(s)) warnings.push(`${s} has no rules, so it is treated as a terminal (a token)`)
      }
    }
  }
  return { prods, nts, ts, start: nts[0], warnings }
}

export const showRhs = rhs => (rhs.length ? rhs.join(' ') : EPS)
export const showProd = p => `${p.lhs} → ${showRhs(p.rhs)}`

export function firstFollow({ prods, nts, ts, start }) {
  const first = {}, follow = {}
  for (const t of ts) first[t] = new Set([t])
  for (const A of nts) { first[A] = new Set(); follow[A] = new Set() }
  follow[start].add('$')

  const firstOfSeq = seq => {
    const out = new Set()
    for (const X of seq) {
      for (const a of first[X]) if (a !== EPS) out.add(a)
      if (!first[X].has(EPS)) return out
    }
    out.add(EPS)
    return out
  }
  const addAll = (target, src) => {
    const n = target.size
    for (const x of src) target.add(x)
    return target.size !== n
  }

  for (let changed = true; changed;) {
    changed = false
    for (const p of prods) changed = addAll(first[p.lhs], firstOfSeq(p.rhs)) || changed
  }
  for (let changed = true; changed;) {
    changed = false
    for (const p of prods) {
      p.rhs.forEach((B, i) => {
        if (!nts.includes(B)) return
        const rest = firstOfSeq(p.rhs.slice(i + 1))
        for (const a of rest) if (a !== EPS) changed = addAll(follow[B], [a]) || changed
        if (rest.has(EPS)) changed = addAll(follow[B], follow[p.lhs]) || changed
      })
    }
  }
  return { first, follow, firstOfSeq }
}

// ---------- LL(1) ----------

export function buildLL1(g) {
  const { first, follow, firstOfSeq } = firstFollow(g)
  const cols = [...g.ts, '$']
  const table = Object.fromEntries(g.nts.map(A => [A, Object.fromEntries(cols.map(a => [a, []]))]))
  g.prods.forEach((p, i) => {
    const f = firstOfSeq(p.rhs)
    for (const a of f) if (a !== EPS) table[p.lhs][a].push(i)
    if (f.has(EPS)) for (const b of follow[p.lhs]) table[p.lhs][b].push(i)
  })
  for (const A of g.nts) for (const a of cols) table[A][a] = [...new Set(table[A][a])]
  const conflicts = g.nts.flatMap(A => cols.filter(a => table[A][a].length > 1).map(a => [A, a]))

  const hints = []
  for (const A of g.nts) {
    const alts = g.prods.filter(p => p.lhs === A)
    if (alts.some(p => p.rhs[0] === A)) hints.push(`${A} is left-recursive (${A} → ${A} …). LL(1) can never handle that; rewrite it with a new ${A}' rule.`)
    const heads = alts.map(p => p.rhs[0]).filter(Boolean)
    const dup = heads.find((h, i) => heads.indexOf(h) !== i && h !== A)
    if (dup) hints.push(`Two ${A} alternatives start with ${dup}. Left-factor them into ${A} → ${dup} ${A}' .`)
  }
  return { first, follow, table, cols, conflicts, hints }
}

export function parseLL1(g, ll, tokens) {
  const input = [...tokens, '$']
  const stack = ['$', g.start]
  const steps = []
  let pos = 0
  const row = action => steps.push({ stack: stack.join(' '), input: input.slice(pos).join(' '), action })
  while (steps.length < MAX_STEPS) {
    const X = stack[stack.length - 1], a = input[pos]
    if (X === '$' && a === '$') { row('Accept'); return { steps, accepted: true } }
    if (X === '$') { row(`Error: extra input ${a} after a complete parse`); return { steps, accepted: false } }
    if (!g.nts.includes(X)) {
      if (X !== a) { row(`Error: expected ${X} but found ${a === '$' ? 'end of input' : a}`); return { steps, accepted: false } }
      row(`Match ${a}`)
      stack.pop(); pos++
      continue
    }
    const [i] = ll.table[X][a] ?? []
    if (i === undefined) { row(`Error: no rule for ${X} when the next token is ${a}`); return { steps, accepted: false } }
    row(`Use ${showProd(g.prods[i])}`)
    stack.pop()
    stack.push(...[...g.prods[i].rhs].reverse())
  }
  steps.push({ stack: '', input: '', action: `Stopped after ${MAX_STEPS} steps` })
  return { steps, accepted: false }
}

// ---------- LR(0), SLR(1), LALR(1), CLR(1) ----------
// LR(0) and SLR(1) share the LR(0) item sets and differ only in where a complete item puts its reduce.
// CLR(1) items also carry one lookahead token; LALR(1) merges CLR(1) states whose items match apart from lookaheads.

export const LR_NAMES = { lr0: 'LR(0)', slr: 'SLR(1)', lalr: 'LALR(1)', clr: 'CLR(1)' }
const MAX_STATES = 400

export function buildLR(g, kind = 'lr0') {
  let aug = g.start + "'"
  while (g.nts.includes(aug)) aug += "'"
  const prods = [{ lhs: aug, rhs: [g.start] }, ...g.prods] // production 0 is the augmented start
  const isNT = s => s === aug || g.nts.includes(s)
  const lr1 = kind === 'clr' || kind === 'lalr'
  const { follow, firstOfSeq } = firstFollow(g)
  const itemKey = ([p, d, a]) => `${p}.${d}.${a ?? ''}`
  const key = items => items.map(itemKey).sort().join(' ')

  const closure = kernel => {
    const items = [...kernel], seen = new Set(items.map(itemKey))
    for (let k = 0; k < items.length; k++) {
      const [p, d, a] = items[k], B = prods[p].rhs[d]
      if (!isNT(B)) continue
      let looks = [undefined]
      if (lr1) {
        // lookaheads of B's new items: FIRST(β a), where β is what follows B in this item
        const f = firstOfSeq(prods[p].rhs.slice(d + 1))
        looks = [...f].filter(x => x !== EPS)
        if (f.has(EPS)) looks.push(a)
      }
      prods.forEach((q, j) => {
        if (q.lhs !== B) return
        for (const b of looks) {
          const it = [j, 0, b]
          if (!seen.has(itemKey(it))) { seen.add(itemKey(it)); items.push(it) }
        }
      })
    }
    return items
  }

  let states = [{ items: closure([[0, 0, lr1 ? '$' : undefined]]), trans: {} }]
  const index = new Map([[key(states[0].items), 0]])
  for (let i = 0; i < states.length; i++) {
    if (states.length > MAX_STATES) throw new Error(`More than ${MAX_STATES} states: this grammar is too big for the lab`)
    const symbols = []
    for (const [p, d] of states[i].items) {
      const X = prods[p].rhs[d]
      if (X !== undefined && !symbols.includes(X)) symbols.push(X)
    }
    for (const X of symbols) {
      const kernel = states[i].items.filter(([p, d]) => prods[p].rhs[d] === X).map(([p, d, a]) => [p, d + 1, a])
      const items = closure(kernel), k = key(items)
      if (!index.has(k)) { index.set(k, states.length); states.push({ items, trans: {} }) }
      states[i].trans[X] = index.get(k)
    }
  }
  if (kind === 'lalr') states = mergeCores(states)

  const terms = [...g.ts, '$']
  const action = states.map(() => Object.fromEntries(terms.map(a => [a, []])))
  const gotoT = states.map(() => ({}))
  states.forEach((s, i) => {
    for (const [X, j] of Object.entries(s.trans)) {
      if (isNT(X)) gotoT[i][X] = j
      else action[i][X].push(`s${j}`)
    }
    for (const [p, d, a] of s.items) {
      if (d < prods[p].rhs.length) continue
      if (p === 0) { action[i].$.push('acc'); continue }
      // LR(0): reduce whatever comes next. SLR(1): only on FOLLOW(A). LR(1): only on the item's own lookahead.
      for (const x of lr1 ? [a] : kind === 'slr' ? follow[prods[p].lhs] : terms) action[i][x].push(`r${p}`)
    }
    for (const a of terms) action[i][a] = [...new Set(action[i][a])]
    const acts = Object.values(action[i]).filter(c => c.length > 1).flat()
    s.conflict = !acts.length ? null : acts.some(x => x[0] === 's') ? 'shift/reduce' : 'reduce/reduce'
    if (lr1) s.items = groupLookaheads(s.items)
  })
  return { kind, aug, prods, states, action, goto: gotoT, terms, nts: g.nts, follow }
}

// LALR(1): one state per LR(0) core; lookaheads of the merged CLR(1) states are unioned.
function mergeCores(states) {
  const core = s => [...new Set(s.items.map(([p, d]) => `${p}.${d}`))].sort().join(' ')
  const byCore = new Map(), to = [], merged = []
  states.forEach((s, i) => {
    const c = core(s)
    if (!byCore.has(c)) { byCore.set(c, merged.length); merged.push({ items: [], trans: {}, merged: [] }) }
    const m = merged[(to[i] = byCore.get(c))]
    m.merged.push(i)
    for (const it of s.items) if (!m.items.some(x => x[0] === it[0] && x[1] === it[1] && x[2] === it[2])) m.items.push(it)
  })
  states.forEach((s, i) => { for (const [X, j] of Object.entries(s.trans)) merged[to[i]].trans[X] = to[j] })
  return merged
}

// For display: items that differ only in lookahead become one row, [C -> c . C, c/d]
function groupLookaheads(items) {
  const out = [], at = new Map()
  for (const [p, d, a] of items) {
    const k = `${p}.${d}`
    if (!at.has(k)) { at.set(k, out.length); out.push([p, d, []]) }
    out[at.get(k)][2].push(a)
  }
  return out
}

export function parseLR(lr, tokens) {
  const input = [...tokens, '$']
  const stack = [0] // states and symbols interleaved: 0 c 3 d 4
  const steps = []
  let pos = 0
  const row = act => steps.push({ stack: stack.join(' '), input: input.slice(pos).join(' '), action: act, state: stack[stack.length - 1] })
  while (steps.length < MAX_STEPS) {
    const s = stack[stack.length - 1], a = input[pos]
    const [act] = lr.action[s][a] ?? []
    if (!act) { row(`Error: state ${s} has no action for ${a}`); return { steps, accepted: false } }
    if (act === 'acc') { row('Accept'); return { steps, accepted: true } }
    if (act[0] === 's') {
      row(`Shift ${a}, go to state ${act.slice(1)}`)
      stack.push(a, Number(act.slice(1))); pos++
      continue
    }
    const p = lr.prods[Number(act.slice(1))]
    row(`Reduce by ${showProd(p)}`)
    stack.splice(stack.length - 2 * p.rhs.length)
    const exposed = stack[stack.length - 1]
    stack.push(p.lhs, lr.goto[exposed][p.lhs])
  }
  steps.push({ stack: '', input: '', action: `Stopped after ${MAX_STEPS} steps`, state: null })
  return { steps, accepted: false }
}

// Split "id+id*id" or "id + id * id" into terminals, longest match first.
export function tokenizeInput(text, ts) {
  const sorted = [...ts].sort((a, b) => b.length - a.length)
  const out = []
  let i = 0
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue }
    const t = sorted.find(t => text.startsWith(t, i))
    if (!t) throw new Error(`"${text.slice(i).split(/\s/)[0]}" is not a terminal of this grammar`)
    out.push(t)
    i += t.length
  }
  return out
}
