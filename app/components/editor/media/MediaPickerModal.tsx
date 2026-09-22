"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  fetchShogunMedia,
  fetchShopifyFiles,
  uploadToShogun,
} from "./media-api";
import type { ImageValue, MediaListItem } from "./types";
import {
  formatDimensions,
  formatFileSize,
} from "./types";
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
  const [shopifyItems, setShopifyItems] = useState<MediaListItem[]>([]);
  const [shopifyCursor, setShopifyCursor] = useState<string | null>(null);
  const [shopifyHasMore, setShopifyHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const searchRef = useRef(search);
  const requestIdRef = useRef(0);
  searchRef.current = search;

  const loadShogun = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const assets = await fetchShogunMedia(shopDomain);
      if (requestId !== requestIdRef.current) return;
      setShogunItems(assets);
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [shopDomain]);

  const loadShopify = useCallback(
    async (opts?: { query?: string; after?: string; append?: boolean }) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchShopifyFiles(shopDomain, {
          query: opts?.query,
          after: opts?.after,
        });
        if (requestId !== requestIdRef.current) return;
        setShopifyItems((prev) =>
          opts?.append ? [...prev, ...result.files] : result.files,
        );
        setShopifyCursor(result.endCursor);
        setShopifyHasMore(result.hasNextPage);
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
    if (tab === "shogun") {
      void loadShogun();
      return;
    }
    void loadShopify({ query: searchRef.current.trim() || undefined });
  }, [tab, loadShogun, loadShopify]);

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
      await loadShogun();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (tab !== "shopify") return;
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      void loadShopify({ query: value || undefined });
    }, 300);
  };

  const items = tab === "shogun" ? shogunItems : shopifyItems;

  return createPortal(
    <div className="visbuild-media-modal__backdrop" onClick={onClose}>
      <div
        className="visbuild-media-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Select image"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="visbuild-media-modal__header">
          <div className="visbuild-media-modal__tabs">
            <button
              type="button"
              className={`visbuild-media-modal__tab${tab === "shogun" ? " is-active" : ""}`}
              onClick={() => setTab("shogun")}
            >
              Shogun
            </button>
            <button
              type="button"
              className={`visbuild-media-modal__tab${tab === "shopify" ? " is-active" : ""}`}
              onClick={() => setTab("shopify")}
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
              + Upload
            </button>
          ) : (
            <div className="visbuild-media-modal__search-wrap">
              <input
                type="search"
                className="visbuild-media-modal__search"
                placeholder="Search Shopify"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="visbuild-media-modal__toolbar">
          {tab === "shogun" ? (
            <input
              type="search"
              className="visbuild-media-modal__search"
              placeholder="Search media library"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          ) : null}
        </div>

        {error ? (
          <div className="visbuild-media-modal__error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="visbuild-media-modal__body">
          {loading && items.length === 0 ? (
            <div className="visbuild-media-modal__empty">Loading…</div>
          ) : null}

          <div className="visbuild-media-modal__grid">
            {tab === "shogun" ? (
              <label
                className="visbuild-media-modal__dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleUploadFiles(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => void handleUploadFiles(e.target.files)}
                />
                <span>
                  {uploading
                    ? "Uploading…"
                    : "Drag an Image here or click to upload"}
                </span>
              </label>
            ) : null}

            {items
              .filter((item) => {
                if (!search.trim() || tab === "shopify") return true;
                return item.filename.toLowerCase().includes(search.toLowerCase());
              })
              .map((item) => (
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
                      {formatFileSize(item.size)}
                      {formatFileSize(item.size) &&
                      formatDimensions(item.width, item.height)
                        ? " · "
                        : ""}
                      {formatDimensions(item.width, item.height)}
                    </div>
                  </div>
                </button>
              ))}
          </div>

          {tab === "shopify" && shopifyHasMore ? (
            <div className="visbuild-media-modal__footer-actions">
              <button
                type="button"
                className="visbuild-media-modal__load-more"
                disabled={loading || !shopifyCursor}
                onClick={() =>
                  void loadShopify({
                    query: search || undefined,
                    after: shopifyCursor ?? undefined,
                    append: true,
                  })
                }
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>

        <div className="visbuild-media-modal__footer">
          <button type="button" className="visbuild-media-modal__cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
