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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function nowDatetimeLocalValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function isoToDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
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
  onUnschedule,
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
  onUnschedule: () => void;
}) {
  const isDirty = !dataEquals(editorData, savedData);
  const mode = resolveMode(pageMeta, isDirty);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [publishOn, setPublishOn] = useState(true);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);

  const openScheduleDialog = useCallback(
    (forReschedule: boolean) => {
      setRescheduleMode(forReschedule);
      const hasSchedule =
        forReschedule &&
        Boolean(pageMeta?.scheduledPublishAt || pageMeta?.status === "scheduled");
      if (hasSchedule) {
        setPublishOn(true);
        setScheduleAt(
          pageMeta?.scheduledPublishAt
            ? isoToDatetimeLocalValue(pageMeta.scheduledPublishAt)
            : nowDatetimeLocalValue(),
        );
      } else {
        setPublishOn(true);
        setScheduleAt(nowDatetimeLocalValue());
      }
      setScheduleError(null);
      setScheduleOpen(true);
    },
    [pageMeta?.scheduledPublishAt, pageMeta?.status],
  );

  const handlePublishOnChange = (checked: boolean) => {
    setPublishOn(checked);
    if (checked) {
      setScheduleAt((prev) => prev.trim() || nowDatetimeLocalValue());
    } else {
      setScheduleAt("");
    }
    setScheduleError(null);
  };

  const confirmSchedule = () => {
    if (!publishOn) {
      if (pageMeta?.status === "scheduled" || pageMeta?.pendingJobId) {
        onUnschedule();
      }
      setScheduleOpen(false);
      setScheduleError(null);
      return;
    }

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
    setScheduleError(null);
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

  const scheduleDialog = scheduleOpen ? (
    <ScheduleDialog
      title={rescheduleMode ? "Edit scheduling" : "Schedule publish"}
      publishOn={publishOn}
      scheduleAt={scheduleAt}
      scheduleError={scheduleError}
      busy={busy}
      onPublishOnChange={handlePublishOnChange}
      onChange={setScheduleAt}
      onClose={() => {
        setScheduleOpen(false);
        setScheduleError(null);
      }}
      onConfirm={confirmSchedule}
    />
  ) : null;

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
        {scheduleDialog}
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
      {scheduleDialog}
    </>
  );
}

const accent = "#7c3aed";

function ScheduleDialog({
  title,
  publishOn,
  scheduleAt,
  scheduleError,
  busy,
  onPublishOnChange,
  onChange,
  onClose,
  onConfirm,
}: {
  title: string;
  publishOn: boolean;
  scheduleAt: string;
  scheduleError: string | null;
  busy: boolean;
  onPublishOnChange: (checked: boolean) => void;
  onChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmDisabled = busy || (publishOn && !scheduleAt.trim());

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
        <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem" }}>{title}</h2>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={publishOn}
            onChange={(e) => onPublishOnChange(e.target.checked)}
          />
          Publish page on…
        </label>
        <p style={{ margin: "0 0 8px", fontSize: "0.875rem", color: "#64748b" }}>
          Your page will be published on the day and time you specify.
        </p>
        {scheduleError ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.875rem" }}>
            {scheduleError}
          </p>
        ) : null}
        <input
          type="datetime-local"
          value={scheduleAt}
          disabled={!publishOn}
          required={publishOn}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            marginBottom: 16,
            boxSizing: "border-box",
            background: publishOn ? "#fff" : "#f8fafc",
            color: publishOn ? "#111827" : "#94a3b8",
            cursor: publishOn ? "text" : "not-allowed",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 14px" }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: accent,
              color: "#fff",
              fontWeight: 600,
              cursor: confirmDisabled ? "not-allowed" : "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
