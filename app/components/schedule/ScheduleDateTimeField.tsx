"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs, { type Dayjs } from "dayjs";

import { SCHEDULE_MODAL_Z_INDEX } from "~/components/schedule/ScheduleMuiProvider";
import { startOfLocalDay } from "~/lib/schedule-format";
import {
  isDayBlocked,
  isMinuteBlocked,
  truncateToMinute,
  type OccupiedRange,
} from "~/lib/schedule-window";

function mergeDateAndTime(date: Dayjs, time: Dayjs): Date {
  return truncateToMinute(
    date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0).toDate(),
  );
}

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
  const valueDay = dayjs(value);
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

  const shouldDisableTime = (dateValue: Dayjs, view: "hours" | "minutes" | "seconds") => {
    if (view !== "minutes") return false;
    const probe = valueDay.hour(dateValue.hour()).minute(dateValue.minute());
    return !isAvailable(truncateToMinute(probe.toDate()));
  };

  const tryApply = (candidate: Date) => {
    const next = truncateToMinute(candidate);
    if (isAvailable(next)) onChange(next);
  };

  return (
    <Box sx={{ opacity: disabled ? 0.55 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <DateCalendar
        disabled={disabled}
        value={valueDay}
        minDate={min ? dayjs(min) : undefined}
        shouldDisableDate={shouldDisableDate}
        onChange={(next) => {
          if (!next?.isValid()) return;
          tryApply(mergeDateAndTime(next, valueDay));
        }}
        sx={{
          width: 260,
          maxWidth: "100%",
          height: "auto",
          mx: "auto",
          "& .MuiPickersCalendarHeader-root": {
            px: 0.5,
            mt: 0,
            mb: 0.5,
            minHeight: 32,
          },
          "& .MuiPickersCalendarHeader-label": { fontSize: "0.875rem" },
          "& .MuiDayCalendar-weekDayLabel": {
            width: 32,
            height: 28,
            fontSize: "0.7rem",
          },
          "& .MuiPickersDay-root": {
            width: 32,
            height: 32,
            fontSize: "0.75rem",
          },
          "& .MuiDayCalendar-slideTransition": {
            minHeight: 208,
            overflow: "hidden",
          },
        }}
      />
      <Box sx={{ px: 1, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
          Time
        </Typography>
        <TimePicker
          ampm
          timeSteps={{ hours: 1, minutes: 1 }}
          disabled={disabled}
          value={valueDay}
          onChange={(next) => {
            if (!next?.isValid()) return;
            tryApply(mergeDateAndTime(valueDay, next));
          }}
          shouldDisableTime={shouldDisableTime}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              readOnly: true,
            },
            popper: {
              sx: { zIndex: SCHEDULE_MODAL_Z_INDEX + 1 },
            },
          }}
        />
      </Box>
      {blocked && !disabled ? (
        <Typography color="error" variant="caption" sx={{ display: "block", px: 1, pb: 1 }}>
          This minute is not available.
        </Typography>
      ) : null}
    </Box>
  );
}
