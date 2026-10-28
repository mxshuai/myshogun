"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";

import { ScheduleMuiProvider } from "~/components/schedule/ScheduleMuiProvider";
import { formatScheduleInstant } from "~/lib/schedule-format";

export type PageDeleteConfirm = {
  kind: "delete";
  pagePath: string;
};

export type PageUnpublishConfirm = {
  kind: "unpublish";
  pagePath: string;
  pendingSchedules: Array<{
    title: string;
    versionNumber: number;
    publishAt: string;
  }>;
};

export type PageActionConfirmState = PageDeleteConfirm | PageUnpublishConfirm;

export function PageActionConfirmDialog({
  pending,
  busy,
  onClose,
  onConfirm,
}: {
  pending: PageActionConfirmState | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const open = pending !== null;

  let title = "";
  let confirmLabel = "";
  let confirmColor: "error" | "primary" = "primary";
  let body: React.ReactNode = null;

  if (pending?.kind === "delete") {
    title = "Delete page?";
    confirmLabel = "Delete page";
    confirmColor = "error";
    body = (
      <>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Delete page <strong>{pending.pagePath}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The Shopify page will also be deleted. This cannot be undone.
        </Typography>
      </>
    );
  } else if (pending?.kind === "unpublish") {
    title = "Unpublish page?";
    confirmLabel = "Unpublish";
    confirmColor = "primary";
    const future = pending.pendingSchedules;
    body = (
      <>
        <Typography variant="body2" sx={{ mb: future.length > 0 ? 1.5 : 0 }}>
          Hide this page on Shopify?
        </Typography>
        {future.length > 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              These versions are still scheduled to publish:
            </Typography>
            <List dense disablePadding sx={{ mb: 1 }}>
              {future.map((schedule) => (
                <ListItem key={`${schedule.versionNumber}-${schedule.publishAt}`} disableGutters>
                  <ListItemText
                    primary={`${schedule.title} (Version ${schedule.versionNumber})`}
                    secondary={formatScheduleInstant(schedule.publishAt)}
                    slotProps={{
                      primary: { variant: "body2" },
                      secondary: { variant: "caption" },
                    }}
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" color="text.secondary">
              Future publishes will still run.
            </Typography>
          </>
        ) : null}
      </>
    );
  }

  return (
    <ScheduleMuiProvider>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="page-action-confirm-title">
        <DialogTitle id="page-action-confirm-title">{title}</DialogTitle>
        <DialogContent dividers>{body}</DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            color={confirmColor}
            disabled={busy || !pending}
          >
            {confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </ScheduleMuiProvider>
  );
}
