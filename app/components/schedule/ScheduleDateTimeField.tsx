"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { StaticDateTimePicker } from "@mui/x-date-pickers/StaticDateTimePicker";
import dayjs, { type Dayjs } from "dayjs";

import { startOfLocalDay } from "~/lib/schedule-format";
import {
  isDayBlocked,
  isMinuteBlocked,
  truncateToMinute,
  type OccupiedRange,
} from "~/lib/schedule-window";

export function ScheduleDateTimeField({
  value,
  min,
  ranges,
  disabled,
  onChange,
}: {
  value: Date;
  min: Date | null;
  ranges: OccupiedRange[];
  disabled?: boolean;
  onChange: (value: Date) => void;
}) {
  const minMs = min ? truncateToMinute(min).getTime() : null;
  const isAvailable = (date: Date) =>
    (minMs === null || date.getTime() >= minMs) &&
    !isMinuteBlocked(date.getTime(), ranges);
  const blocked = !isAvailable(value);

  const shouldDisableDate = (date: Dayjs) => {
    const d = date.toDate();
    const minDay = min ? startOfLocalDay(min).getTime() : null;
    if (minDay !== null && startOfLocalDay(d).getTime() < minDay) return true;
    return isDayBlocked(d, ranges);
  };

  const shouldDisableTime = (dateValue: Dayjs) => {
    const d = truncateToMinute(dateValue.toDate());
    return !isAvailable(d);
  };

  return (
    <Box sx={{ opacity: disabled ? 0.55 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <StaticDateTimePicker
        disabled={disabled}
        ampm
        value={dayjs(value)}
        onChange={(next) => {
          if (!next || !next.isValid()) return;
          const d = truncateToMinute(next.toDate());
          if (isAvailable(d)) onChange(d);
        }}
        minDateTime={min ? dayjs(min) : undefined}
        shouldDisableDate={shouldDisableDate}
        shouldDisableTime={shouldDisableTime}
        slotProps={{
          actionBar: { actions: [] },
        }}
        sx={{
          "& .MuiPickersLayout-root": {
            minWidth: 0,
          },
        }}
      />
      {blocked && !disabled ? (
        <Typography color="error" variant="caption" sx={{ display: "block", mt: 1 }}>
          This minute is not available.
        </Typography>
      ) : null}
    </Box>
  );
}
