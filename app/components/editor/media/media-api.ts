import type { ImageValue, MediaListItem } from "./types";

async function readJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json;
}

export async function fetchShogunMedia(shopDomain: string): Promise<MediaListItem[]> {
  const params = new URLSearchParams({ shopDomain });
  const res = await fetch(`/api/assets/media?${params}`);
  const json = await readJson<{ ok: true; assets: MediaListItem[] }>(res);
  return json.assets;
}

export async function registerShogunMedia(
  shopDomain: string,
  payload: ImageValue & { contentType?: string },
): Promise<MediaListItem> {
  const res = await fetch("/api/assets/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shopDomain,
      url: payload.url,
      filename: payload.filename,
      contentType: payload.contentType,
      size: payload.size,
      width: payload.width,
      height: payload.height,
    }),
  });
  const json = await readJson<{ ok: true; asset: MediaListItem }>(res);
  return json.asset;
}

export async function fetchShopifyFiles(
  shopDomain: string,
  params?: { query?: string; after?: string },
): Promise<{
  files: MediaListItem[];
  endCursor: string | null;
  hasNextPage: boolean;
}> {
  const search = new URLSearchParams({ shopDomain });
  if (params?.query) search.set("query", params.query);
  if (params?.after) search.set("after", params.after);
  const res = await fetch(`/api/shopify/files?${search}`);
  const json = await readJson<{
    ok: true;
    files: MediaListItem[];
    endCursor: string | null;
    hasNextPage: boolean;
  }>(res);
  return json;
}

export async function uploadToShogun(
  shopDomain: string,
  file: File,
): Promise<ImageValue> {
  const presignRes = await fetch("/api/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shopDomain,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    }),
  });
  const presign = await readJson<{
    ok: true;
    uploadUrl: string;
    publicUrl: string;
  }>(presignRes);

  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }

  let width: number | null = null;
  let height: number | null = null;
  try {
    const bitmap = await createImageBitmap(file);
    width = bitmap.width;
    height = bitmap.height;
    bitmap.close();
  } catch {
    // ignore dimension probe failures
  }

  const value: ImageValue = {
    url: presign.publicUrl,
    filename: file.name,
    size: file.size,
    width,
    height,
  };

  await registerShogunMedia(shopDomain, {
    ...value,
    contentType: file.type || "application/octet-stream",
  });

  return value;
}
