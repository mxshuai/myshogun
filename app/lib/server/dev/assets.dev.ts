import fs from "fs/promises";
import path from "path";

import { ensureDevDir, getDevDataPath } from "./persist";

export function getDevUploadFilePath(key: string): string {
  const normalized = key.replace(/^\/+/, "").replace(/\\/g, "/");
  if (normalized.includes("..") || !normalized.startsWith("uploads/")) {
    throw new Error("Invalid upload key");
  }
  return path.join(getDevDataPath(""), normalized);
}

export function buildDevPublicUrl(key: string): string {
  return `/dev-uploads/${key.replace(/^\/+/, "")}`;
}

export function buildDevUploadUrl(key: string): string {
  return `/api/assets/dev-upload/${key.replace(/^\/+/, "")}`;
}

export async function writeDevUploadFile(
  key: string,
  body: Buffer,
): Promise<void> {
  const dest = getDevUploadFilePath(key);
  await ensureDevDir();
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
}

export async function readDevUploadFile(key: string): Promise<Buffer | null> {
  const dest = getDevUploadFilePath(key);
  try {
    return await fs.readFile(dest);
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") return null;
    throw e;
  }
}

export function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}
