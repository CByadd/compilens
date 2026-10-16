import { useMemo, useState } from 'react'
import { buildLL1, buildLR, LR_NAMES, parseGrammar, parseLL1, parseLR, showProd, tokenizeInput } from './grammar.js'
import { GRAMMARS } from './samples.js'

const ALGOS = {
  ll1: {
    label: 'LL(1)', sub: 'top-down',
    what: 'Starts from the start symbol and expands rules left to right, choosing each rule by looking at one next token. Needs FIRST and FOLLOW sets to build its table.',
  },
  lr0: {
    label: 'LR(0)', sub: 'bottom-up',
    what: 'Reads tokens onto a stack (shift) and replaces the right side of a rule with its left side (reduce) until only the start symbol is left. A state machine of LR(0) items decides each move.',
  },
  slr: {
    label: 'SLR(1)', sub: 'bottom-up + lookahead',
    what: 'Uses the same LR(0) states, but reduces by A → α only when the next token is in FOLLOW(A). That one token of lookahead removes many LR(0) conflicts.',
  },
  lalr: {
    label: 'LALR(1)', sub: 'merged LR(1)',
    what: 'Builds the LR(1) states, then merges the ones whose items differ only in lookaheads. As few states as LR(0), almost as strong as CLR(1); this is what yacc and bison use.',
  },
  clr: {
    label: 'CLR(1)', sub: 'canonical LR(1)',
    what: 'Every item carries the exact token that may follow it, like [C → d ·, c/d], and reduces only on that token. The most powerful parser here, but it can need many more states.',
  },
}

// Does the grammar fit this parser, i.e. is its table free of conflicts?
const fitsParser = (a, k) => (k === 'll1' ? a.ll.conflicts.length === 0 : !a[k].error && a[k].states.every(s => !s.conflict))

// CLR(1) can blow up on big grammars; keep one failing parser from taking the whole lab down.
const safe = build => { try { return build() } catch (e) { return { error: e.message } } }

