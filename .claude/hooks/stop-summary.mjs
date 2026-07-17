#!/usr/bin/env node
import { execSync } from "node:child_process";

try {
  const out = execSync("git status --short").toString();
  const lines = out.split("\n").filter(l => /\.(st|xml)$/.test(l));
  if (lines.length === 0) {
    console.log("(no .st/.xml changes this session)");
  } else {
    console.log("# Modified .st/.xml files:");
    for (const l of lines) console.log(l);
  }
} catch {
  // not a git repo or git not available — silent
}
