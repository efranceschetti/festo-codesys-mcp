#!/usr/bin/env node
import { readdirSync, statSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

function walkSt(dir) {
  let count = 0;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) count += walkSt(p);
    else if (f.endsWith(".st")) count++;
  }
  return count;
}

const fbCount = walkSt("knowledge/library");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const sdk = pkg.dependencies["@modelcontextprotocol/sdk"];
const branch = execSync("git branch --show-current").toString().trim();

let buildStatus = "?";
try {
  const buildMtime = statSync("build/index.js").mtimeMs;
  let newestSrc = 0;
  function walkSrc(dir) {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      const s = statSync(p);
      if (s.isDirectory()) walkSrc(p);
      else if (f.endsWith(".ts")) newestSrc = Math.max(newestSrc, s.mtimeMs);
    }
  }
  walkSrc("src");
  buildStatus = buildMtime >= newestSrc ? "OK" : "STALE";
} catch {
  buildStatus = "MISSING";
}

console.log(`# FestoCodesysMCP | branch=${branch} | ${fbCount} FBs | SDK ${sdk} | build=${buildStatus}`);

// Project memory: if any theme file carries a real (dated) fact line beyond the
// commented template, remind the agent to read the memory index first.
try {
  const themeFiles = ["hardware.md", "project-blocks.md", "decisions.md", "errors-solved.md"];
  const hasFacts = themeFiles.some((f) => {
    const raw = readFileSync(join(".claude/memory", f), "utf8");
    return raw.split(/\r?\n/).some((l) => {
      const t = l.trim();
      return t.startsWith("-") && !t.startsWith("<!--");
    });
  });
  if (hasFacts) {
    console.log("Memory present: read .claude/memory/MEMORY.md before starting.");
  }
} catch {
  // fail-open: never let the memory check break session start
}
