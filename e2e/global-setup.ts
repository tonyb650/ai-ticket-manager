import { spawnSync } from "node:child_process";
import path from "node:path";
import { config as loadEnv } from "dotenv";

export default async function globalSetup() {
  loadEnv({ path: path.resolve(__dirname, ".env.test") });

  const serverDir = path.resolve(__dirname, "../server");
  const env = { ...process.env };

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set after loading e2e/.env.test");
  }

  run("bunx", ["prisma", "migrate", "deploy"], serverDir, env);
  run("bun", ["src/scripts/seed.ts"], serverDir, env);
}

function run(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  const result = spawnSync(cmd, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited with code ${result.status}`);
  }
}
