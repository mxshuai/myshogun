import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Amplify Hosting SSR (Web Compute) does not inject console env vars at runtime.
 * Build writes `.env.production`; we load it before Shopify/AWS clients initialize.
 * @see https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html
 */
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

const candidates = [
  join(process.cwd(), ".env.production"),
  join(process.cwd(), ".env.production.local"),
];

for (const filePath of candidates) {
  applyEnvFile(filePath);
}
