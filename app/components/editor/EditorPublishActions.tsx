"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";

import {
  editorActionButtonStyle,
  SplitActionDropdown,
} from "~/components/ui/SplitActionDropdown";
import type { ScheduleSummary } from "~/lib/schedule-window";
import type { PageStatus, PageVersionSummary } from "~/lib/server/types";

const ScheduleWindowDialog = lazy(() =>
  import("~/components/schedule/ScheduleWindowDialog").then((m) => ({
    default: m.ScheduleWindowDialog,
  })),
);

export type EditorPageMeta = {
  pageId: string;
  status: PageStatus;
  scheduledPublishAt: string | null;
  liveVersionId: string | null;
  evergreenVersionId: string | null;
  schedules: ScheduleSummary[];
};

export type EditorActionResult = {
  ok?: boolean;
  error?: string;
  intent?: string;
  data?: Data;
  path?: string;
  pageId?: string;
  versionId?: string;
  status?: EditorPageMeta["status"];
  pageMeta?: EditorPageMeta | null;
  versions?: PageVersionSummary[];
};

type PublishUiMode =
  | "save"
  | "publish-split"
  | "scheduled-split"
  | "published-split"
  | "published-badge";

function dataEquals(a: Data, b: Data): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function resolveMode(
  meta: EditorPageMeta | null,
  schedule: ScheduleSummary | null,
  selectedVersionId: string | null,
  isDirty: boolean,
): PublishUiMode {
  if (isDirty) return "save";
  if (schedule?.status === "pending" || schedule?.status === "failed") {
    return "scheduled-split";
  }
  if (selectedVersionId && meta?.liveVersionId === selectedVersionId) {
    return schedule?.status === "live" && schedule.unpublishAt
      ? "published-split"
      : "published-badge";
  }
  return "publish-split";
}

export function EditorPublishActions({
  pageMeta,
  selectedVersionId,
  editorData,
  savedData,
  busy,
  actionError,
  lastResult,
  onSave,
  onPublish,
  onSchedule,
  onUnschedule,
}: {
  pageMeta: EditorPageMeta | null;
  /** Version loaded in the editor; scheduling always targets it. */
  selectedVersionId: string | null;
  editorData: Data;
  savedData: Data;
  busy: boolean;
  actionError: string | null;
  /** Latest settled action response; undefined while a request is in flight. */
  lastResult: EditorActionResult | undefined;
  onSave: () => void;
  onPublish: () => void;
  onSchedule: (
    publishAt: string,
    unpublishAt: string | null,
    timezone: string,
    versionId?: string,
  ) => void;
  onUnschedule: (versionId: string) => void;
}) {
  const isDirty = !dataEquals(editorData, savedData);
  const schedules = pageMeta?.schedules ?? [];
  const schedule =
    schedules.find((item) => item.versionId === selectedVersionId) ?? null;
  const mode = resolveMode(pageMeta, schedule, selectedVersionId, isDirty);
  const editable =
    schedule && schedule.status !== "ended" && schedule.status !== "cancelled"
      ? schedule
      : null;
  const [formOpen, setFormOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const awaitingRef = useRef<"sent" | "inflight" | null>(null);

  const openForm = () => {
    setScheduleError(null);
    setFormOpen(true);
  };

  useEffect(() => {
    setFormOpen(false);
    awaitingRef.current = null;
  }, [selectedVersionId]);

  useEffect(() => {
    if (actionError) setScheduleError(actionError);
  }, [actionError]);

  useEffect(() => {
    if (!awaitingRef.current) return;
    if (busy) {
      awaitingRef.current = "inflight";
      return;
    }
    if (awaitingRef.current !== "inflight" || !lastResult) return;
    awaitingRef.current = null;
    if (lastResult.ok === false) {
      setScheduleError(lastResult.error ?? "Request failed");
      return;
    }
    setFormOpen(false);
    setScheduleError(null);
  }, [busy, lastResult]);

  const dialog = formOpen ? (
    <Suspense fallback={null}>
      <ScheduleWindowDialog
      key={`${selectedVersionId ?? "new"}:${editable?.updatedAt ?? ""}`}
      title={editable ? "Edit scheduling" : "Schedule publish"}
      schedules={schedules}
      excludeVersionId={selectedVersionId}
      initialPublishAt={editable?.publishAt}
      initialUnpublishAt={editable?.unpublishAt}
      publishLocked={editable?.status === "live"}
      canClear={editable?.status === "pending" || editable?.status === "failed"}
      busy={busy}
      error={scheduleError}
      onClose={() => {
        awaitingRef.current = null;
        setFormOpen(false);
        setScheduleError(null);
      }}
      onClear={() => {
        if (!selectedVersionId) return;
        awaitingRef.current = "sent";
        setScheduleError(null);
        onUnschedule(selectedVersionId);
      }}
      onConfirm={(value) => {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        awaitingRef.current = "sent";
        setScheduleError(null);
        onSchedule(
          value.publishAt,
          value.unpublishAt,
          timezone,
          selectedVersionId ?? undefined,
        );
      }}
    />
    </Suspense>
  ) : null;

  if (mode === "save") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        style={{ ...editorActionButtonStyle, cursor: busy ? "wait" : "pointer" }}
      >
        Save
      </button>
    );
  }

  if (mode === "published-badge") {
    return <PublishedBadge />;
  }

  if (mode === "scheduled-split" || mode === "published-split") {
    const scheduled = mode === "scheduled-split";
    return (
      <>
        <SplitActionDropdown
          label={scheduled ? "Scheduled" : "Published"}
          busy={busy}
          primaryDisabled={!scheduled}
          onPrimary={scheduled ? openForm : () => {}}
          items={[
            {
              key: "edit-scheduling",
              label: "Edit scheduling",
              icon: "calendar",
              onClick: openForm,
            },
          ]}
        />
        {dialog}
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
            onClick: openForm,
          },
        ]}
      />
      {dialog}
    </>
  );
}

function PublishedBadge() {
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
