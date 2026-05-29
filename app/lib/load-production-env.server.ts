import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function applyEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Amplify Web Compute doesn't reliably expose console env at runtime.
// Load env files generated during build as a fallback.
for (const filePath of [
  join(process.cwd(), ".env.production"),
  join(process.cwd(), ".env.production.local"),
]) {
  applyEnvFile(filePath);
}
