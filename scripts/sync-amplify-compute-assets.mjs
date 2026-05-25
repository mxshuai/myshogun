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
