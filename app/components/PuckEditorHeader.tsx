"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Data } from "@puckeditor/core";
import { usePuck } from "@puckeditor/core";

/**
 * 覆盖 Puck 顶栏中间标题：无边框输入，失焦时写入 Puck 并触发 onPersist（保存服务端）。
 * 不渲染 overrides.header 的 `actions`：其与 header 内 MenuBar 中的 Publish 重复。
 */
export function PuckEditorHeader({
  children,
  onPersist,
}: {
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
          [class*="PuckHeader-title"] {
            visibility: hidden !important;
            min-height: 1.35rem;
          }
        `}
      </style>
      <div style={{ position: "relative", width: "100%" }}>
        <Link
          to="/pages"
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
