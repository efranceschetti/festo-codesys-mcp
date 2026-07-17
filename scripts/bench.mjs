/**
 * Cross-platform launcher for the BM25 benchmark suite.
 * `BENCH=1 node --test ...` is POSIX-only; this works on Windows too.
 */
import { spawnSync } from 'node:child_process';

const r = spawnSync(
  process.execPath,
  ['--test', 'build/__tests__/bm25-bench.test.js'],
  { stdio: 'inherit', env: { ...process.env, BENCH: '1' } },
);
process.exit(r.status ?? 1);
