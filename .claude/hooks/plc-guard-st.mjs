#!/usr/bin/env node
// PreToolUse (Write|Edit) reminder for Structured Text files.
// Non-blocking, fail-open: reads the tool input from stdin, and if the target
// is a .st file, prints a one-line reminder about conventions + review.
let data = "";
process.stdin.on("data", (c) => (data += c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(data || "{}");
    const path = (input.tool_input && input.tool_input.file_path) || "";
    if (/\.st$/i.test(path)) {
      console.log(
        "[plc-guard] .st file: Hungarian+PascalCase required — writing-st-code skill applies; run review_st_code after.",
      );
    }
  } catch {
    // fail-open: never block the edit on a malformed payload
  }
});
