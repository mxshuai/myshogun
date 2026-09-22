import type { MediaAssetsPage } from "./types";

export function paginateMediaList<T>(
  items: T[],
  params?: {
    page?: number;
    limit?: number;
    firstPageLimit?: number;
  },
): Omit<MediaAssetsPage, "assets"> & { items: T[] } {
  const pageSize = Math.max(1, params?.limit ?? 28);
  const firstPageLimit = Math.max(1, params?.firstPageLimit ?? pageSize);
  const page = Math.max(1, params?.page ?? 1);
  const total = items.length;

  const totalPages =
    total <= firstPageLimit
      ? 1
      : 1 + Math.ceil((total - firstPageLimit) / pageSize);

  const safePage = Math.min(page, totalPages);
  const start =
    safePage === 1 ? 0 : firstPageLimit + (safePage - 2) * pageSize;
  const take = safePage === 1 ? firstPageLimit : pageSize;

  return {
    items: items.slice(start, start + take),
    total,
    page: safePage,
    pageSize: take,
    totalPages,
  };
}
