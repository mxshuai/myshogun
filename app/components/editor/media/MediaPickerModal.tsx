"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MediaPagination } from "./MediaPagination";
import { MEDIA_PAGE_SIZE } from "./media-constants";
import {
  fetchShogunMedia,
  fetchShopifyFiles,
  uploadToShogun,
} from "./media-api";
import type { ImageValue, MediaListItem } from "./types";
import { formatDimensions } from "./types";
import "./media.css";

type Tab = "shogun" | "shopify";

type MediaPickerModalProps = {
  shopDomain: string;
  onSelect: (value: ImageValue) => void;
  onClose: () => void;
};

function toImageValue(item: MediaListItem): ImageValue {
  return {
    url: item.url,
    filename: item.filename,
    size: item.size,
    width: item.width,
    height: item.height,
  };
}

export function MediaPickerModal({
  shopDomain,
  onSelect,
  onClose,
}: MediaPickerModalProps) {
  const [tab, setTab] = useState<Tab>("shogun");
  const [shogunItems, setShogunItems] = useState<MediaListItem[]>([]);
  const [shogunPage, setShogunPage] = useState(1);
  const [shogunTotalPages, setShogunTotalPages] = useState(1);
  const [shogunSearch, setShogunSearch] = useState("");
  const [shogunQuery, setShogunQuery] = useState("");
  const [shopifyItems, setShopifyItems] = useState<MediaListItem[]>([]);
  const [shopifyPage, setShopifyPage] = useState(1);
  const [shopifyTotalPages, setShopifyTotalPages] = useState(1);
  const [shopifySearch, setShopifySearch] = useState("");
  const [shopifyQuery, setShopifyQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shogunSearchTimerRef = useRef<number | null>(null);
  const shopifySearchTimerRef = useRef<number | null>(null);
  const shopifyCursorsRef = useRef<Record<number, string | null>>({ 1: null });
  const requestIdRef = useRef(0);

  const loadShogun = useCallback(
    async (page: number, query: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchShogunMedia(shopDomain, {
          page,
          query: query.trim() || undefined,
          withDropzone: true,
        });
        if (requestId !== requestIdRef.current) return;
        setShogunItems(result.items);
        setShogunPage(result.page);
        setShogunTotalPages(result.totalPages);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [shopDomain],
  );

  const loadShopifyPage = useCallback(
    async (targetPage: number, query: string) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      const q = query.trim() || undefined;

      try {
        let cursor: string | null = null;
        const cursors = shopifyCursorsRef.current;

        if (targetPage > 1) {
          if (cursors[targetPage] !== undefined) {
            cursor = cursors[targetPage];
          } else {
            let page = 1;
            let after: string | null = null;
            while (page < targetPage) {
              const step = await fetchShopifyFiles(shopDomain, {
                query: q,
                after: after ?? undefined,
                first: MEDIA_PAGE_SIZE,
              });
              cursors[page + 1] = step.endCursor;
              after = step.endCursor;
              page += 1;
              if (!step.hasNextPage && page < targetPage) {
                throw new Error("Page not found");
              }
            }
            cursor = after;
          }
        }

        const result = await fetchShopifyFiles(shopDomain, {
          query: q,
          after: cursor ?? undefined,
          first: MEDIA_PAGE_SIZE,
        });

        if (requestId !== requestIdRef.current) return;

        cursors[targetPage + 1] = result.endCursor;
        shopifyCursorsRef.current = cursors;

        setShopifyItems(result.files);
        setShopifyPage(targetPage);
        setShopifyTotalPages((prev) =>
          result.hasNextPage ? Math.max(prev, targetPage + 1) : targetPage,
        );
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [shopDomain],
  );

  useEffect(() => {
    if (tab !== "shogun") return;
    void loadShogun(shogunPage, shogunQuery);
  }, [tab, shogunPage, shogunQuery, loadShogun]);

  useEffect(() => {
    if (tab !== "shopify") return;
    void loadShopifyPage(shopifyPage, shopifyQuery);
  }, [tab, shopifyPage, shopifyQuery, loadShopifyPage]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadToShogun(shopDomain, file);
      }
      setShogunPage(1);
      await loadShogun(1, shogunQuery);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onShogunSearchChange = (value: string) => {
    setShogunSearch(value);
    if (shogunSearchTimerRef.current) {
      window.clearTimeout(shogunSearchTimerRef.current);
    }
    shogunSearchTimerRef.current = window.setTimeout(() => {
      setShogunPage(1);
      setShogunQuery(value);
    }, 300);
  };

  const onShopifySearchChange = (value: string) => {
    setShopifySearch(value);
    if (shopifySearchTimerRef.current) {
      window.clearTimeout(shopifySearchTimerRef.current);
    }
    shopifySearchTimerRef.current = window.setTimeout(() => {
      setShopifyPage(1);
      shopifyCursorsRef.current = { 1: null };
      setShopifyTotalPages(1);
      setShopifyQuery(value);
    }, 300);
  };

  const onTabChange = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  const items = tab === "shogun" ? shogunItems : shopifyItems;
  const currentPage = tab === "shogun" ? shogunPage : shopifyPage;
  const totalPages = tab === "shogun" ? shogunTotalPages : shopifyTotalPages;

  const handlePageChange = (page: number) => {
    if (tab === "shogun") {
      setShogunPage(page);
    } else {
      setShopifyPage(page);
    }
  };

  const showDropzone = tab === "shogun" && shogunPage === 1;

  return createPortal(
    <div className="visbuild-media-modal__backdrop" onClick={onClose}>
      <div
        className="visbuild-media-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Select image"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void handleUploadFiles(e.target.files)}
        />

        <div className="visbuild-media-modal__header">
          <div className="visbuild-media-modal__tabs">
            <button
              type="button"
              className={`visbuild-media-modal__tab${tab === "shogun" ? " is-active" : ""}`}
              onClick={() => onTabChange("shogun")}
            >
              Shogun
            </button>
            <button
              type="button"
              className={`visbuild-media-modal__tab${tab === "shopify" ? " is-active" : ""}`}
              onClick={() => onTabChange("shopify")}
            >
              Shopify
            </button>
          </div>
          {tab === "shogun" ? (
            <button
              type="button"
              className="visbuild-media-modal__upload-btn"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "+ Upload"}
            </button>
          ) : (
            <div className="visbuild-media-modal__search-wrap">
              <input
                type="search"
                className="visbuild-media-modal__search"
                placeholder="Search Shopify"
                value={shopifySearch}
                onChange={(e) => onShopifySearchChange(e.target.value)}
              />
            </div>
          )}
        </div>

        {tab === "shogun" ? (
          <div className="visbuild-media-modal__toolbar">
            <input
              type="search"
              className="visbuild-media-modal__search"
              placeholder="Search media library"
              value={shogunSearch}
              onChange={(e) => onShogunSearchChange(e.target.value)}
            />
          </div>
        ) : null}

        {error ? (
          <div className="visbuild-media-modal__error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="visbuild-media-modal__body">
          {loading && items.length === 0 && !showDropzone ? (
            <div className="visbuild-media-modal__empty">Loading…</div>
          ) : null}

          <div className="visbuild-media-modal__grid">
            {showDropzone ? (
              <label
                className="visbuild-media-modal__dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleUploadFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <span>
                  {uploading
                    ? "Uploading…"
                    : "Drag an Image here or click to upload"}
                </span>
              </label>
            ) : null}

            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="visbuild-media-modal__card"
                onClick={() => onSelect(toImageValue(item))}
              >
                <div className="visbuild-media-modal__thumb-wrap">
                  <img src={item.url} alt="" className="visbuild-media-modal__thumb" />
                </div>
                <div className="visbuild-media-modal__meta">
                  <div className="visbuild-media-modal__filename" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className="visbuild-media-modal__details">
                    {formatDimensions(item.width, item.height)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="visbuild-media-modal__footer">
          <MediaPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            disabled={loading}
          />
          <button type="button" className="visbuild-media-modal__cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
