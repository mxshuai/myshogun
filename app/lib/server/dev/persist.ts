import fs from "fs/promises";
import path from "path";

const DEV_DIR = path.join(process.cwd(), ".dev-data");

export function getDevDataPath(filename: string): string {
  return path.join(DEV_DIR, filename);
}

export async function ensureDevDir(): Promise<void> {
  await fs.mkdir(DEV_DIR, { recursive: true });
}

export async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  await ensureDevDir();
  const dest = getDevDataPath(filename);
  try {
    const raw = await fs.readFile(dest, "utf8");
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    return JSON.parse(trimmed) as T;
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") return fallback;
    const isSyntax =
      e instanceof SyntaxError ||
      (e && typeof e === "object" && (e as Error).name === "SyntaxError");
    if (isSyntax) {
      console.warn(
        `[dev-data] ${filename} is not valid JSON; using empty fallback. ` +
          "If you had local pages/shops, restore from backup or re-run dev-login.",
      );
      return fallback;
    }
    throw e;
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDevDir();
  const dest = getDevDataPath(filename);
  const payload = JSON.stringify(data, null, 2);
  const tmp = `${dest}.tmp`;
  await fs.writeFile(tmp, payload, { encoding: "utf8" });
  await fs.rename(tmp, dest);
}
