"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useFetcher,
  useNavigate,
  useRevalidator,
} from "react-router";

import { ScheduleWindowDialog } from "~/components/schedule/ScheduleWindowDialog";
import { ScheduledVersionsDialog } from "~/components/schedule/ScheduledVersionsDialog";
import type { ShopPageSummary } from "~/lib/server/page-service.server";
import type { ShopifyPageRow } from "~/lib/shopify-pages.server";
import { formatScheduleInstant } from "~/lib/schedule-format";
import { formatPublishesIn } from "~/lib/relative-time";
import type { VersionDisplayStatus } from "~/lib/schedule-window";
import { canonicalPagePath, slugFromTitle } from "~/lib/page-path";
import { shopEditPath } from "~/lib/shop-url";
import { HIDE_SHOPIFY_ADMIN_UI } from "~/lib/ui-flags";

const accent = "#7c3aed";
const danger = "#7c3aed";

function statusLabel(s: VersionDisplayStatus): string {
  switch (s) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "scheduled":
      return "Scheduled";
    case "outdated":
      return "Outdated";
    case "unpublished":
      return "Unpublished";
    default:
      return s;
  }
}

function statusDotColor(s: VersionDisplayStatus): string {
  switch (s) {
    case "draft":
      return accent;
    case "published":
      return "#16a34a";
    case "scheduled":
      return "#14b8a6";
    case "outdated":
      return "#dc2626";
    case "unpublished":
      return "#64748b";
    default:
      return "#94a3b8";
  }
}

type ShogunRow = ShopPageSummary & { editedRelative: string };

type FetcherData = {
  ok?: boolean;
  newPath?: string;
  error?: string;
};

function ShogunRowMenu({
  busy,
  isOpen,
  onToggle,
  onClose,
  onPublish,
  onSchedule,
  onUnpublish,
  onDuplicate,
  onDelete,
}: {
  busy: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onPublish: () => void;
  onSchedule: () => void;
  onUnpublish: (() => void) | null;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el?.contains(e.target as Node)) return;
      onCloseRef.current();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "inline-block",
        textAlign: "right",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        disabled={busy}
        aria-label="Page actions"
        aria-expanded={isOpen}
        style={{
          border: "none",
          background: "transparent",
          cursor: busy ? "not-allowed" : "pointer",
          padding: 8,
          borderRadius: 6,
          lineHeight: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#64748b">
          <circle cx="12" cy="6" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="18" r="2" />
        </svg>
      </button>
      {isOpen ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            zIndex: 50,
            minWidth: 200,
            background: "#fff",
            borderRadius: 8,
            boxShadow:
              "0 10px 25px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)",
            border: "1px solid #f1f5f9",
            padding: "6px 0",
            textAlign: "left",
          }}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MenuBtn label="Publish" onClick={onPublish} />
          <MenuBtn label="Schedule" onClick={onSchedule} />
          {onUnpublish ? <MenuBtn label="Unpublish" onClick={onUnpublish} /> : null}
          <MenuBtn label="Duplicate page" onClick={onDuplicate} />
          <MenuBtn label="Delete page" danger onClick={onDelete} />
        </div>
      ) : null}
    </div>
  );
}

