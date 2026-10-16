import {
  ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Code, LoaderCircle, Network, Pencil, Play, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Help from './Help.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import Logo from './Logo.jsx'
import ParserLab from './ParserLab.jsx'
import { highlightC } from './format.js'
import { PHASES, PhaseView } from './Phases.jsx'
import { SAMPLES } from './samples.js'

const ERROR_PHASE_INDEX = { lexical: 0, syntax: 1, semantic: 2, internal: 3 }
const LINE_HEIGHT = 21 // must match --line-h in styles.css
const isNarrow = () => window.matchMedia('(max-width: 960px)').matches // same breakpoint as the one-column layout

const ERROR_HINTS = {
  lexical: 'The compiler met a character it does not know. Look for typos or symbols this C subset does not use, such as # or \'.',
  syntax: 'The code breaks the grammar. Look for a missing ;  )  or } at or just before the highlighted spot.',
  semantic: 'The grammar is fine but the meaning is not: declare every variable once (for example int x;) before you use it.',
}

export default function App() {
  // #parser in the URL opens the Parser Lab, so a link can point straight at it
  const [mode, setMode] = useState(() => (window.location.hash === '#parser' ? 'parser' : 'compiler'))
  const switchMode = m => {
    setMode(m)
    history.replaceState(null, '', m === 'parser' ? '#parser' : window.location.pathname)
  }
  const [source, setSource] = useState(SAMPLES[0].code)
  const [compiled, setCompiled] = useState(null) // source the current result belongs to
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const [selLine, setSelLine] = useState(null)
  const editorRef = useRef(null)
  const vizRef = useRef(null)
  const headRef = useRef(null)
  const pipeRef = useRef(null)

  const errIdx = result && !result.ok ? (ERROR_PHASE_INDEX[result.phase] ?? 0) : -1
  const last = !result ? -1 : result.ok ? PHASES.length - 1 : errIdx

  async function compile(code = source, reveal = false) {
    setLoading(true)
    let r
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: code }),
      })
      r = await res.json()
    } catch {
      r = { ok: false, phase: 'request', error: { msg: 'Could not reach the compiler. Check your connection and try again.' } }
    }
    setResult(r)
    setCompiled(code)
    // start at phase 1 so students walk forward themselves; jump straight to the problem on errors
    setActive(r.ok ? 0 : (ERROR_PHASE_INDEX[r.phase] ?? 0))
    setSelLine(r.ok ? null : r.error?.line ?? null)
    setLoading(false)
    // phones: the phases sit below the editor, so bring them into view after an explicit Compile
    if (reveal && isNarrow()) requestAnimationFrame(() => vizRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }

  useEffect(() => { compile() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // keep the active step visible in the swipeable pipeline strip (horizontal only, never moves the page)
    const pipe = pipeRef.current, step = pipe?.children[active]
    if (step) pipe.scrollLeft = step.offsetLeft - (pipe.clientWidth - step.clientWidth) / 2
    // after scrolling down a long phase, start the next one at its top
    if (headRef.current?.getBoundingClientRect().top < 0) headRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [active])

  function go(i) {
    setActive(Math.max(0, Math.min(i, last)))
  }

  const errLine = result && !result.ok ? result.error?.line : null
  const phase = PHASES[active]

  return (
    <div className="app">
      <header className="appbar">
        <a className="brand" href="./" onClick={e => { e.preventDefault(); switchMode('compiler') }}>
          <Logo size={38} />
          <span className="brand-text">
            <span className="wordmark">Compi<span>lens</span></span>
            <span className="tagline">See inside a compiler</span>
          </span>
        </a>
        <nav className="tabs" aria-label="Mode">
          <button className={mode === 'compiler' ? 'on' : ''} aria-current={mode === 'compiler' ? 'page' : undefined} onClick={() => switchMode('compiler')}>
            <Code size={18} aria-hidden /> C Compiler
          </button>
          <button className={mode === 'parser' ? 'on' : ''} aria-current={mode === 'parser' ? 'page' : undefined} onClick={() => switchMode('parser')}>
            <Network size={18} aria-hidden /> Parser Lab
          </button>
        </nav>
        <ThemeToggle />
        <Help />
      </header>

      {mode === 'parser' ? (
        <>
          <Intro id="parser">
            <strong>Parser Lab:</strong> type a grammar and an input on the left. Each parser tab shows <Check size={15} className="ok-text" aria-label="a check" /> when the
            grammar fits that parser and <X size={15} className="err-text" aria-label="a cross" /> when its table has conflicts. Open a tab to see how it was built and watch the parse.
          </Intro>
          <ParserLab />
        </>
      ) : (<>
      <Intro id="compiler">
        <ol className="intro-steps">
          <li><b>1</b><span>Write C code, or <strong>load a sample</strong></span></li>
          <li><b>2</b><span>Press <strong>Compile</strong></span></li>
          <li><b>3</b><span>Walk through the <strong>6 phases</strong> with Next</span></li>
          <li><b>4</b><span><strong>Tap a line</strong> of code to trace it in every phase</span></li>
        </ol>
      </Intro>

      <main className="layout">
        <section className="panel editor-panel" aria-label="Source code" ref={editorRef}>
          <div className="panel-head">
            <h2>Your program</h2>
            <span className="muted">a small subset of C</span>
          </div>
          <div className="toolbar">
            <label className="sr-only" htmlFor="sample">Load a sample program</label>
            <select
              id="sample"
              value=""
              onChange={e => {
                const code = SAMPLES[e.target.value].code
                setSource(code)
                compile(code)
              }}
            >
              <option value="" disabled>Load a sample program…</option>
              {SAMPLES.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
            <button className="primary" onClick={() => compile(source, true)} disabled={loading}>
              {loading ? <><LoaderCircle size={16} className="spin" aria-hidden /> Compiling…</> : <>Compile <Play size={15} aria-hidden /></>}
            </button>
          </div>
          <Editor
            value={source}
            onChange={setSource}
            selLine={selLine}
            errLine={errLine}
            onSelectLine={setSelLine}
            onRun={() => compile(source, true)}
          />
          <p className="status muted">
            {result && compiled !== source
              ? <span className="stale">You changed the code. Press Compile to see the new result.</span>
              : result?.ms != null && <>Compiled in {result.ms} ms. Tip: Ctrl+Enter compiles.</>}
          </p>
          <LanguageHelp />
        </section>

        <section className="panel viz-panel" aria-label="Compiler phases" ref={vizRef}>
          <ol className="pipeline" ref={pipeRef}>
            {PHASES.map((p, i) => {
              const status = !result ? 'idle' : i < errIdx || result.ok ? 'done' : i === errIdx ? 'error' : 'locked'
              return (
                <li key={p.key}>
                  <button
                    className={`step step-${status} ${i === active && result ? 'active' : ''}`}
                    disabled={!result || i > last}
                    aria-current={i === active ? 'step' : undefined}
                    onClick={() => go(i)}
                  >
                    <span className="step-num">
                      {status === 'done' ? <Check size={17} strokeWidth={3} aria-label="done" /> : status === 'error' ? <X size={17} strokeWidth={3} aria-label="error" /> : i + 1}
                    </span>
                    <span className="step-name">{p.name}</span>
                    <span className="step-meta">
                      {status === 'done' ? p.count(result) : status === 'error' ? 'problem found' : status === 'locked' ? 'skipped' : p.output}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="phase-head" ref={headRef}>
            <div className="phase-title">
              <span className="phase-kicker">Phase {active + 1} of 6</span>
              <h2>{phase.title} <code className="file">{phase.file}</code></h2>
            </div>
            <div className="controls wide-only">
              <button onClick={() => go(active - 1)} disabled={!result || active === 0}><ChevronLeft size={16} aria-hidden /> Back</button>
              <button className="primary" onClick={() => go(active + 1)} disabled={!result || active >= last}>Next <ChevronRight size={16} aria-hidden /></button>
            </div>
          </div>
          <p className="what">{phase.what}</p>
          <p className="io" aria-label="What goes in and what comes out">
            <span className="io-chip">{phase.input}</span>
            <span className="io-arrow" aria-hidden>→</span>
            <span className="io-chip out">{phase.output}</span>
          </p>
          {result?.[phase.key] && (
            <p className="howto">
              <strong>How to read this:</strong> {phase.read}{' '}
              {selLine
                ? <span className="wide-only"><TraceBar line={selLine} source={compiled} onSelectLine={setSelLine} /></span>
                : <span className="muted">Tap a line of your code, or any row below, to highlight what it became.</span>}
            </p>
          )}

          <div className="phase-body">
            {!result && <p className="muted">{loading ? 'Compiling…' : 'Press Compile to run the six phases.'}</p>}
            {result && active === errIdx && <ErrorCard result={result} onSelectLine={setSelLine} />}
            {result && <PhaseView index={active} result={result} selLine={selLine} onSelectLine={setSelLine} />}
          </div>

          {result && active < last && (
            <button className="next-hint" onClick={() => go(active + 1)}>
              Next: {PHASES[active + 1].name}, which turns this into {PHASES[active + 1].output.toLowerCase()} <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </section>
      </main>

      {result && (
        <nav className="mobile-bar narrow-only" aria-label="Phase navigation">
          {selLine && <TraceBar line={selLine} source={compiled} onSelectLine={setSelLine} />}
          <div className="mobile-nav">
            <button onClick={() => editorRef.current.scrollIntoView({ behavior: 'smooth' })}><Pencil size={16} aria-hidden /> Code</button>
            <button onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous phase"><ChevronLeft size={20} aria-hidden /></button>
            <button className="mobile-phase" onClick={() => vizRef.current.scrollIntoView({ behavior: 'smooth' })}>
              <small>Phase {active + 1} of 6</small>
              {phase.name}
            </button>
            <button className="primary" onClick={() => go(active + 1)} disabled={active >= last} aria-label="Next phase"><ChevronRight size={20} aria-hidden /></button>
          </div>
        </nav>
      )}
      </>)}
    </div>
  )
}

// Shows the traced source line and lets students walk line by line without going back to the editor.
function TraceBar({ line, source, onSelectLine }) {
  const lines = (source ?? '').split('\n')
  return (
    <span className="trace">
      <button onClick={() => onSelectLine(line - 1)} disabled={line <= 1} aria-label="Trace previous line"><ChevronUp size={16} aria-hidden /></button>
      <button onClick={() => onSelectLine(line + 1)} disabled={line >= lines.length} aria-label="Trace next line"><ChevronDown size={16} aria-hidden /></button>
      <span className="trace-text">
        Line {line}: <code>{lines[line - 1]?.trim() || '(blank line)'}</code>
      </span>
      <button onClick={() => onSelectLine(null)} aria-label="Stop tracing"><X size={16} aria-hidden /></button>
    </span>
  )
}

// First-visit tips; the "hidden" choice is remembered in this browser only.
function Intro({ id, children }) {
  const key = `compilens-intro-${id}`
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(key) !== 'hidden' } catch { return true } })
  if (!open) return null
  return (
    <div className="intro-card" role="note">
      <div className="intro-body">{children}</div>
      <button
        className="icon-btn"
        aria-label="Hide these tips"
        title="Hide these tips"
        onClick={() => { setOpen(false); try { localStorage.setItem(key, 'hidden') } catch { /* private mode */ } }}
      ><X size={18} aria-hidden /></button>
    </div>
  )
}

function LanguageHelp() {
  return (
    <details className="lang-help">
      <summary>What C can I write here?</summary>
      <div className="lang-cols">
        <div>
          <strong>Supported</strong>
          <ul>
            <li><code>int x;</code> <code>float y = 2.5;</code></li>
            <li><code>x = x + 1;</code> with <code>+ - * / %</code></li>
            <li><code>&lt; &lt;= &gt; &gt;= == !=</code> <code>&amp;&amp; || !</code></li>
            <li><code>if (…) {'{…}'} else {'{…}'}</code></li>
            <li><code>while (…) {'{…}'}</code></li>
            <li><code>print(x);</code> <code>printf("x=%d\n", x);</code></li>
            <li><code>// comments</code> and <code>/* comments */</code></li>
          </ul>
        </div>
        <div>
          <strong>Not supported</strong>
          <ul>
            <li><code>#include</code>, <code>main()</code> and other functions</li>
            <li><code>for</code>, <code>do</code>, <code>switch</code>, <code>break</code></li>
            <li><code>x++</code>, <code>x += 1</code> (write <code>x = x + 1;</code>)</li>
            <li>arrays, pointers, <code>char</code>, <code>scanf</code></li>
          </ul>
          <p className="muted">Write the statements directly, without <code>main()</code>.</p>
        </div>
      </div>
    </details>
  )
}

function ErrorCard({ result, onSelectLine }) {
  const { msg, line, col } = result.error || {}
  const title = { request: 'Could not compile', internal: 'Internal compiler error' }[result.phase]
    ?? `${result.phase[0].toUpperCase()}${result.phase.slice(1)} error: compilation stopped here`
  return (
    <div className="error-card" role="alert">
      <strong>{title}</strong>
      <p className="error-msg">
        {msg}
        {line && (
          <> (<button className="link" onClick={() => onSelectLine(line)}>line {line}{col ? `, column ${col}` : ''}</button>)</>
        )}
      </p>
      {ERROR_HINTS[result.phase] && <p className="muted">{ERROR_HINTS[result.phase]}</p>}
    </div>
  )
}

function Editor({ value, onChange, selLine, errLine, onSelectLine, onRun }) {
  const [scroll, setScroll] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const gutter = useRef(null)
  const lineCount = value.split('\n').length
  const caretLine = e => onSelectLine(e.target.value.slice(0, e.target.selectionStart).split('\n').length)
  const band = (line, cls) =>
    line && <div className={`line-band ${cls}`} style={{ top: (line - 1) * LINE_HEIGHT - scroll }} aria-hidden />

  return (
    <div className="editor">
      <div className="gutter" ref={gutter} aria-hidden>
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className={i + 1 === errLine ? 'err' : i + 1 === selLine ? 'sel' : undefined}
            onClick={() => onSelectLine(i + 1)}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="code-area">
        {band(errLine, 'err')}
        {selLine !== errLine && band(selLine, 'sel')}
        {/* coloured copy of the code under a transparent textarea, kept aligned on scroll */}
        <pre className="code-colors" aria-hidden>
          <code style={{ transform: `translate(${-scrollLeft}px, ${-scroll}px)` }}>
            {highlightC(value).map(([cls, text], i) => (cls ? <span key={i} className={cls}>{text}</span> : text))}
            {'\n'}
          </code>
        </pre>
        <textarea
          aria-label="C source code"
          value={value}
          spellCheck={false}
          wrap="off"
          autoCapitalize="off"
          autoCorrect="off"
          onChange={e => onChange(e.target.value)}
          onClick={caretLine}
          onKeyUp={e => e.key.startsWith('Arrow') && caretLine(e)}
          onKeyDown={e => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && onRun()}
          onScroll={e => {
            setScroll(e.target.scrollTop)
            setScrollLeft(e.target.scrollLeft)
            gutter.current.scrollTop = e.target.scrollTop
          }}
        />
      </div>
    </div>
  )
}
