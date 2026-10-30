"use client";

type MediaPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

function buildPageNumbers(page: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

export function MediaPagination({
  page,
  totalPages,
  onPageChange,
  disabled,
}: MediaPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(page, totalPages);

  return (
    <nav
      className="visbuild-media-modal__pagination"
      aria-label="Pagination"
    >
      <button
        type="button"
        className="visbuild-media-modal__page-btn"
        disabled={disabled || page <= 1}
        aria-label="Previous page"
        onClick={() => onPageChange(page - 1)}
      >
        ‹
      </button>
      {pages.map((p, index) => {
        const prev = pages[index - 1];
        const showEllipsis = prev != null && p - prev > 1;
        return (
          <span key={p} className="visbuild-media-modal__page-group">
            {showEllipsis ? (
              <span className="visbuild-media-modal__page-ellipsis">…</span>
            ) : null}
            <button
              type="button"
              className={`visbuild-media-modal__page-btn${p === page ? " is-active" : ""}`}
              disabled={disabled}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          </span>
        );
      })}
      <button
        type="button"
        className="visbuild-media-modal__page-btn"
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
