"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Data } from "@puckeditor/core";
import { usePuck } from "@puckeditor/core";

import { shopPagesPath } from "~/lib/shop-url";

/**
 * 覆盖 Puck 顶栏中间标题：无边框输入，失焦时写入 Puck 并触发 onPersist（保存服务端）。
 * 不渲染 overrides.header 的 `actions`：其与 header 内 MenuBar 中的 Publish 重复。
 */
export function VisbuildEditorHeader({
  shopDomain,
  children,
  onPersist,
}: {
  shopDomain: string;
  children: React.ReactNode;
  onPersist: (data: Data) => void;
}) {
  const { appState, dispatch } = usePuck();

  const title =
    (appState.data.root?.props as { title?: string } | undefined)?.title ?? "";

  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  const commit = () => {
    const merged: Data = {
      ...appState.data,
      root: {
        ...appState.data.root,
        props: {
          ...(appState.data.root?.props as object),
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
            pointerEvents: "none",
          }}
        >
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
              pointerEvents: "auto",
              border: "none",
              outline: "none",
              background: "transparent",
              fontWeight: 700,
              fontSize: "1rem",
              textAlign: "center",
              width: "100%",
              color: "#111827",
            }}
          />
        </div>
      </div>
    </>
  );
}
