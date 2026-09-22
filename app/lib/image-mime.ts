const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export function guessImageContentType(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

/** Prefer a real image/* MIME; fall back to extension when the browser omits file.type. */
export function resolveImageContentType(
  filename: string,
  mimeType?: string | null,
): string {
  const trimmed = mimeType?.trim().toLowerCase() ?? "";
  if (trimmed.startsWith("image/")) return trimmed;
  return guessImageContentType(filename);
}
