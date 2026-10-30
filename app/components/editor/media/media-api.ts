import { resolveImageContentType } from "~/lib/image-mime";

import { MEDIA_PAGE_SIZE } from "./media-constants";
import type { ImageValue, MediaListItem } from "./types";

export type MediaPageResult = {
  items: MediaListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

async function readJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json;
}

export async function fetchShogunMedia(
  shopDomain: string,
  params?: {
    page?: number;
    query?: string;
    limit?: number;
    /** Page 1 reserves one grid slot for the upload dropzone. */
    withDropzone?: boolean;
  },
): Promise<MediaPageResult> {
  const search = new URLSearchParams({ shopDomain });
  const limit = params?.limit ?? MEDIA_PAGE_SIZE;
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(limit));
  if (params?.withDropzone) {
    search.set("firstPageLimit", String(Math.max(1, limit - 1)));
  }
  if (params?.query) search.set("query", params.query);

  const res = await fetch(`/api/assets/media?${search}`);
  const json = await readJson<{
    ok: true;
    assets: MediaListItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>(res);

  return {
    items: json.assets,
    page: json.page,
    pageSize: json.pageSize,
    total: json.total,
    totalPages: json.totalPages,
  };
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
  params?: { query?: string; after?: string; first?: number },
): Promise<{
  files: MediaListItem[];
  endCursor: string | null;
  hasNextPage: boolean;
}> {
  const search = new URLSearchParams({ shopDomain });
  search.set("first", String(params?.first ?? MEDIA_PAGE_SIZE));
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
  const contentType = resolveImageContentType(file.name, file.type);

  const presignRes = await fetch("/api/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shopDomain,
      filename: file.name,
      contentType,
      size: file.size,
    }),
  });
  const presign = await readJson<{
    ok: true;
    uploadUrl: string;
    publicUrl: string;
  }>(presignRes);

  const putRes = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
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
    contentType,
  });

  return value;
}
