import { spawn } from "node:child_process";

const target = process.env.TAURI_TARGET === "admin" ? "admin" : "student";
const command = target === "admin" ? "npm run dev:admin" : "npm run dev:student";

const child = spawn(command, {
  shell: true,
  stdio: "inherit",
});

const cleanup = () => {
  if (!child.killed) {
    child.kill("SIGINT");
  }
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});


