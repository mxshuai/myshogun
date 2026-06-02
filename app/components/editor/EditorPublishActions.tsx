"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";

const accent = "#7c3aed";

export type EditorPageMeta = {
  pageId: string;
  status: "draft" | "dirty" | "published" | "scheduled";
  scheduledPublishAt: string | null;
  pendingJobId: string | null;
};

export type EditorActionResult = {
  ok?: boolean;
  error?: string;
  path?: string;
  pageId?: string;
  status?: EditorPageMeta["status"];
  jobId?: string;
  runAt?: string;
};

type PublishUiMode = "save" | "publish-split" | "scheduled-split" | "published-badge";

function dataEquals(a: Data, b: Data): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveMode(
  meta: EditorPageMeta | null,
  isDirty: boolean,
): PublishUiMode {
  if (meta?.status === "scheduled") return "scheduled-split";
  if (meta?.status === "published") return "published-badge";
  if (isDirty) return "save";
  return "publish-split";
}

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SplitButton({
  label,
  busy,
  onPrimary,
  menuItems,
}: {
  label: string;
  busy: boolean;
  onPrimary: () => void;
  menuItems: { label: string; icon?: "calendar"; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
      <div
        style={{
          display: "inline-flex",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        <button
          type="button"
          disabled={busy}
          onClick={onPrimary}
          style={{
            padding: "8px 18px",
            border: "none",
            background: accent,
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {label}
        </button>
        <button
          type="button"
          disabled={busy}
          aria-expanded={open}
          aria-label="More actions"
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: "8px 10px",
            border: "none",
            borderLeft: "1px solid rgba(255,255,255,0.25)",
            background: accent,
            color: "#fff",
            cursor: busy ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        </button>
      </div>
      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 6,
            minWidth: 200,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            border: "1px solid #f1f5f9",
            padding: "6px 0",
            zIndex: 50,
          }}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              ) : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EditorPublishActions({
  pageMeta,
  editorData,
  savedData,
  busy,
  actionError,
  onSave,
  onPublish,
  onSchedule,
  onReschedule,
}: {
  pageMeta: EditorPageMeta | null;
  editorData: Data;
  savedData: Data;
  busy: boolean;
  actionError: string | null;
  onSave: () => void;
  onPublish: () => void;
  onSchedule: (runAtIso: string, timezone: string) => void;
  onReschedule: (runAtIso: string, timezone: string) => void;
}) {
  const isDirty = !dataEquals(editorData, savedData);
  const mode = resolveMode(pageMeta, isDirty);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);

  const openScheduleDialog = useCallback(
    (forReschedule: boolean) => {
      setRescheduleMode(forReschedule);
      setScheduleAt(
        forReschedule && pageMeta?.scheduledPublishAt
          ? isoToDatetimeLocalValue(pageMeta.scheduledPublishAt)
          : "",
      );
      setScheduleError(null);
      setScheduleOpen(true);
    },
    [pageMeta?.scheduledPublishAt],
  );

  const confirmSchedule = () => {
    if (!scheduleAt.trim()) {
      setScheduleError("Choose date and time");
      return;
    }
    const local = new Date(scheduleAt);
    if (Number.isNaN(local.getTime())) {
      setScheduleError("Invalid date and time");
      return;
    }
    if (local.getTime() < Date.now() + 60_000) {
      setScheduleError("Schedule must be at least 1 minute in the future");
      return;
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (rescheduleMode) {
      onReschedule(local.toISOString(), tz);
    } else {
      onSchedule(local.toISOString(), tz);
    }
    setScheduleOpen(false);
  };

  useEffect(() => {
    if (pageMeta?.status !== "scheduled" || !isDirty || busy) return;
    const t = window.setTimeout(() => {
      onSave();
    }, 800);
    return () => window.clearTimeout(t);
  }, [pageMeta?.status, isDirty, busy, editorData, onSave]);

  useEffect(() => {
    if (actionError) setScheduleError(actionError);
  }, [actionError]);

  if (mode === "published-badge") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderRadius: 8,
          background: "#ede9fe",
          color: "#64748b",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: "not-allowed",
          userSelect: "none",
        }}
        title="Already published. Publish updates from the pages list."
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#14b8a6",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
          }}
          aria-hidden
        >
          ✓
        </span>
        Published
      </div>
    );
  }

  if (mode === "save") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        style={{
          padding: "8px 18px",
          borderRadius: 8,
          border: "none",
          background: accent,
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: busy ? "wait" : "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        Save
      </button>
    );
  }

  if (mode === "scheduled-split") {
    return (
      <>
        <SplitButton
          label="Scheduled"
          busy={busy}
          onPrimary={() => openScheduleDialog(true)}
          menuItems={[
            {
              label: "Edit scheduling",
              icon: "calendar",
              onClick: () => openScheduleDialog(true),
            },
          ]}
        />
        {scheduleOpen ? (
          <ScheduleDialog
            title="Edit scheduling"
            scheduleAt={scheduleAt}
            scheduleError={scheduleError}
            busy={busy}
            onChange={setScheduleAt}
            onClose={() => setScheduleOpen(false)}
            onConfirm={confirmSchedule}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <SplitButton
        label="Publish"
        busy={busy}
        onPrimary={onPublish}
        menuItems={[
          {
            label: "Schedule publish",
            icon: "calendar",
            onClick: () => openScheduleDialog(false),
          },
        ]}
      />
      {scheduleOpen ? (
        <ScheduleDialog
          title="Schedule publish"
          scheduleAt={scheduleAt}
          scheduleError={scheduleError}
          busy={busy}
          onChange={setScheduleAt}
          onClose={() => setScheduleOpen(false)}
          onConfirm={confirmSchedule}
        />
      ) : null}
    </>
  );
}

function ScheduleDialog({
  title,
  scheduleAt,
  scheduleError,
  busy,
  onChange,
  onClose,
  onConfirm,
}: {
  title: string;
  scheduleAt: string;
  scheduleError: string | null;
  busy: boolean;
  onChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 24,
          minWidth: 320,
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem" }}>{title}</h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "#64748b" }}>
          Local time. Must be at least 1 minute in the future.
        </p>
        {scheduleError ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.875rem" }}>
            {scheduleError}
          </p>
        ) : null}
        <input
          type="datetime-local"
          value={scheduleAt}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 14px" }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!scheduleAt.trim() || busy}
            onClick={onConfirm}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: accent,
              color: "#fff",
              fontWeight: 600,
              cursor: !scheduleAt.trim() || busy ? "not-allowed" : "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
