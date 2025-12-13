#!/usr/bin/env node

import { spawn } from "child_process";

const args = process.argv.slice(2);
const instance = process.env.NEXT_PUBLIC_APP_INSTANCE || "student";

// Start Next.js dev server
const child = spawn("npx", ["next", "dev", ...args], {
  stdio: "pipe",
  shell: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_APP_INSTANCE: instance,
  },
});

// Filter out the startup message
child.stdout.on("data", (data) => {
  const output = data.toString();
  // Only show errors and warnings, suppress the startup banner
  if (
    !output.includes("▲ Next.js") &&
    !output.includes("Local:") &&
    !output.includes("Network:") &&
    !output.includes("✓ Starting...") &&
    !output.includes("✓ Ready in")
  ) {
    process.stdout.write(output);
  }
});

child.stderr.on("data", (data) => {
  process.stderr.write(data);
});

child.on("close", (code) => {
  process.exit(code || 0);
});

// Handle Ctrl+C
process.on("SIGINT", () => {
  child.kill("SIGINT");
  process.exit(0);
});

