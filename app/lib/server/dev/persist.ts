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
    return JSON.parse(raw) as T;
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") return fallback;
    throw e;
  }
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDevDir();
  await fs.writeFile(getDevDataPath(filename), JSON.stringify(data, null, 2), {
    encoding: "utf8",
  });
}
