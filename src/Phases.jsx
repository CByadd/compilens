import { Cpu, ListOrdered, Network, ScanText, ShieldCheck, TriangleAlert, Zap } from 'lucide-react'
import { explainAsm, explainQuad, formatQuad, tokenCategory } from './format.js'

const countNodes = n => 1 + n.children.reduce((s, c) => s + countNodes(c), 0)

export const PHASES = [
  {
    key: 'tokens', icon: ScanText, name: 'Lexical', title: 'Lexical analysis', input: 'Source code', output: 'Tokens', file: 'lexer.py',
    what: 'Reads your code character by character and groups the characters into tokens, the "words" of the program. Spaces and comments are thrown away.',
    read: 'Each chip is one token: the text from your code on top, its kind underneath.',
    count: r => `${r.tokens.length} tokens`,
  },
  {
    key: 'ast', icon: Network, name: 'Syntax', title: 'Syntax analysis', input: 'Tokens', output: 'Syntax tree', file: 'parser.py',
    what: 'Checks that the tokens follow the grammar of C and builds a tree showing how the pieces fit together, like diagramming a sentence.',
    read: 'Read it top-down. Operations deeper in the tree happen first: in 5 + 3 * 2 the * sits below the +. Click a ▾ arrow to fold a branch.',
    count: r => `${countNodes(r.ast)} nodes`,
  },
  {
    key: 'symbols', icon: ShieldCheck, name: 'Semantic', title: 'Semantic analysis', input: 'Syntax tree', output: 'Symbol table + types', file: 'semantic.py',
    what: 'Checks that the program makes sense: every variable is declared before it is used and only once per block, and every value gets a type (int or float).',
    read: 'One row per declared variable. Scope tells which { } block owns it; an inner block may reuse a name.',
    count: r => `${r.symbols.length} variables`,
  },
  {
    key: 'tac', icon: ListOrdered, name: 'Intermediate', title: 'Intermediate code generation', input: 'Checked syntax tree', output: 'Three-address code', file: 'icg.py',
    what: 'Flattens the tree into a list of tiny steps that each do at most one operation. Temporaries t1, t2… hold partial results; labels and jumps replace if and while.',
    read: 'Each row is one quadruple: operator, two inputs, one result (on wide screens you also see them split into columns). The Meaning column says what it does.',
    count: r => `${r.tac.length} steps`,
  },
  {
    key: 'opt_tac', icon: Zap, name: 'Optimize', title: 'Code optimization', input: 'Three-address code', output: 'Optimized code', file: 'optimizer.py',
    what: 'Makes the code smaller without changing what it does: math on constants is done now (constant folding) and values nobody reads are dropped (dead-code elimination).',
    read: 'Left is before, right is after. Struck-out lines were removed, colored lines were rewritten. The list below explains every change.',
    count: r => `${r.tac.length} → ${r.opt_tac.length} steps`,
  },
  {
    key: 'asm', icon: Cpu, name: 'Target', title: 'Target code generation', input: 'Optimized code', output: 'Assembly', file: 'codegen.py',
    what: 'Turns the steps into instructions for a simple CPU with 8 registers (R0–R7). Variables live in memory and are loaded into a register before the CPU can use them.',
    read: 'One instruction per row with its meaning on the right. #5 means the number 5; L1: marks a place a jump can go to.',
    count: r => `${r.asm.length} instructions`,
  },
]

// Clickable, keyboard-reachable item that links back to its source line.
function lineProps(line, selLine, onSelectLine, base = '') {
  return {
    className: `${base} ${line && line === selLine ? 'hl' : ''}`.trim() || undefined,
    tabIndex: 0,
    onClick: () => onSelectLine(line),
    onKeyDown: e => e.key === 'Enter' && onSelectLine(line),
  }
}

const TOKEN_LEGEND = [['kw', 'keyword'], ['id', 'name'], ['lit', 'number / text'], ['op', 'symbol']]

