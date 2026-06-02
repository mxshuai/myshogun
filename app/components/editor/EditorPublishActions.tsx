"use client";

import { useCallback, useEffect, useState } from "react";
import type { Data } from "@puckeditor/core";

import {
  editorActionButtonStyle,
  SplitActionDropdown,
} from "~/components/ui/SplitActionDropdown";

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
  if (isDirty) return "save";
  if (meta?.status === "published") return "published-badge";
  return "publish-split";
}

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
          height: 36,
          padding: "0 16px",
          borderRadius: 8,
          background: "#ede9fe",
          color: "#64748b",
          fontWeight: 600,
          fontSize: "0.875rem",
          cursor: "not-allowed",
          userSelect: "none",
          flexShrink: 0,
        }}
        title="Already published"
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
          ...editorActionButtonStyle,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        Save
      </button>
    );
  }

  if (mode === "scheduled-split") {
    return (
      <>
        <SplitActionDropdown
          label="Scheduled"
          busy={busy}
          onPrimary={() => openScheduleDialog(true)}
          items={[
            {
              key: "edit-scheduling",
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
      <SplitActionDropdown
        label="Publish"
        busy={busy}
        onPrimary={onPublish}
        items={[
          {
            key: "schedule-publish",
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

const accent = "#7c3aed";

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
