import { useRef } from 'react'

const COMPILER_WORDS = [
  ['Token', 'One "word" of a program: a keyword (int), a name (x), a number (42) or a symbol (+, ;).'],
  ['Syntax tree (AST)', 'A tree showing how the tokens fit together. Deeper nodes are worked out first.'],
  ['Symbol table', 'The list of every declared variable, with its type and the block (scope) it belongs to.'],
  ['Scope', 'The { } block a variable lives in. An inner block can declare its own variable with the same name.'],
  ['Three-address code', 'Simple steps that each do one operation, like t1 = a + b.'],
  ['Temporary (t1, t2…)', 'A helper variable the compiler invents to hold a partial result.'],
  ['Constant folding', 'Doing math on constants while compiling: 3 * 2 becomes 6 before the program runs.'],
  ['Dead code', 'Work whose result is never used. The optimizer deletes it.'],
  ['Register (R0–R7)', 'A tiny, very fast storage slot inside the CPU. Math happens in registers.'],
]

const PARSER_WORDS = [
  ['Grammar', 'Rules like E -> E + T that say which token sequences are valid.'],
  ['Terminal / nonterminal', 'Terminals are tokens (id, +). Nonterminals (E, T) have rules and stand for groups of tokens.'],
  ['ε (epsilon)', 'The empty string: a rule A -> ε means A may match nothing.'],
  ['FIRST(A)', 'Tokens that can appear first in something A produces.'],
  ['FOLLOW(A)', 'Tokens that can appear right after A. $ means end of input.'],
  ['Item', 'A rule with a dot, A -> α · β: α has been read, β is still expected.'],
  ['Lookahead', 'The next input token, used to choose between actions.'],
  ['Shift / reduce', 'Shift pushes the next token on the stack; reduce replaces a rule\'s right side with its left side.'],
  ['Conflict', 'A table cell with two possible actions. The parser cannot decide, so the grammar does not fit it.'],
]

export default function Help() {
  const dialog = useRef(null)
  return (
    <>
      <button className="icon-btn" onClick={() => dialog.current.showModal()} aria-label="Help and glossary" title="Help and glossary">?</button>
      <dialog ref={dialog} className="help" onClick={e => e.target === dialog.current && dialog.current.close()}>
        <div className="help-head">
          <h2>How Compilens works</h2>
          <button className="icon-btn" onClick={() => dialog.current.close()} aria-label="Close">✕</button>
        </div>
        <ol className="help-steps">
          <li><strong>C Compiler:</strong> write a small C program (or load a sample) and press <b>Compile</b>. Step through the six phases with <b>Next</b>; tap any line of code to see what it became in each phase.</li>
          <li><strong>Parser Lab:</strong> type a grammar and an input. Compare how the five parsers build their tables, and watch each one parse the input step by step.</li>
        </ol>
        <div className="glossary">
          <section>
            <h3>Compiler words</h3>
            <dl>{COMPILER_WORDS.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
          </section>
          <section>
            <h3>Parser words</h3>
            <dl>{PARSER_WORDS.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl>
          </section>
        </div>
      </dialog>
    </>
  )
}
