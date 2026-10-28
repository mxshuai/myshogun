"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { ScheduleMuiProvider } from "~/components/schedule/ScheduleMuiProvider";
import { canonicalPagePath } from "~/lib/page-path";

export function CreatePageDialog({
  open,
  busy,
  pageTitle,
  pagePath,
  error,
  onPageTitleChange,
  onPagePathChange,
  onPagePathBlur,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy?: boolean;
  pageTitle: string;
  pagePath: string;
  error: string | null;
  onPageTitleChange: (title: string) => void;
  onPagePathChange: (path: string) => void;
  onPagePathBlur: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const pathValid = Boolean(canonicalPagePath(pagePath));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!pathValid || busy) return;
    onSubmit();
  };

  return (
    <ScheduleMuiProvider>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="create-page-dialog-title"
      >
        <DialogTitle id="create-page-dialog-title">New page</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <TextField
              label="Page name"
              value={pageTitle}
              onChange={(e) => onPageTitleChange(e.target.value)}
              placeholder="My page"
              fullWidth
              autoFocus
              margin="normal"
              disabled={busy}
            />
            <TextField
              label="URL path"
              value={pagePath}
              onChange={(e) => onPagePathChange(e.target.value)}
              onBlur={onPagePathBlur}
              placeholder="about"
              fullWidth
              margin="normal"
              disabled={busy}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ fontFamily: "monospace" }}>
                      /
                    </InputAdornment>
                  ),
                  sx: { fontFamily: "ui-monospace, monospace" },
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Generated from the page name. Changing the name replaces this path. Saved paths
              use letters, numbers, and hyphens.
            </Typography>
            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} variant="outlined" color="inherit" disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy || !pathValid}>
              Create & edit
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </ScheduleMuiProvider>
  );
}
