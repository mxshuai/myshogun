"use client";

import { useMemo, useState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";

import { ScheduleDateTimeField } from "~/components/schedule/ScheduleDateTimeField";
import { ScheduleMuiProvider } from "~/components/schedule/ScheduleMuiProvider";
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
    <ScheduleMuiProvider>
      <Dialog
        open
        onClose={onClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="schedule-window-title"
      >
        <DialogTitle id="schedule-window-title">{title}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your page will be published on the day and time you specify. You can also choose
            to unpublish the page on a specified day and time.
          </Typography>
          {message ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {message}
            </Alert>
          ) : null}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
                bgcolor: "grey.50",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={publishOn}
                    disabled={Boolean(publishLocked)}
                    onChange={(_, checked) => {
                      setPublishOn(checked);
                      if (!checked) setUnpublishOn(false);
                      setLocalError(null);
                    }}
                  />
                }
                label="Publish page on"
                sx={{ mb: 1, fontWeight: 600 }}
              />
              <ScheduleDateTimeField
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
            </Box>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
                bgcolor: "grey.50",
                opacity: publishOn ? 1 : 0.5,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={unpublishOn && publishOn}
                    disabled={!publishOn}
                    onChange={(_, checked) => {
                      setUnpublishOn(checked);
                      setLocalError(null);
                    }}
                  />
                }
                label="Unpublish on…"
                sx={{ mb: 1, fontWeight: 600 }}
              />
              <ScheduleDateTimeField
                value={unpublishAt}
                min={new Date(truncateToMinute(publishAt).getTime() + 60_000)}
                ranges={unpublishRanges}
                disabled={!publishOn || !unpublishOn}
                onChange={(next) => {
                  setUnpublishAt(next);
                  setLocalError(null);
                }}
              />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Times use your local timezone. Leave unpublish off to keep the version published.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button onClick={confirm} variant="contained" disabled={busy}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </ScheduleMuiProvider>
  );
}
