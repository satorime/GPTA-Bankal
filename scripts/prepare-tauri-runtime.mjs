import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const resourcesRoot = path.resolve(projectRoot, "src-tauri", "resources");

const target = process.env.TAURI_TARGET === "admin" ? "admin" : "student";
// Use different ports for student (1420) and admin (1421) so both can run simultaneously
const port = process.env.TAURI_SERVER_PORT ?? (target === "admin" ? "1421" : "1420");

const envCandidates = [
  path.resolve(projectRoot, `.env.desktop.${target}`),
  path.resolve(projectRoot, ".env.desktop"),
  path.resolve(projectRoot, ".env.local"),
];

async function run(command) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function ensureNodeRuntime() {
  const nodeSrc = path.dirname(process.execPath);
  const nodeDest = path.resolve(projectRoot, "src-tauri", "resources", "node");
  await fs.rm(nodeDest, { recursive: true, force: true });
  await fs.cp(nodeSrc, nodeDest, { recursive: true });
}

async function copyStandaloneOutput() {
  const standaloneSrc = path.resolve(projectRoot, ".next", "standalone");
  const staticSrc = path.resolve(projectRoot, ".next", "static");
  const publicSrc = path.resolve(projectRoot, "public");
  const appDest = path.resolve(resourcesRoot, "app", target);

  await fs.rm(appDest, { recursive: true, force: true });
  await fs.mkdir(appDest, { recursive: true });
  await fs.cp(standaloneSrc, appDest, { recursive: true });
  const nextStaticDest = path.resolve(appDest, ".next", "static");
  await fs.rm(nextStaticDest, { recursive: true, force: true });
  await fs.cp(staticSrc, nextStaticDest, { recursive: true });
  const publicDest = path.resolve(appDest, "public");
  await fs.rm(publicDest, { recursive: true, force: true });
  await fs.cp(publicSrc, publicDest, { recursive: true });

  const buildIdSrc = path.resolve(projectRoot, ".next", "BUILD_ID");
  try {
    const buildId = await fs.readFile(buildIdSrc, "utf8");
    await fs.writeFile(path.resolve(appDest, ".next", "BUILD_ID"), buildId);
  } catch {
    // ignore if missing
  }

  await fs.writeFile(path.resolve(appDest, "server-port.txt"), port);
}

async function prepareEnvFile() {
  let envData = {};
  for (const candidate of envCandidates) {
    try {
      const content = await fs.readFile(candidate, "utf8");
      envData = { ...envData, ...dotenv.parse(content) };
    } catch {
      // ignore
    }
  }

  envData.NEXT_PUBLIC_APP_INSTANCE = target;

  const envDest = path.resolve(resourcesRoot, "app", target, "env.runtime.json");
  await fs.writeFile(envDest, JSON.stringify(envData, null, 2), "utf8");
}

async function main() {
  const buildCommand = target === "admin" ? "npm run build:admin" : "npm run build:student";
  await fs.mkdir(resourcesRoot, { recursive: true });
  await fs.mkdir(path.resolve(resourcesRoot, "app"), { recursive: true });
  await run(buildCommand);
  await ensureNodeRuntime();
  await copyStandaloneOutput();
  await prepareEnvFile();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

