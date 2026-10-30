export type ImageValue = {
  url: string;
  filename?: string;
  size?: number | null;
  width?: number | null;
  height?: number | null;
};

export type MediaListItem = {
  id: string;
  url: string;
  filename: string;
  size?: number | null;
  width?: number | null;
  height?: number | null;
};

export function isImageValue(value: unknown): value is ImageValue {
  return (
    typeof value === "object" &&
    value != null &&
    "url" in value &&
    typeof (value as ImageValue).url === "string"
  );
}

export function normalizeImageValue(value: unknown): ImageValue | null {
  if (typeof value === "string") {
    const url = value.trim();
    return url ? { url } : null;
  }
  if (isImageValue(value) && value.url.trim()) {
    return value;
  }
  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes}b`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)}kb`;
  return `${(kb / 1024).toFixed(1)}mb`;
}

export function formatDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
): string {
  if (width && height) return `${width} x ${height}px`;
  return "";
}
