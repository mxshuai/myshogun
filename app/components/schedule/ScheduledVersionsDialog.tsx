"use client";

import { formatRelativeTime } from "~/lib/relative-time";
import { formatScheduleLine } from "~/lib/schedule-format";
import type { ScheduleSummary } from "~/lib/schedule-window";

export function ScheduledVersionsDialog({
  pageTitle,
  schedules,
  onEdit,
  onClose,
}: {
  pageTitle: string;
  schedules: ScheduleSummary[];
  onEdit: (versionId: string) => void;
  onClose: () => void;
}) {
  const rows = schedules.filter(
    (schedule) =>
      schedule.status === "pending" ||
      schedule.status === "live" ||
      schedule.status === "ended" ||
      schedule.status === "failed",
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 180,
        padding: 16,
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduled-versions-title"
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: "min(480px, 100%)",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
      >
        <h2 id="scheduled-versions-title" style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>
          Scheduled versions
        </h2>
        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "0.875rem" }}>
          {pageTitle}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((schedule) => {
            const waiting = schedule.status === "pending";
            return (
              <button
                key={schedule.versionId}
                type="button"
                onClick={() => onEdit(schedule.versionId)}
                style={{
                  textAlign: "left",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: "#fff",
                  padding: "10px 12px",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                  {schedule.title} (Version {schedule.versionNumber})
                </div>
                <div style={{ marginTop: 2, color: "#94a3b8", fontSize: "0.85rem" }}>
                  {formatRelativeTime(schedule.updatedAt)}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: "0.85rem",
                    color: waiting ? "#0f172a" : "#94a3b8",
                  }}
                >
                  {formatScheduleLine(schedule.publishAt, schedule.unpublishAt)}
                </div>
                {schedule.status === "failed" || schedule.lastError ? (
                  <div style={{ marginTop: 4, color: "#b91c1c", fontSize: "0.8rem" }}>
                    {schedule.status === "failed" ? "Publish failed" : "Last run failed"}
                    {schedule.lastError ? `: ${schedule.lastError}` : ""}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 14px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