function TokensView({ result, ...p }) {
  const byLine = new Map()
  for (const t of result.tokens) {
    if (t.kind === 'EOF') continue
    if (!byLine.has(t.line)) byLine.set(t.line, [])
    byLine.get(t.line).push(t)
  }
  return (
    <>
      <div className="legend">
        {TOKEN_LEGEND.map(([c, label]) => <span key={c} className={`tok tok-${c}`}>{label}</span>)}
      </div>
      <div className="token-lines">
        {[...byLine].map(([line, toks]) => (
          <div key={line} {...lineProps(line, p.selLine, p.onSelectLine, 'token-line')}>
            <span className="muted line-no">line {line}</span>
            <span className="chips">
              {toks.map((t, i) => (
                <span key={i} className={`chip-tok tok-${tokenCategory(t.kind)}`} title={`${t.kind} at ${t.line}:${t.col}`}>
                  <code>{t.value}</code>
                  <small>{t.kind}</small>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <details className="more">
        <summary>Show as table</summary>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Kind</th><th>Text</th><th>Line:Col</th></tr></thead>
            <tbody>
              {result.tokens.map((t, i) => (
                <tr key={i} {...lineProps(t.line, p.selLine, p.onSelectLine)}>
                  <td className="muted">{i + 1}</td>
                  <td><span className={`tok tok-${tokenCategory(t.kind)}`}>{t.kind}</span></td>
                  <td><code>{t.value || '(end of input)'}</code></td>
                  <td className="muted">{t.line}:{t.col}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}

function AstNode({ node, selLine, onSelectLine }) {
  const label = (
    <>
      <span className="ast-kind">{node.kind}</span>
      {node.value && <code className="ast-value">{node.value}</code>}
      {node.type && <span className="ast-type">{node.type}</span>}
      <span className="muted ast-line">line {node.line}</span>
    </>
  )
  if (!node.children.length) {
    return <li><span {...lineProps(node.line, selLine, onSelectLine, 'ast-label')}>{label}</span></li>
  }
  return (
    <li>
      <details open>
        <summary {...lineProps(node.line, selLine, onSelectLine, 'ast-label')}>{label}</summary>
        <ul>{node.children.map((c, i) => <AstNode key={i} node={c} selLine={selLine} onSelectLine={onSelectLine} />)}</ul>
      </details>
    </li>
  )
}

function AstView({ result, ...p }) {
  return <ul className="ast"><AstNode node={result.ast} {...p} /></ul>
}

function Warnings({ warnings, ...p }) {
  if (!warnings?.length) return null
  return (
    <ul className="notes warn">
      {warnings.map((w, i) => <li key={i} {...lineProps(w.line, p.selLine, p.onSelectLine)}><TriangleAlert size={14} aria-hidden /> Line {w.line}: {w.msg}</li>)}
    </ul>
  )
}

function SymbolsView({ result, ...p }) {
  if (!result.symbols?.length) return <p className="muted">No variables were declared before the error.</p>
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Scope</th><th>Line</th><th>Later name</th></tr></thead>
          <tbody>
            {result.symbols.map((s, i) => (
              <tr key={i} {...lineProps(s.line, p.selLine, p.onSelectLine)}>
                <td><code>{s.name}</code></td>
                <td><span className={`type type-${s.type}`}>{s.type}</span></td>
                <td>{s.scope === 0 ? 'global' : `block ${s.scope}`}</td>
                <td className="muted">{s.line}</td>
                <td><code>{s.ir}</code>{s.ir !== s.name && <span className="muted"> (renamed)</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Warnings warnings={result.warnings} {...p} />
    </>
  )
}

function TacView({ result, ...p }) {
  return (
    <div className="table-wrap">
      <table className="tac-table">
        <thead><tr><th>#</th><th>Code</th><th>Meaning</th><th className="quad">Op</th><th className="quad">Arg 1</th><th className="quad">Arg 2</th><th className="quad">Result</th></tr></thead>
        <tbody>
          {result.tac.map((q, i) => (
            <tr key={i} {...lineProps(q.line, p.selLine, p.onSelectLine)}>
              <td className="muted">{i + 1}</td>
              <td><code className={q.op === 'label' ? 'label' : ''}>{formatQuad(q)}</code></td>
              <td className="meaning">{explainQuad(q)}</td>
              <td className="quad"><code>{q.op}</code></td>
              <td className="quad"><code>{q.a1 ?? ''}</code></td>
              <td className="quad"><code>{q.a2 ?? ''}</code></td>
              <td className="quad"><code>{q.res ?? ''}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CodeList({ title, items, classOf, ...p }) {
  return (
    <div className="code-col">
      <h3>{title}</h3>
      <ol className="code">
        {items.map((q, i) => (
          <li key={i} {...lineProps(q.line, p.selLine, p.onSelectLine, classOf(q, i))}>
            <code>{formatQuad(q)}</code>
          </li>
        ))}
      </ol>
    </div>
  )
}

function OptimizeView({ result, ...p }) {
  const { tac, opt_tac, opt_trace } = result
  const kept = new Map(opt_tac.map(q => [q.src, q]))
  const rewritten = q => formatQuad(q) !== formatQuad(tac[q.src])
  const pct = tac.length ? Math.round(((tac.length - opt_tac.length) / tac.length) * 100) : 0
  const folds = opt_trace.filter(t => t.msg.startsWith('Folded')).length
  const removed = tac.length - opt_tac.length
  return (
    <>
      <div className="stats">
        <span className="stat"><b>{tac.length} → {opt_tac.length}</b> steps ({pct}% smaller)</span>
        <span className="stat"><b>{folds}</b> calculations done early</span>
        <span className="stat"><b>{removed}</b> useless steps removed</span>
      </div>
      <div className="code-cols">
        <CodeList
          title="Before" items={tac} {...p}
          classOf={(q, i) => (!kept.has(i) ? 'removed' : rewritten(kept.get(i)) ? 'changed' : '')}
        />
        <CodeList title="After" items={opt_tac} {...p} classOf={q => (rewritten(q) ? 'changed' : '')} />
      </div>
      <h3>What the optimizer did</h3>
      {opt_trace.length ? (
        <ol className="notes">
          {opt_trace.map((t, i) => <li key={i} {...lineProps(t.line, p.selLine, p.onSelectLine)}>{t.msg}</li>)}
        </ol>
      ) : <p className="muted">Nothing to optimize in this program: no constant math and no unused values.</p>}
    </>
  )
}

function AsmView({ result, ...p }) {
  return (
    <ol className="code asm">
      {result.asm.map((a, i) => {
        const isLabel = a.text.endsWith(':')
        return (
          <li key={i} {...lineProps(a.line, p.selLine, p.onSelectLine, isLabel ? 'label' : '')}>
            <code>{isLabel ? a.text : `  ${a.text}`}</code>
            <span className="meaning">{explainAsm(a.text)}</span>
          </li>
        )
      })}
    </ol>
  )
}

const VIEWS = [TokensView, AstView, SymbolsView, TacView, OptimizeView, AsmView]

export function PhaseView({ index, result, selLine, onSelectLine }) {
  const View = VIEWS[index]
  if (!result[PHASES[index].key]) return null
  return <View result={result} selLine={selLine} onSelectLine={onSelectLine} />
}
