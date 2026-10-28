"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import type { Data } from "@puckeditor/core";
import { createUsePuck } from "@puckeditor/core";

import { formatRelativeTime } from "~/lib/relative-time";
import { shopPagesPath } from "~/lib/shop-url";
import type { PageVersionSummary } from "~/lib/server/types";

const useEditorPuck = createUsePuck();

/**
 * 覆盖 Puck 顶栏中间标题：无边框输入，失焦时写入 Puck 并触发 onPersist（保存服务端）。
 * 不渲染 overrides.header 的 `actions`：其与 header 内 MenuBar 中的 Publish 重复。
 */
export function VisbuildEditorHeader({
  shopDomain,
  children,
  onPersist,
  versions,
  selectedVersionId,
  onRestore,
}: {
  shopDomain: string;
  children: React.ReactNode;
  onPersist: (data: Data) => void;
  versions: PageVersionSummary[];
  selectedVersionId: string | null;
  onRestore: (versionId: string) => void;
}) {
  const selectedVersion =
    versions.find((version) => version.versionId === selectedVersionId) ?? null;
  const data = useEditorPuck((state) => state.appState.data);
  const dispatch = useEditorPuck((state) => state.dispatch);

  const title =
    (data.root?.props as { title?: string } | undefined)?.title ?? "";

  const [draft, setDraft] = useState(title);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number } | null>(null);
  const [titleWidth, setTitleWidth] = useState(64);
  const titleMeasureRef = useRef<HTMLSpanElement>(null);
  const versionButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    const measured = titleMeasureRef.current?.offsetWidth ?? 64;
    setTitleWidth(Math.min(Math.max(measured + 4, 48), 420));
  }, [draft]);

  useEffect(() => {
    if (!versionsOpen) return;
    const place = () => {
      const rect = versionButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 280;
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      );
      setMenuBox({ top: rect.bottom + 6, left });
    };
    place();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (versionButtonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setVersionsOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [versionsOpen]);

  const commit = () => {
    const merged: Data = {
      ...data,
      root: {
        ...data.root,
        props: {
          ...(data.root?.props as object),
          title: draft,
        },
      },
    };
    dispatch({
      type: "setData",
      data: merged,
    });
    onPersist(merged);
  };

  return (
    <>
      <style>
        {`
          [class*="PuckHeader"] {
            overflow-y: hidden !important;
            min-height: 0 !important;
          }
          /* 保持 Puck 默认 grid：left | middle | right，避免工具栏挤到左侧 */
          [class*="PuckHeader-inner"] {
            display: grid !important;
            align-items: center !important;
            overflow: visible !important;
          }
          [class*="PuckHeader-toggle"] {
            grid-area: left;
          }
          [class*="PuckHeader-title"] {
            grid-area: middle;
            visibility: hidden !important;
            min-height: 1.35rem;
          }
          [class*="PuckHeader-tools"] {
            grid-area: right;
            justify-self: end;
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            overflow: visible !important;
          }
          [class*="MenuBar-inner"] {
            flex-wrap: nowrap !important;
            justify-content: flex-end !important;
          }
        `}
      </style>
      <div style={{ position: "relative", width: "100%" }}>
        <Link
          to={shopPagesPath(shopDomain)}
          title="Back to pages"
          aria-label="Back to pages"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 7,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            color: "#374151",
            textDecoration: "none",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        {children}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 6,
            width: "min(520px, calc(100% - 200px))",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              maxWidth: "100%",
              pointerEvents: "auto",
              gap: 2,
            }}
          >
            <span
              ref={titleMeasureRef}
              aria-hidden
              style={{
                position: "absolute",
                visibility: "hidden",
                whiteSpace: "pre",
                fontWeight: 700,
                fontSize: "1rem",
                fontFamily: "inherit",
              }}
            >
              {draft || "Untitled"}
            </span>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Untitled"
              aria-label="Page title"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontWeight: 700,
                fontSize: "1rem",
                textAlign: "center",
                width: titleWidth,
                color: "#111827",
                padding: 0,
              }}
            />
            {selectedVersion ? (
              <span
                style={{
                  flexShrink: 0,
                  marginLeft: 4,
                  fontSize: "1rem",
                  fontWeight: 400,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                (Version {selectedVersion.versionNumber})
              </span>
            ) : null}
            <button
              ref={versionButtonRef}
              type="button"
              aria-label="Page versions"
              aria-expanded={versionsOpen}
              title="Page versions"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setVersionsOpen((open) => !open)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                border: "none",
                borderRadius: 6,
                background: versionsOpen ? "#f3f4f6" : "transparent",
                color: "#374151",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        {versionsOpen && menuBox
          ? createPortal(
              <div
                ref={menuRef}
                role="menu"
                style={{
                  position: "fixed",
                  top: menuBox.top,
                  left: menuBox.left,
                  width: 280,
                  maxHeight: 320,
                  overflowX: "hidden",
                  overflowY: "auto",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
                  zIndex: 40,
                  padding: 4,
                }}
              >
                {versions.length === 0 ? (
                  <div style={{ padding: "10px 12px", color: "#94a3b8", fontSize: "0.85rem" }}>
                    No saved versions yet.
                  </div>
                ) : (
                  versions.map((version) => {
                    const selected = version.versionId === selectedVersionId;
                    return (
                    <button
                      key={version.versionId}
                      type="button"
                      role="menuitem"
                      aria-current={selected ? "true" : undefined}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setVersionsOpen(false);
                        onRestore(version.versionId);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        boxSizing: "border-box",
                        textAlign: "left",
                        border: "none",
                        background: selected ? "#f3f0ff" : "transparent",
                        borderRadius: 6,
                        padding: "8px 10px",
                        cursor: "pointer",
                        overflow: "hidden",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = selected ? "#ede9fe" : "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = selected
                          ? "#f3f0ff"
                          : "transparent";
                      }}
                    >
                      <div
                        title={version.title}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 6,
                          minWidth: 0,
                          maxWidth: "100%",
                          fontSize: "0.9rem",
                          lineHeight: 1.3,
                          color: "#0f172a",
                        }}
                      >
                        <span
                          style={{
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                          }}
                        >
                          {version.title}
                        </span>
                        <span style={{ flexShrink: 0, fontWeight: 400 }}>
                          (Version {version.versionNumber})
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: "0.8rem",
                          color: "#94a3b8",
                          lineHeight: 1.3,
                        }}
                      >
                        {formatRelativeTime(version.createdAt)}
                      </div>
                    </button>
                    );
                  })
                )}
              </div>,
              document.body,
            )
          : null}
      </div>
    </>
  );
}
