"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";

import { ScheduleMuiProvider } from "~/components/schedule/ScheduleMuiProvider";
import {
  ScheduleSummaryCard,
  type ScheduleSummaryCardData,
} from "~/components/schedule/ScheduleSummaryCard";

export type PageDeleteConfirm = {
  kind: "delete";
  pagePath: string;
};

export type PageUnpublishConfirm = {
  kind: "unpublish";
  pagePath: string;
  pendingSchedules: ScheduleSummaryCardData[];
};

export type PageActionConfirmState = PageDeleteConfirm | PageUnpublishConfirm;

export function PageActionConfirmDialog({
  pending,
  busy,
  onClose,
  onConfirm,
  onConfirmUnpublishAll,
}: {
  pending: PageActionConfirmState | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** When unpublish has pending schedules: unpublish + cancel all pending schedules. */
  onConfirmUnpublishAll?: () => void;
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
          {future.length > 0
            ? "Hide this page on Shopify? Note that some versions are still scheduled to publish."
            : "Hide this page on Shopify?"}
        </Typography>
        {future.length > 0 ? (
          <>
            <List disablePadding sx={{ mb: 1.5 }}>
              {future.map((schedule) => (
                <ScheduleSummaryCard
                  key={`${schedule.versionNumber}-${schedule.publishAt}-${schedule.updatedAt}`}
                  schedule={schedule}
                />
              ))}
            </List>
            <Typography variant="body2" color="text.secondary">
              Future publish events will continue unless you choose to Unpublish All.
            </Typography>
          </>
        ) : null}
      </>
    );
  }

  const showUnpublishAll =
    pending?.kind === "unpublish" &&
    pending.pendingSchedules.length > 0 &&
    Boolean(onConfirmUnpublishAll);

  return (
    <ScheduleMuiProvider>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="page-action-confirm-title">
        <DialogTitle id="page-action-confirm-title">{title}</DialogTitle>
        <DialogContent dividers>{body}</DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexWrap: "wrap", gap: 1 }}>
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
          {showUnpublishAll ? (
            <Button
              onClick={onConfirmUnpublishAll}
              variant="contained"
              color="error"
              disabled={busy}
            >
              Unpublish All
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </ScheduleMuiProvider>
  );
}
