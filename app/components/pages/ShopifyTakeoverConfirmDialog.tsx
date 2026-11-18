"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";

import { ScheduleMuiProvider } from "~/components/schedule/ScheduleMuiProvider";

export type ShopifyTakeoverPending = {
  pageTitle: string;
  pagePath: string;
  handle: string;
  remoteTitle: string;
};

export function ShopifyTakeoverConfirmDialog({
  pending,
  busy,
  onClose,
  onConfirm,
}: {
  pending: ShopifyTakeoverPending | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const open = pending !== null;

  return (
    <ScheduleMuiProvider>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="shopify-takeover-dialog-title"
      >
        <DialogTitle id="shopify-takeover-dialog-title">
          Link existing Shopify page?
        </DialogTitle>
        <DialogContent dividers>
          {pending ? (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Shopify already has a page{" "}
                <strong>{pending.remoteTitle}</strong> (handle{" "}
                <strong>{pending.handle}</strong>).
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You can edit <strong>{pending.pageTitle || "this page"}</strong>{" "}
                in this app at path <code>/{pending.pagePath}</code>. Nothing on
                Shopify changes until you publish. The first publish will replace
                that page&apos;s content and set the theme template to{" "}
                <strong>visbuild</strong>.
              </Typography>
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            disabled={busy || !pending}
          >
            Create &amp; edit
          </Button>
        </DialogActions>
      </Dialog>
    </ScheduleMuiProvider>
  );
}