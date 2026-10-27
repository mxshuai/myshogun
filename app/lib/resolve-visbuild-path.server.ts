import { decodePathname } from "./page-path";

export function resolveVisbuildPath(path = ""): {
  isEditorRoute: boolean;
  path: string;
} {
  let pathname = path.trim();
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  const segments = pathname.split("/");
  const isEditorRoute = segments.at(-1) === "edit";
  const kept = isEditorRoute ? segments.slice(0, -1) : segments;
  let resolved = kept.join("/");
  if (!resolved.startsWith("/")) resolved = `/${resolved}`;
  if (resolved.length > 1 && resolved.endsWith("/")) {
    resolved = resolved.slice(0, -1);
  }
  return { isEditorRoute, path: resolved || "/" };
}

/** Read the page path from the encoded request URL, decoding each segment once. */
export function resolveShopVisbuildPath(
  requestUrl: string,
  shopDomain: string,
): { isEditorRoute: boolean; path: string } {
  const url = new URL(requestUrl);
  const prefix = `/shop/${encodeURIComponent(shopDomain)}`;
  let rest = url.pathname;
  if (rest.startsWith(prefix)) {
    rest = rest.slice(prefix.length);
  } else {
    const match = rest.match(/^\/shop\/[^/]+(\/.*)?$/);
    rest = match?.[1] ?? "/";
  }
  if (!rest) rest = "/";
  if (!rest.startsWith("/")) rest = `/${rest}`;
  return resolveVisbuildPath(decodePathname(rest));
}
