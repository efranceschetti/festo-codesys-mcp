---
description: Start-of-day routine — sync the repo, keep deps in sync, get build/test/lint green, show the latest commits and open PRs.
allowed-tools: Bash, mcp__festo-codesys-mcp__plc_lookup
---

Pre-work routine. Run in order; stop at the first error and report.

Sequence:

1. **Local status** — `git status --short`. If there are pending changes, WARN the user but continue.
2. **Sync with remote** — `git fetch origin`, then show `git log HEAD..origin/main --oneline` to see what is new. Do NOT pull automatically — ask whether to integrate.
3. **Check the lockfile** — `git diff --name-only HEAD..origin/main -- package-lock.json` (after the fetch above). If it changed on the remote, run `npm ci`.
4. **Build/test/lint cycle** — sequential:
   - `npm run build`
   - `npm test`
   - `npm run lint`
   Stop at the first failure.
5. **Latest commits** — `git log --oneline -10`.
6. **Open PRs** — `gh pr list --state open` (if `gh` is available; fail silently otherwise).
7. **Final summary** — one line: `✓ ready to work | branch=<X> | <Y> commits ahead/behind | tests=<N>/<N>`.

NEVER commit, push, or merge automatically in this routine.
