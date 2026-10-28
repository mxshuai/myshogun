"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { DateTimeField } from "~/components/ui/DateTimeField";
import {
  blockedRanges,
  earliestPublishAt,
  findConflict,
  truncateToMinute,
  validateLiveUnpublish,
  validateWindow,
  type OccupiedRange,
  type ScheduleLike,
} from "~/lib/schedule-window";

const accent = "#7c3aed";

export type ScheduleWindowValue = {
  publishAt: string;
  unpublishAt: string | null;
};

export function ScheduleWindowDialog({
  title = "Schedule publish",
  schedules,
  excludeVersionId,
  initialPublishAt,
  initialUnpublishAt,
  publishLocked,
  canClear,
  busy,
  error,
  onClose,
  onConfirm,
  onClear,
}: {
  title?: string;
  schedules: ScheduleLike[];
  excludeVersionId?: string | null;
  initialPublishAt?: string | null;
  initialUnpublishAt?: string | null;
  publishLocked?: boolean;
  canClear?: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (value: ScheduleWindowValue) => void;
  onClear: () => void;
}) {
  const [publishOn, setPublishOn] = useState(true);
  const [unpublishOn, setUnpublishOn] = useState(Boolean(initialUnpublishAt));
  const [publishAt, setPublishAt] = useState(() =>
    initialPublishAt ? new Date(initialPublishAt) : earliestPublishAt(),
  );
  const [unpublishAt, setUnpublishAt] = useState(() => {
    if (initialUnpublishAt) return new Date(initialUnpublishAt);
    const start = initialPublishAt ? new Date(initialPublishAt) : earliestPublishAt();
    return new Date(truncateToMinute(start).getTime() + 60 * 60_000);
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const ranges = useMemo(
    () => blockedRanges(schedules, excludeVersionId),
    [schedules, excludeVersionId],
  );
  const unpublishRanges = useMemo<OccupiedRange[]>(() => {
    const floor = truncateToMinute(publishAt).getTime() + 60_000;
    return [{ versionId: "before-publish", start: 0, end: floor - 60_000 }, ...ranges];
  }, [publishAt, ranges]);
  const message = localError || error;

  const confirm = () => {
    if (!publishOn) {
      if (canClear) onClear();
      else onClose();
      return;
    }
    const unpublish = unpublishOn ? unpublishAt : null;
    const invalid = publishLocked
      ? validateLiveUnpublish({ publishAt, unpublishAt: unpublish })
      : validateWindow({ publishAt, unpublishAt: unpublish });
    if (invalid) {
      setLocalError(invalid);
      return;
    }
    if (findConflict({ publishAt, unpublishAt: unpublish }, ranges)) {
      setLocalError("That time overlaps another version on this page.");
      return;
    }
    onConfirm({
      publishAt: truncateToMinute(publishAt).toISOString(),
      unpublishAt: unpublish ? truncateToMinute(unpublish).toISOString() : null,
    });
  };

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
        padding: 16,
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-window-title"
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: "min(760px, 100%)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
      >
        <h2 id="schedule-window-title" style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
          {title}
        </h2>
        <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "0.9rem" }}>
          Your page will be published on the day and time you specify. You can also
          choose to unpublish the page on a specified day and time.
        </p>
        {message ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.875rem" }}>
            {message}
          </p>
        ) : null}
        <style>{`
          .schedule-window-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          @media (max-width: 720px) {
            .schedule-window-columns { grid-template-columns: 1fr; }
          }
        `}</style>
        <div className="schedule-window-columns">
          <section style={columnStyle}>
            <Check
              checked={publishOn}
              disabled={Boolean(publishLocked)}
              label="Publish page on"
              onChange={(checked) => {
                setPublishOn(checked);
                if (!checked) setUnpublishOn(false);
                setLocalError(null);
              }}
            />
            <DateTimeField
              value={publishAt}
              min={earliestPublishAt()}
              ranges={ranges}
              disabled={!publishOn || Boolean(publishLocked)}
              onChange={(next) => {
                setPublishAt(next);
                if (unpublishAt.getTime() < next.getTime() + 60_000) {
                  setUnpublishAt(new Date(next.getTime() + 60 * 60_000));
                }
                setLocalError(null);
              }}
            />
          </section>
          <section style={{ ...columnStyle, opacity: publishOn ? 1 : 0.5 }}>
            <Check
              checked={unpublishOn && publishOn}
              disabled={!publishOn}
              label="Unpublish on…"
              onChange={(checked) => {
                setUnpublishOn(checked);
                setLocalError(null);
              }}
            />
            <DateTimeField
              value={unpublishAt}
              min={new Date(truncateToMinute(publishAt).getTime() + 60_000)}
              ranges={unpublishRanges}
              disabled={!publishOn || !unpublishOn}
              onChange={(next) => {
                setUnpublishAt(next);
                setLocalError(null);
              }}
            />
          </section>
        </div>
        <p style={{ margin: "12px 0 0", color: "#94a3b8", fontSize: "0.8rem" }}>
          Times use your local timezone. Leave unpublish off to keep the version published.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} style={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            style={{
              ...primaryButton,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function Check({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

const columnStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: 12,
  background: "#f8fafc",
};

const secondaryButton: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  background: accent,
  color: "#fff",
  fontWeight: 600,
};
