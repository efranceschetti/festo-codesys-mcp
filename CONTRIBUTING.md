# Contributing to festo-codesys-mcp

Thanks for your interest! This project welcomes issues and pull requests.

## Development setup

**TypeScript server** (Node.js ≥ 20):

```bash
npm ci
npm run build     # tsc → build/
npm test          # node:test — 676 tests
npm run lint      # eslint, zero-warning policy
```

**Python validation gates** (XSD + semantic, used by `validate_plcopen_xsd` /
`validate_plcopen_semantic`):

```bash
cd python
uv sync           # or: pip install lxml pytest
uv run pytest -q  # or: python -m pytest -q
```

A ready-to-use GitHub Actions workflow is included at `.github/ci.yml` (Node 22/24 + Python via uv on Ubuntu, regenerating the fixture before the XSD gate). To enable CI, move it to `.github/workflows/ci.yml` — via the GitHub web UI, or locally after `gh auth refresh -h github.com -s workflow`.

## Code style

- ESLint flat config, `--max-warnings 0` — the build fails on any warning.
- Single quotes, 2-space indent, semicolons, `prefer-const`, `eqeqeq`.
- English only — identifiers, comments, docs, commit messages.
- Tests use `node:test` + `assert/strict`; every bug fix ships with a
  regression test that failed before the fix.

## What makes a good PR

- One focused change per PR, with tests.
- For generator changes (`src/utils/st-parser.ts`, `src/utils/xml-builder.ts`):
  regenerate the synthetic fixture (`node scripts/gen-synthetic-fixture.mjs`)
  and confirm the Python XSD gate still passes — the fixture must validate
  against the official PLCopen schema (v2.01, tc6_0200-namespace patched).
- For knowledge-base additions: keep content generic (no company- or
  machine-specific data), English, with the frontmatter fields used by the
  BM25 index (`id`, `title`, `priority`, `use_when`, `keywords`, `see_also`).
- Follow the quality gates in the `engineering-discipline` knowledge topic —
  they apply to contributions too: verify before delivering, no regressions,
  nothing deferred silently.

## Known future work

- **MCP SDK v2 migration** — this server pins `@modelcontextprotocol/sdk`
  `^1.29.0` (the final v1 line). SDK v2 (stateless protocol, split packages:
  `@modelcontextprotocol/server` etc.) is scheduled to ship with the
  2026-07-28 MCP spec revision; the official codemod (`npx @modelcontextprotocol/codemod@beta v1-to-v2`)
  is the intended migration path. Contributions welcome.
- **PLCopen XML round-trip identity** — the generator intentionally does not
  yet emit per-object `ObjectId` GUIDs, `<libraries>`, or a populated
  `<instances>` device tree (documented in the `ground-truth` topic). Adding
  deterministic ObjectIds is a welcome enhancement.