export function PagesList({
  shopDomain,
  pagesAction,
  shogunPages,
  shopifyPages,
}: {
  shopDomain: string;
  pagesAction: string;
  shogunPages: ShogunRow[];
  shopifyPages: ShopifyPageRow[];
}) {
  const editHref = (pagePath: string) => shopEditPath(shopDomain, pagePath);
  const [tab, setTab] = useState<"shogun" | "shopify">("shogun");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<ShogunRow | null>(null);
  const [scheduleListOpen, setScheduleListOpen] = useState(false);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [shopifyFilter, setShopifyFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPagePath, setNewPagePath] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shogunSort, setShogunSort] = useState<
    "recent" | "name" | "path"
  >("recent");
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  const busy = fetcher.state !== "idle";
  /** 同一轮 fetcher 成功响应只处理一次，避免 revalidate 触发重渲染后无限请求 pages.data */
  const handledFetcherDataRef = useRef<unknown>(null);

  useEffect(() => {
    if (fetcher.state === "submitting" || fetcher.state === "loading") {
      handledFetcherDataRef.current = null;
    }
  }, [fetcher.state]);

  useEffect(() => {
    const d = fetcher.data as FetcherData | undefined;
    if (fetcher.state !== "idle" || !d) return;
    if (handledFetcherDataRef.current === d) return;
    handledFetcherDataRef.current = d;

    if (d.ok && d.newPath) {
      setCreateOpen(false);
      setCreateError(null);
      navigate(editHref(d.newPath));
      return;
    }

    if (scheduleTarget) {
      if (d.ok === true) {
        setScheduleError(null);
        setScheduleFormOpen(false);
        setScheduleListOpen(false);
        setScheduleTarget(null);
        setEditingVersionId(null);
        revalidate();
        return;
      }
      if (d.ok === false && typeof d.error === "string") {
        setScheduleError(d.error);
        return;
      }
    }

    if (createOpen && d.ok === false && typeof d.error === "string") {
      setCreateError(d.error);
      return;
    }

    if (d.ok === false && typeof d.error === "string") {
      setActionError(d.error);
      return;
    }

    if (d.ok) {
      setActionError(null);
      revalidate();
    }
  }, [fetcher.state, fetcher.data, navigate, revalidate, scheduleTarget, createOpen]);

  const pathKeys = useMemo(() => shogunPages.map((r) => r.path), [shogunPages]);

  const sortedShogunPages = useMemo(() => {
    const rows = [...shogunPages];
    switch (shogunSort) {
      case "name":
        return rows.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        );
      case "path":
        return rows.sort((a, b) =>
          a.displayPath.localeCompare(b.displayPath, undefined, {
            sensitivity: "base",
          })
        );
      case "recent":
      default:
        return rows.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  }, [shogunPages, shogunSort]);

  const allSelected =
    pathKeys.length > 0 && pathKeys.every((p) => selected.has(p));
  const someSelected = selected.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pathKeys));
    }
  };

  const toggleRow = (p: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const submitBulkPublish = () => {
    if (selected.size === 0) return;
    fetcher.submit(
      {
        intent: "bulkPublish",
        paths: JSON.stringify(Array.from(selected)),
      },
      { method: "post", action: pagesAction }
    );
    setSelected(new Set());
  };

  const submitIntent = (intent: string, payload: Record<string, string>) => {
    fetcher.submit({ intent, ...payload }, { method: "post", action: pagesAction });
    setMenuPath(null);
  };

  const visibleSchedules = (row: ShogunRow) =>
    row.schedules.filter(
      (schedule) =>
        schedule.status === "pending" ||
        schedule.status === "live" ||
        schedule.status === "ended" ||
        schedule.status === "failed",
    );

  const openSchedule = (row: ShogunRow) => {
    setScheduleTarget(row);
    setEditingVersionId(null);
    setScheduleError(null);
    setScheduleFormOpen(visibleSchedules(row).length === 0);
    setScheduleListOpen(visibleSchedules(row).length > 0);
    setMenuPath(null);
  };

  const submitSchedule = (
    publishAt: string,
    unpublishAt: string | null,
    versionId?: string,
  ) => {
    if (!scheduleTarget) return;
    setScheduleError(null);
    fetcher.submit(
      {
        intent: "schedule",
        pagePath: scheduleTarget.path,
        publishAt,
        unpublishAt: unpublishAt ?? "",
        versionId: versionId ?? "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
      { method: "post", action: pagesAction },
    );
  };

  const confirmDelete = (pagePath: string) => {
    if (
      !window.confirm(
        `Delete page "${pagePath}"? The Shopify page will also be deleted. This cannot be undone.`,
      )
    ) {
      return;
    }
    submitIntent("delete", { pagePath });
  };

  const confirmUnpublish = (row: ShogunRow) => {
    const future = row.schedules.filter((schedule) => schedule.status === "pending");
    const message =
      future.length > 0
        ? `Hide this page on Shopify?\n\nThese versions are still scheduled to publish:\n${future
            .map(
              (schedule) =>
                `${schedule.title} (Version ${schedule.versionNumber}) · ${formatScheduleInstant(schedule.publishAt)}`,
            )
            .join("\n")}\n\nFuture publishes will still run.`
        : "Hide this page on Shopify?";
    if (!window.confirm(message)) return;
    submitIntent("unpublish", { pagePath: row.path });
  };

  const submitCreate = () => {
    const pagePath = canonicalPagePath(newPagePath);
    if (!pagePath) {
      setCreateError("Invalid URL path");
      return;
    }
    setCreateError(null);
    setNewPagePath(pagePath.slice(1));
    fetcher.submit(
      {
        intent: "createPage",
        pageTitle: newPageTitle,
        pagePath,
      },
      { method: "post", action: pagesAction }
    );
  };

  const filteredShopify = useMemo(() => {
    return shopifyPages.filter(
      (r) => shopifyFilter === "all" || r.filterType === shopifyFilter
    );
  }, [shopifyPages, shopifyFilter]);

  const filterTypes = useMemo(() => {
    const s = new Set(shopifyPages.map((r) => r.filterType));
    return ["all", ...Array.from(s)];
  }, [shopifyPages]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: "#1e293b",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 48px" }}>
        {actionError ? (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "0.875rem",
            }}
          >
            <span>{actionError}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setActionError(null)}
              style={{
                border: "none",
                background: "transparent",
                color: "#b91c1c",
                cursor: "pointer",
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Pages
          </h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!HIDE_SHOPIFY_ADMIN_UI ? (
          <Link
            to="/admin/shops"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${accent}`,
              color: accent,
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            Shopify admin
          </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setCreateOpen(true);
              setCreateError(null);
              setNewPageTitle("");
              setNewPagePath("");
            }}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: accent,
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            New page
          </button>
          </div>
        </div>

        {!HIDE_SHOPIFY_ADMIN_UI ? (
        <div
          style={{
            display: "flex",
            gap: 28,
            borderBottom: "1px solid #e5e7eb",
            marginBottom: 0,
          }}
        >
          {(["shogun", "shopify"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: "12px 4px",
                marginBottom: -1,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: tab === t ? 600 : 500,
                color: tab === t ? accent : "#64748b",
                borderBottom:
                  tab === t ? `2px solid ${accent}` : "2px solid transparent",
              }}
            >
              {t === "shogun" ? "Shogun" : "Shopify"}
            </button>
          ))}
        </div>
        ) : null}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            marginTop: 20,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          {HIDE_SHOPIFY_ADMIN_UI || tab === "shogun" ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={pathKeys.length === 0 || busy}
                    aria-label="Select all pages"
                  />
                  <button
                    type="button"
                    onClick={submitBulkPublish}
                    disabled={selected.size === 0 || busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                      background:
                        selected.size === 0 ? "#f8fafc" : "#fff",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      cursor:
                        selected.size === 0 || busy ? "not-allowed" : "pointer",
                      color: "#334155",
                    }}
                  >
                    Bulk publish pages
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Sort
                  </span>
                  <select
                    value={shogunSort}
                    onChange={(e) =>
                      setShogunSort(e.target.value as "recent" | "name" | "path")
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb",
                      fontSize: "0.875rem",
                      background: "#fff",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    <option value="recent">Recently Edited</option>
                    <option value="name">Page name (A–Z)</option>
                    <option value="path">URL path (A–Z)</option>
                  </select>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #f1f5f9" }}>
                    <th style={{ width: 40, padding: "12px 8px 12px 16px" }} />
                    <th
                      style={{
                        padding: "12px 8px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Page
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Edited
                    </th>
                    <th style={{ width: 48, padding: "12px 16px 12px 8px" }} />
                  </tr>
                </thead>
                <tbody>
                  {sortedShogunPages.map((row) => (
                    <tr
                      key={row.path}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <td style={{ padding: "14px 8px 14px 16px", verticalAlign: "middle" }}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.path)}
                          onChange={() => toggleRow(row.path)}
                          disabled={busy}
                          aria-label={`Select ${row.title}`}
                        />
                      </td>
                      <td style={{ padding: "14px 8px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 6,
                              background: "#f5f3ff",
                              border: "1px solid #ede9fe",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                            aria-hidden
                          >
                            <svg
                              width="22"
                              height="22"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={accent}
                              strokeWidth="1.8"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                            </svg>
                          </div>
                          <div>
                            <Link
                              to={editHref(row.path)}
                              style={{
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                color: "#0f172a",
                                textDecoration: "none",
                              }}
                            >
                              {row.title}
                            </Link>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#94a3b8",
                                marginTop: 4,
                              }}
                            >
                              {row.displayPath}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 8px", verticalAlign: "middle" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: "0.875rem",
                              color:
                                row.status === "outdated" ? "#dc2626" : undefined,
                              fontWeight: row.status === "outdated" ? 600 : undefined,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: statusDotColor(row.status),
                                flexShrink: 0,
                              }}
                            />
                            {statusLabel(row.latestVersion?.status ?? row.status)}
                          </div>
                          {row.latestVersion ? (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "#94a3b8",
                                marginLeft: 16,
                                lineHeight: 1.3,
                              }}
                            >
                              Version {row.latestVersion.versionNumber}
                              {row.latestVersion.status === "scheduled"
                                ? (() => {
                                    const publishAt = row.schedules.find(
                                      (schedule) =>
                                        schedule.versionId === row.latestVersion?.versionId,
                                    )?.publishAt;
                                    return publishAt ? ` · ${formatPublishesIn(publishAt)}` : "";
                                  })()
                                : ""}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "14px 8px",
                          verticalAlign: "middle",
                          fontSize: "0.875rem",
                          color: "#64748b",
                        }}
                      >
                        {row.editedRelative}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px 14px 8px",
                          verticalAlign: "middle",
                          textAlign: "right",
                        }}
                      >
                        <ShogunRowMenu
                          busy={busy}
                          isOpen={menuPath === row.path}
                          onToggle={() =>
                            setMenuPath((m) =>
                              m === row.path ? null : row.path
                            )
                          }
                          onClose={() => setMenuPath(null)}
                          onPublish={() =>
                            submitIntent("publish", { pagePath: row.path })
                          }
                          onSchedule={() => openSchedule(row)}
                          onUnpublish={
                            row.canUnpublish ? () => confirmUnpublish(row) : null
                          }
                          onDuplicate={() =>
                            submitIntent("duplicate", {
                              pagePath: row.path,
                            })
                          }
                          onDelete={() => confirmDelete(row.path)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shogunPages.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                  No editor pages yet.
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  padding: "14px 16px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <select
                  value={shopifyFilter}
                  onChange={(e) => setShopifyFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    fontSize: "0.875rem",
                    background: "#fff",
                  }}
                >
                  {filterTypes.map((f) => (
                    <option key={f} value={f}>
                      {f === "all" ? "All types" : f}
                    </option>
                  ))}
                </select>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Page Name
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 16px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShopify.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              background: "#f5f3ff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {row.isHome ? (
                              <span style={{ color: accent, fontSize: "1.1rem" }}>⌂</span>
                            ) : (
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={accent}
                                strokeWidth="1.8"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                              {row.title}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>
                              {row.handle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px", textAlign: "right", verticalAlign: "middle" }}>
                        {row.imported ? (
                          <span style={{ fontSize: "0.875rem", color: "#16a34a" }}>
                            Imported
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              fetcher.submit(
                                {
                                  intent: "importShopify",
                                  shopifyId: row.id,
                                },
                                { method: "post", action: pagesAction }
                              )
                            }
                            style={{
                              padding: "8px 16px",
                              borderRadius: 6,
                              border: "none",
                              background: "#ede9fe",
                              color: accent,
                              fontWeight: 600,
                              fontSize: "0.875rem",
                              cursor: busy ? "wait" : "pointer",
                            }}
                          >
                            Import page
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredShopify.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                  No Shopify pages in this filter.
                </div>
              ) : null}
            </>
          )}
        </div>

        {busy ? (
          <p style={{ marginTop: 12, fontSize: "0.85rem", color: "#64748b" }}>
            Working…
          </p>
        ) : null}
      </div>

      {createOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 24,
              minWidth: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>
              New page
            </h2>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              Page name
            </label>
            <input
              type="text"
              value={newPageTitle}
              onChange={(e) => {
                const value = e.target.value;
                setNewPageTitle(value);
                setNewPagePath(slugFromTitle(value));
                setCreateError(null);
              }}
              placeholder="My page"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                marginBottom: 16,
                fontSize: "0.95rem",
                boxSizing: "border-box",
              }}
            />
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#64748b",
                marginBottom: 6,
              }}
            >
              URL path
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                marginBottom: 8,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  padding: "10px 12px",
                  background: "#f8fafc",
                  color: "#64748b",
                  borderRight: "1px solid #e5e7eb",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                /
              </span>
              <input
                type="text"
                value={newPagePath}
                onChange={(e) => {
                  setNewPagePath(e.target.value);
                  setCreateError(null);
                }}
                onBlur={() => {
                  const canonical = canonicalPagePath(newPagePath);
                  setNewPagePath(canonical ? canonical.slice(1) : "");
                }}
                placeholder="about"
                style={{
                  flex: 1,
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  outline: "none",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                  fontFamily: "ui-monospace, monospace",
                }}
              />
            </div>
            <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "#94a3b8" }}>
              Generated from the page name. Changing the name replaces this
              path. Saved paths use letters, numbers, and hyphens.
            </p>
            {createError ? (
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "0.85rem",
                  color: "#b91c1c",
                }}
              >
                {createError}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setCreateError(null);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCreate}
                disabled={busy || !canonicalPagePath(newPagePath)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: accent,
                  color: "#fff",
                  fontWeight: 600,
                  cursor:
                    busy || !canonicalPagePath(newPagePath)
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Create & edit
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scheduleListOpen && scheduleTarget ? (
        <ScheduledVersionsDialog
          pageTitle={scheduleTarget.title}
          schedules={scheduleTarget.schedules}
          onClose={() => {
            setScheduleListOpen(false);
            setScheduleTarget(null);
          }}
          onEdit={(versionId) => {
            setEditingVersionId(versionId);
            setScheduleListOpen(false);
            setScheduleFormOpen(true);
          }}
        />
      ) : null}
      {scheduleFormOpen && scheduleTarget ? (
        <ScheduleWindowDialog
          key={editingVersionId ?? "new"}
          schedules={scheduleTarget.schedules}
          excludeVersionId={editingVersionId}
          initialPublishAt={
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.publishAt
          }
          initialUnpublishAt={
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.unpublishAt
          }
          publishLocked={
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.status === "live"
          }
          canClear={["pending", "failed"].includes(
            scheduleTarget.schedules.find((schedule) => schedule.versionId === editingVersionId)
              ?.status ?? "",
          )}
          busy={busy}
          error={scheduleError}
          onClose={() => {
            setScheduleFormOpen(false);
            setScheduleError(null);
            if (editingVersionId) setScheduleListOpen(true);
            else setScheduleTarget(null);
          }}
          onClear={() => {
            if (!editingVersionId) return;
            fetcher.submit(
              {
                intent: "unschedule",
                pagePath: scheduleTarget.path,
                versionId: editingVersionId,
              },
              { method: "post", action: pagesAction },
            );
          }}
          onConfirm={(value) =>
            submitSchedule(value.publishAt, value.unpublishAt, editingVersionId ?? undefined)
          }
        />
      ) : null}
    </div>
  );
}

function MenuBtn({
  label,
  onClick,
  danger: isDanger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "10px 14px",
        border: "none",
        background: "none",
        cursor: "pointer",
        fontSize: "0.875rem",
        textAlign: "left",
        color: isDanger ? danger : "#334155",
        fontWeight: isDanger ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}
