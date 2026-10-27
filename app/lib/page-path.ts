/** URL-safe page slug: lowercase, digits, hyphens. Safe for client and server. */
export function slugFromTitle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Trim and add a leading slash. Keeps spaces and literal "%" so an existing
 * stored path can be recognized. Does not turn the path into a slug.
 */
export function literalPagePath(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.includes("..") || s.includes("//")) return null;
  while (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

/**
 * Path stored for a newly entered URL. Decodes each segment once, then slugs it.
 * "/" is rejected so the home page is not created from this helper.
 */
export function canonicalPagePath(raw: string): string | null {
  const literal = literalPagePath(raw);
  if (!literal || literal === "/") return null;
  const segments = literal
    .split("/")
    .slice(1)
    .map((segment) => slugFromTitle(decodeSegment(segment)));
  if (segments.length === 0 || segments.some((segment) => !segment)) return null;
  return `/${segments.join("/")}`;
}

/** Decode each path segment once. Leaves an already-decoded path unchanged. */
export function decodePathname(pathname: string): string {
  const decoded = pathname
    .split("/")
    .map((segment) => (segment ? decodeSegment(segment) : segment))
    .join("/");
  return decoded.startsWith("/") ? decoded : `/${decoded}`;
}