export default function ParserLab() {
  const [grammar, setGrammar] = useState(GRAMMARS[0].grammar)
  const [input, setInput] = useState(GRAMMARS[0].input)
  const [algo, setAlgo] = useState('ll1')

  const a = useMemo(() => {
    let g
    try { g = parseGrammar(grammar) } catch (e) { return { error: e.message } }
    let tokens = null, tokenError = null
    try { tokens = tokenizeInput(input, g.ts) } catch (e) { tokenError = e.message }
    return {
      g, tokens, tokenError, ll: buildLL1(g),
      ...Object.fromEntries(Object.keys(LR_NAMES).map(k => [k, safe(() => buildLR(g, k))])),
    }
  }, [grammar, input])

  const reset = `${grammar}\n${input}` // remounts the views so step-through restarts on any change

  return (
    <main className="layout">
      <section className="panel" aria-label="Grammar">
        <div className="panel-head">
          <h2>Your grammar</h2>
          <span className="muted">and an input to parse</span>
        </div>
        <div className="toolbar">
          <label className="sr-only" htmlFor="gsample">Load a sample grammar</label>
          <select
            id="gsample"
            value=""
            onChange={e => {
              const s = GRAMMARS[e.target.value]
              setGrammar(s.grammar)
              setInput(s.input)
            }}
          >
            <option value="" disabled>Load a sample grammar…</option>
            {GRAMMARS.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
          </select>
        </div>
        <label className="field-label" htmlFor="grammar">Grammar</label>
        <textarea
          id="grammar"
          className="grammar-input"
          value={grammar}
          onChange={e => setGrammar(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={7}
        />
        {a.error && <p className="field-error" role="alert">{a.error}</p>}
        {a.g?.warnings.map((w, i) => <p key={i} className="field-warn">⚠ {w}</p>)}

        <label className="field-label" htmlFor="pinput">Input to parse</label>
        <input
          id="pinput"
          className="parse-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {a.tokenError && <p className="field-error">{a.tokenError}</p>}
        {a.tokens && <p className="muted small">Tokens: {a.tokens.join('  ') || '(empty)'}  $</p>}

        <details className="lang-help">
          <summary>How do I write a grammar?</summary>
          <ul>
            <li>One rule per line: <code>A -&gt; x B | y</code></li>
            <li>Separate symbols with spaces: <code>id + id</code>, not <code>id+id</code></li>
            <li>The left side of the first rule is the start symbol</li>
            <li>Symbols with rules are nonterminals; every other symbol is a terminal (a token)</li>
            <li><code>ε</code> (or <code>eps</code>) is the empty string; <code>$</code> means end of input</li>
          </ul>
        </details>
      </section>

      <section className="panel" aria-label="Parser">
        <div className="picker" role="tablist" aria-label="Parsing algorithm">
          {[['Top-down', ['ll1']], ['Bottom-up · weakest → strongest', ['lr0', 'slr', 'lalr', 'clr']]].map(([group, keys]) => (
            <div key={group} className="picker-group">
              <span className="picker-label">{group}</span>
              <div className="picker-row">
                {keys.map(k => {
                  const fits = !a.error && fitsParser(a, k)
                  return (
                    <button key={k} role="tab" aria-selected={algo === k} className={`pick ${algo === k ? 'on' : ''}`} onClick={() => setAlgo(k)}>
                      <span className="pick-name">{ALGOS[k].label}</span>
                      {!a.error && (
                        <span className={`pick-fit ${fits ? 'yes' : 'no'}`}>
                          {fits ? '✓ fits' : '✕ conflicts'}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="algo-intro">
          <h2>{ALGOS[algo].label} <span className="muted">{ALGOS[algo].sub}</span></h2>
          <p className="what">{ALGOS[algo].what}</p>
        </div>

        {a.error
          ? <p className="muted">Fix the grammar on the left to see the parser.</p>
          : algo === 'll1'
            ? <LL1View key={reset} a={a} />
            : <LRView key={reset + algo} a={a} kind={algo} />}
      </section>
    </main>
  )
}

function Section({ n, title, read, children }) {
  return (
    <details className="lab-section" open>
      <summary><span className="sec-num">{n}</span>{title}</summary>
      {read && <p className="howto"><span><strong>How to read this:</strong> {read}</span></p>}
      {children}
    </details>
  )
}

function Verdict({ conflict, hints, a, run }) {
  if (conflict) {
    return (
      <div className="error-card" role="status">
        <strong>{conflict}</strong>
        {hints?.map((h, i) => <p key={i}>{h}</p>)}
        <p className="muted">The parse below is skipped until the conflicts are gone. Try another sample to compare.</p>
      </div>
    )
  }
  if (a.tokenError) return <div className="error-card"><strong>Fix the input</strong><p>{a.tokenError}</p></div>
  if (run.accepted) {
    return <div className="ok-card"><strong>✓ Accepted.</strong> "{a.tokens.join(' ')}" is a sentence of this grammar.</div>
  }
  return <div className="error-card"><strong>✕ Rejected.</strong><p>{run.steps.at(-1).action}</p></div>
}

function LL1View({ a }) {
  const { g, ll } = a
  const conflict = ll.conflicts.length > 0 &&
    `Not LL(1): ${ll.conflicts.length} table cell${ll.conflicts.length > 1 ? 's hold' : ' holds'} more than one rule (red), so the parser cannot decide.`
  const run = !conflict && a.tokens ? parseLL1(g, ll, a.tokens) : null
  return (
    <>
      <Verdict conflict={conflict} hints={ll.hints} a={a} run={run} />
      <Section n="1" title="FIRST and FOLLOW sets"
        read="FIRST(A) is every token that can start A (ε if A can be empty). FOLLOW(A) is every token that can come right after A; $ is end of input.">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nonterminal</th><th>FIRST</th><th>FOLLOW</th></tr></thead>
            <tbody>
              {g.nts.map(A => (
                <tr key={A}>
                  <td><code>{A}</code></td>
                  <td><code>{'{ ' + [...ll.first[A]].join(', ') + ' }'}</code></td>
                  <td><code>{'{ ' + [...ll.follow[A]].join(', ') + ' }'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section n="2" title="LL(1) parsing table"
        read="Row: the nonterminal on top of the stack. Column: the next input token. The cell says which rule to expand. An empty cell means a syntax error.">
        <div className="table-wrap">
          <table className="grid-table">
            <thead><tr><th></th>{ll.cols.map(c => <th key={c}><code>{c}</code></th>)}</tr></thead>
            <tbody>
              {g.nts.map(A => (
                <tr key={A}>
                  <th><code>{A}</code></th>
                  {ll.cols.map(c => {
                    const cell = ll.table[A][c]
                    return (
                      <td key={c} className={cell.length > 1 ? 'conflict' : undefined}>
                        {cell.map(i => <div key={i}><code>{showProd(g.prods[i])}</code></div>)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {run && (
        <Section n="3" title="Parse, step by step"
          read="The stack holds what the parser still expects (top on the right). Expand a nonterminal with the table, or match a token with the input.">
          <Trace run={run} />
        </Section>
      )}
    </>
  )
}

const conflictStates = lr => lr.states.map((s, i) => [s, i]).filter(([s]) => s.conflict)
const stateList = bad => bad.map(([, i]) => `I${i}`).join(', ')
const WEAKER = { slr: 'lr0', lalr: 'slr', clr: 'lalr' }
const CONFLICT_HINT = {
  lr0: 'LR(0) reduces as soon as an item is complete, whatever the next token is. Switch to SLR(1) to see whether one token of lookahead fixes it.',
  slr: 'FOLLOW sets are too coarse here. Try LALR(1) or CLR(1), which track the exact lookahead of every item. If the grammar is ambiguous, no LR parser can fix it.',
  lalr: 'Check CLR(1): if it has no conflict, merging states with the same core caused this one. Otherwise the grammar is ambiguous or not LR(1).',
  clr: 'Even canonical LR(1), the strongest parser here, cannot decide: the grammar is ambiguous or not LR(1). Rewrite the grammar (for example, match each else with the nearest if).',
}

function LRView({ a, kind }) {
  const [step, setStep] = useState(0)
  const lr = a[kind]
  if (lr.error) return <div className="error-card"><strong>{lr.error}</strong></div>
  const name = LR_NAMES[kind]
  const lr1 = kind === 'lalr' || kind === 'clr'
  const bad = conflictStates(lr)
  const kinds = [...new Set(bad.map(([s]) => s.conflict))].join(' and ')
  const conflict = bad.length > 0 &&
    `Not ${name}: state${bad.length > 1 ? 's' : ''} ${stateList(bad)} ${bad.length > 1 ? 'have' : 'has'} ${kinds} conflicts (red).`
  const weaker = WEAKER[kind] && !a[WEAKER[kind]].error ? WEAKER[kind] : null
  const weakerBad = weaker ? conflictStates(a[weaker]) : []
  const run = !conflict && a.tokens ? parseLR(lr, a.tokens) : null
  const current = run?.steps[step]?.state
  let n = 0

  return (
    <>
      <Verdict conflict={conflict} hints={conflict && [CONFLICT_HINT[kind]]} a={a} run={run} />
      <Section n={++n} title="Augmented grammar"
        read={`A new start rule ${lr.aug} → ${a.g.start} is added so the parser knows when it is done. Rules are numbered; reduce actions refer to these numbers.`}>
        <ol className="code prods" start={0}>
          {lr.prods.map((p, i) => <li key={i}><code>{showProd(p)}</code></li>)}
        </ol>
      </Section>
      <Section n={++n}
        title={kind === 'clr' ? 'LR(1) items: the canonical collection' : kind === 'lalr' ? 'LALR(1) states: LR(1) states merged by core' : 'LR(0) items: the canonical collection'}
        read={lr1
          ? `An LR(1) item [A → α · β, a] also carries a lookahead a: the token that must come next when A is complete. ${name} reduces only on those lookaheads. c/d is shorthand for two items that differ only in lookahead.${kind === 'lalr' ? ` States whose items match apart from lookaheads are merged ("from I3, I6" names the CLR(1) states), so LALR(1) has as many states as LR(0): ${a.lr0.states.length} here, against ${a.clr.error ? 'many' : a.clr.states.length} for CLR(1).` : ''}`
          : `An item A → α · β means: α has been read, β is expected next. Each state is a set of items; 'on X → In' is where the parser goes after reading X. Complete items (dot at the end) are where it reduces.${kind === 'slr' ? ' SLR(1) uses exactly the same states as LR(0).' : ''}`}>
        <div className="states">
          {lr.states.map((s, i) => (
            <div key={i} className={`state ${s.conflict ? 'state-conflict' : ''} ${current === i ? 'state-current' : ''}`}>
              <div className="state-head">
                <strong>I{i}</strong>
                {s.merged?.length > 1 && <span className="muted small-note">from {s.merged.map(m => `I${m}`).join(', ')}</span>}
                {s.conflict && <span className="badge">{s.conflict}</span>}
                {current === i && <span className="badge now">current</span>}
              </div>
              <ul className="items">
                {s.items.map(([p, d, las]) => {
                  const rhs = lr.prods[p].rhs
                  return (
                    <li key={`${p}.${d}`} className={d === rhs.length ? 'complete' : undefined}>
                      <code>{lr.prods[p].lhs} → {[...rhs.slice(0, d), '·', ...rhs.slice(d)].join(' ')}</code>
                      {las && <code className="la">, {las.join('/')}</code>}
                    </li>
                  )
                })}
              </ul>
              {Object.keys(s.trans).length > 0 && (
                <p className="trans">
                  {Object.entries(s.trans).map(([X, j]) => <span key={X}>on <code>{X}</code> → I{j}</span>)}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>
      {kind === 'slr' && (
        <Section n={++n} title="FOLLOW sets (where SLR(1) may reduce)"
          read="A complete item A → α · gets its reduce only in the columns of FOLLOW(A), instead of in every column like LR(0).">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nonterminal</th><th>FOLLOW</th></tr></thead>
              <tbody>
                {a.g.nts.map(A => <tr key={A}><td><code>{A}</code></td><td><code>{'{ ' + [...lr.follow[A]].join(', ') + ' }'}</code></td></tr>)}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      <Section n={++n} title={`${name} ACTION / GOTO table`}
        read={`sN: shift the token and go to state N. rN: reduce by rule N. acc: accept. GOTO says which state to enter after a reduce. Red cells have two actions: a conflict.${{ slr: ' Reduces appear only under FOLLOW tokens.', lalr: ' Reduces appear only under each item\'s lookaheads.', clr: ' Reduces appear only under each item\'s lookaheads.' }[kind] ?? ''}`}>
        {weakerBad.length > 0 && !conflict && (
          <p className="ok-card">
            <strong>Lookahead helped:</strong> {LR_NAMES[weaker]} had conflicts (its state{weakerBad.length > 1 ? 's' : ''} {stateList(weakerBad)}). {name} has none.
          </p>
        )}
        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr><th rowSpan={2}>State</th><th colSpan={lr.terms.length}>ACTION</th><th colSpan={lr.nts.length}>GOTO</th></tr>
              <tr>{lr.terms.map(t => <th key={t}><code>{t}</code></th>)}{lr.nts.map(A => <th key={A}><code>{A}</code></th>)}</tr>
            </thead>
            <tbody>
              {lr.states.map((s, i) => (
                <tr key={i} className={current === i ? 'hl' : undefined}>
                  <th>I{i}</th>
                  {lr.terms.map(t => (
                    <td key={t} className={lr.action[i][t].length > 1 ? 'conflict' : undefined}><code>{lr.action[i][t].join(' / ')}</code></td>
                  ))}
                  {lr.nts.map(A => <td key={A}><code>{lr.goto[i][A] ?? ''}</code></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      {run && (
        <Section n={++n} title="Parse, step by step"
          read="The stack alternates states and symbols (top on the right). Look up ACTION[top state, next token]: shift pushes the token, reduce pops the rule's right side and pushes its left side.">
          <Trace run={run} step={step} setStep={setStep} />
        </Section>
      )}
    </>
  )
}

function Trace({ run, step: outer, setStep: setOuter }) {
  const [own, setOwn] = useState(0)
  const step = outer ?? own, setStep = setOuter ?? setOwn
  const n = run.steps.length
  return (
    <>
      <div className="trace-controls">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>◀ Back</button>
        <span className="muted">Step {step + 1} of {n}</span>
        <button className="primary" onClick={() => setStep(Math.min(n - 1, step + 1))} disabled={step >= n - 1}>Next ▶</button>
        <button onClick={() => setStep(n - 1)} disabled={step >= n - 1}>Show all</button>
      </div>
      <div className="table-wrap">
        <table className="trace-table">
          <thead><tr><th>#</th><th>Stack (top →)</th><th>Input</th><th>Action</th></tr></thead>
          <tbody>
            {run.steps.map((r, i) => (
              <tr key={i} className={i === step ? 'hl' : i > step ? 'future' : undefined} onClick={() => setStep(i)}>
                <td className="muted">{i + 1}</td>
                <td><code>{r.stack}</code></td>
                <td className="input-col"><code>{r.input}</code></td>
                <td>{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
