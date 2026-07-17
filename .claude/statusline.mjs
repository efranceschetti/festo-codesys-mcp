#!/usr/bin/env node
import { readdirSync, statSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

function safe(fn, fallback = "?") {
  try { return fn(); } catch { return fallback; }
}

const branch = safe(() => execSync("git branch --show-current", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(), "?");

const buildSym = safe(() => {
  const buildMtime = statSync("build/index.js").mtimeMs;
  let newest = 0;
  function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (f.endsWith(".ts")) newest = Math.max(newest, s.mtimeMs);
    }
  }
  walk("src");
  return buildMtime >= newest ? "✓" : "⚠";
}, "✗");

const fbCount = safe(() => {
  let n = 0;
  function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else if (f.endsWith(".st")) n++;
    }
  }
  walk("knowledge/library");
  return n;
}, "?");

const sdk = safe(() => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  return pkg.dependencies["@modelcontextprotocol/sdk"].replace(/^\^/, "");
}, "?");

process.stdout.write(`⎇ ${branch} │ build ${buildSym} │ ${fbCount} FBs │ SDK ${sdk}`);
