// Turns a TAC quadruple {op, a1, a2, res} into the textbook one-line form.
export function formatQuad({ op, a1, a2, res }) {
  switch (op) {
    case '=': return `${res} = ${a1}`
    case 'label': return `${res}:`
    case 'goto': return `goto ${res}`
    case 'ifFalse': return `ifFalse ${a1} goto ${res}`
    case 'print': return `print ${a1}`
    case 'param': return `param ${a1}`
    case 'printf': return `call printf, ${a1}, ${a2}`
    case 'neg': return `${res} = -${a1}`
    case '!': return `${res} = !${a1}`
    default: return `${res} = ${a1} ${op} ${a2}`
  }
}

const isNumber = s => /^-?(\d|\.\d)/.test(s ?? '')
const COMPARE = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠' }

// Plain-English meaning of one TAC quadruple.
export function explainQuad({ op, a1, a2, res }) {
  switch (op) {
    case '=': return isNumber(a1) ? `Store the value ${a1} in ${res}` : `Copy ${a1} into ${res}`
    case 'label': return `Marker ${res}: jumps can land here`
    case 'goto': return `Jump to ${res}`
    case 'ifFalse': return `If ${a1} is 0 (false), jump to ${res}`
    case 'print': return `Print the value of ${a1}`
    case 'param': return `Pass ${a1} to the next call`
    case 'printf': return `Call printf with ${a2} argument(s)`
    case 'neg': return `${res} = negative of ${a1}`
    case '!': return `${res} = 1 if ${a1} is 0, otherwise 0`
    case '&&': return `${res} = 1 if both ${a1} and ${a2} are non-zero, otherwise 0`
    case '||': return `${res} = 1 if ${a1} or ${a2} is non-zero, otherwise 0`
  }
  if (op in COMPARE) return `${res} = 1 if ${a1} ${COMPARE[op]} ${a2}, otherwise 0`
  return `Compute ${a1} ${op} ${a2}, save it in ${res}`
}

const ARITH = { ADD: '+', SUB: '−', MUL: '×', DIV: '÷', MOD: 'mod' }
const CMP_ASM = { CMPLT: '<', CMPLE: '≤', CMPGT: '>', CMPGE: '≥', CMPEQ: '=', CMPNE: '≠' }
const isReg = s => /^R\d$/.test(s)

// Plain-English meaning of one pseudo-assembly instruction.
export function explainAsm(text) {
  if (text.endsWith(':')) return `Label ${text.slice(0, -1)}: a place jumps can go to`
  const sp = text.indexOf(' ')
  const m = text.slice(0, sp)
  const args = text.slice(sp + 1).split(', ')
  const [d, a, b] = args.map(x => (x.startsWith('#') ? x.slice(1) : x))
  if (m === 'MOV') {
    if (!isReg(d)) return `Store ${a} into variable ${d} in memory`
    if (args[1].startsWith('#')) return `Put the number ${a} into register ${d}`
    if (isReg(a)) return `Copy register ${a} into ${d}`
    return `Load variable ${a} from memory into register ${d}`
  }
  if (m in ARITH) return `${d} = ${a} ${ARITH[m]} ${b}`
  if (m in CMP_ASM) return `${d} = 1 if ${a} ${CMP_ASM[m]} ${b}, otherwise 0`
  switch (m) {
    case 'AND': return `${d} = 1 if ${a} and ${b} are both non-zero`
    case 'OR': return `${d} = 1 if ${a} or ${b} is non-zero`
    case 'NEG': return `${d} = −${a}`
    case 'NOT': return `${d} = 1 if ${a} is 0, otherwise 0`
    case 'CMP': return `Compare ${d} with ${a}`
    case 'JE': return `If they were equal (the condition was false), jump to ${d}`
    case 'JMP': return `Jump to ${d}`
    case 'OUT': return `Print ${d}`
    case 'PUSH': return `Push ${d} as an argument`
    case 'PRINTF': return `Call printf with ${a} argument(s)`
  }
  return ''
}

const KEYWORDS =new Set(['INT', 'FLOAT', 'IF', 'ELSE', 'WHILE', 'PRINT', 'PRINTF'])

export function tokenCategory(kind) {
  if (KEYWORDS.has(kind)) return 'kw'
  if (kind === 'ID') return 'id'
  if (kind.endsWith('_LIT') || kind === 'STRING') return 'lit'
  if (kind === 'EOF') return 'eof'
  return 'op'
}
