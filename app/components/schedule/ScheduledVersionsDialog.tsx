"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";

import {
  ScheduleSummaryCardButton,
  type ScheduleSummaryCardData,
} from "~/components/schedule/ScheduleSummaryCard";
import { ScheduleMuiProvider } from "~/components/schedule/ScheduleMuiProvider";
import type { ScheduleSummary } from "~/lib/schedule-window";

function toCardData(schedule: ScheduleSummary): ScheduleSummaryCardData {
  return {
    title: schedule.title,
    versionNumber: schedule.versionNumber,
    updatedAt: schedule.updatedAt,
    publishAt: schedule.publishAt,
    unpublishAt: schedule.unpublishAt,
  };
}

export function ScheduledVersionsDialog({
  schedules,
  onEdit,
  onClose,
}: {
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
    <ScheduleMuiProvider>
      <Dialog
        open
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="scheduled-versions-title"
      >
        <DialogTitle id="scheduled-versions-title">Scheduled versions</DialogTitle>
        <DialogContent dividers>
          <List disablePadding>
            {rows.map((schedule) => {
              const errorFooter =
                schedule.status === "failed" || schedule.lastError ? (
                  <>
                    <Divider />
                    <Typography variant="caption" color="error" sx={{ px: 2, py: 1, display: "block" }}>
                      {schedule.status === "failed" ? "Publish failed" : "Last run failed"}
                      {schedule.lastError ? `: ${schedule.lastError}` : ""}
                    </Typography>
                  </>
                ) : null;

              return (
                <ScheduleSummaryCardButton
                  key={schedule.versionId}
                  schedule={toCardData(schedule)}
                  onClick={() => onEdit(schedule.versionId)}
                  footer={errorFooter}
                />
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ScheduleMuiProvider>
  );
}
