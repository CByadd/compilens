# Compilens

Watch a C program go through all six compiler phases in the browser: tokens → AST → symbol table → three-address code → optimization → pseudo-assembly. Click any line to see what it became in every phase.

- `api/_compiler/`: the compiler, plain Python, no dependencies (`lexer`, `parser`, `semantic`, `icg`, `optimizer`, `codegen`, `pipeline`)
- `api/index.py`: Flask endpoint `POST /api/compile` (a Vercel serverless function)
- `src/`: React frontend (Vite)
- `src/grammar.js`: Parser Lab engine (FIRST/FOLLOW, LL(1) table and parse; LR(0) and LR(1) items and states; LR(0), SLR(1), LALR(1) and CLR(1) ACTION/GOTO tables and parse). It runs in the browser, so no API call is needed. Open it with the **Parser Lab** switch or the `#parser` link.
- `tests/test_cases.py`: TC-01 … TC-10 from the report, plus guards

## Run locally

```bash
pip install -r requirements.txt
npm install
python -m flask --app api/index run --port 5000   # terminal 1
npm run dev                                       # terminal 2 → http://localhost:5173
```

## Tests

```bash
python tests/test_cases.py
npm test
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On vercel.com: **Add New → Project**, import the repo, and keep the defaults (framework: Vite). Deploy.
3. Share the **production** URL (`<project>.vercel.app`). Preview URLs are behind a Vercel login by default.

Before a demo, open the site once yourself: the first request after a while wakes the Python function and takes 1–2 s.

## API

`POST /api/compile` with `{"source": "int a; a = 1; print(a);"}` returns
`{ok, ms, tokens, ast, symbols, warnings, tac, opt_tac, opt_trace, asm}`. On a compile error it returns
`{ok: false, phase, error: {msg, line, col}}` plus the output of every phase that finished.
Each token, AST node, TAC quad and asm line carries `line`.
