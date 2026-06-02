"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

const accent = "#7c3aed";

export type SplitDropdownItem = {
  key: string;
  label: string;
  icon?: "calendar";
  onClick: () => void;
};

/**
 * Element Plus–style split button: primary action + dropdown caret with popper menu.
 */
export function SplitActionDropdown({
  label,
  busy,
  onPrimary,
  items,
}: {
  label: string;
  busy: boolean;
  onPrimary: () => void;
  items: SplitDropdownItem[];
}) {
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 4,
      left: rect.right,
      minWidth: Math.max(rect.width, 200),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      const menu = document.getElementById(menuId);
      if (menu?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, menuId]);

  const menu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            id={menuId}
            role="menu"
            style={{
              position: "fixed",
              top: menuStyle.top,
              left: menuStyle.left,
              transform: "translateX(-100%)",
              minWidth: menuStyle.minWidth,
              zIndex: 10000,
              background: "#fff",
              borderRadius: 8,
              boxShadow:
                "0 10px 25px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.08)",
              border: "1px solid #f1f5f9",
              padding: "6px 0",
            }}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  textAlign: "left",
                  color: "#334155",
                }}
              >
                {item.icon === "calendar" ? (
                  <CalendarIcon />
                ) : null}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={wrapRef}
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        flexShrink: 0,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        height: 36,
      }}
    >
      <button
        type="button"
        disabled={busy}
        onClick={onPrimary}
        style={{
          padding: "0 16px",
          border: "none",
          background: accent,
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: busy ? "wait" : "pointer",
          lineHeight: 1,
        }}
      >
        {label}
      </button>
      <button
        type="button"
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "0 10px",
          border: "none",
          borderLeft: "1px solid rgba(255,255,255,0.25)",
          background: accent,
          color: "#fff",
          cursor: busy ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>
      {menu}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export const editorActionButtonStyle: CSSProperties = {
  padding: "0 16px",
  height: 36,
  borderRadius: 8,
  border: "none",
  background: accent,
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.875rem",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  lineHeight: 1,
  flexShrink: 0,
};
