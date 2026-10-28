"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import { ScheduleMuiProvider } from "~/components/schedule/ScheduleMuiProvider";
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {pageTitle}
          </Typography>
          <List disablePadding>
            {rows.map((schedule) => {
              const waiting = schedule.status === "pending";
              const secondary = (
                <>
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ display: "block" }}>
                    {formatRelativeTime(schedule.updatedAt)}
                  </Typography>
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{
                      display: "block",
                      color: waiting ? "text.primary" : "text.secondary",
                    }}
                  >
                    {formatScheduleLine(schedule.publishAt, schedule.unpublishAt)}
                  </Typography>
                  {schedule.status === "failed" || schedule.lastError ? (
                    <Typography
                      component="span"
                      variant="caption"
                      color="error"
                      sx={{ display: "block" }}
                    >
                      {schedule.status === "failed" ? "Publish failed" : "Last run failed"}
                      {schedule.lastError ? `: ${schedule.lastError}` : ""}
                    </Typography>
                  ) : null}
                </>
              );
              return (
                <ListItemButton
                  key={schedule.versionId}
                  onClick={() => onEdit(schedule.versionId)}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={`${schedule.title} (Version ${schedule.versionNumber})`}
                    secondary={secondary}
                    slotProps={{
                      primary: { sx: { fontWeight: 600 } },
                    }}
                  />
                </ListItemButton>
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
