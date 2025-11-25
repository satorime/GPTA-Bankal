import { spawn } from "node:child_process";

async function run(command) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

run("node scripts/prepare-tauri-runtime.mjs").catch((err) => {
  console.error(err);
  process.exit(1);
});
