import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "build", "server", "assets");
const dest = path.join(root, ".amplify-hosting", "compute", "default", "assets");

try {
  await access(src);
} catch {
  console.warn("sync-amplify-compute-assets: build/server/assets not found, skipping");
  process.exit(0);
}

await mkdir(path.dirname(dest), { recursive: true });
await cp(src, dest, { recursive: true, force: true });
console.log("Synced build/server/assets -> .amplify-hosting/compute/default/assets");

const computeDir = path.join(root, ".amplify-hosting", "compute", "default");
const envProduction = path.join(root, ".env.production");
try {
  await access(envProduction);
  await cp(envProduction, path.join(computeDir, ".env.production"), { force: true });
  console.log("Copied .env.production -> .amplify-hosting/compute/default/.env.production");
} catch {
  console.warn("sync-amplify-compute-assets: .env.production not found, skipping");
}
