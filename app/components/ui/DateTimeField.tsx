"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { CalendarMonth } from "~/components/ui/CalendarMonth";
import { pad2 } from "~/lib/schedule-format";
import {
  isMinuteBlocked,
  truncateToMinute,
  type OccupiedRange,
} from "~/lib/schedule-window";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function at(day: Date, hour24: number, minute: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour24, minute, 0, 0);
}

function toHour24(hour12: number, pm: boolean): number {
  return (hour12 % 12) + (pm ? 12 : 0);
}

export function DateTimeField({
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
  const [month, setMonth] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1),
  );
  const minMs = min ? truncateToMinute(min).getTime() : null;
  const isAvailable = (date: Date) =>
    (minMs === null || date.getTime() >= minMs) &&
    !isMinuteBlocked(date.getTime(), ranges);

  const pm = value.getHours() >= 12;
  const hour12 = value.getHours() % 12 || 12;
  const minute = value.getMinutes();
  const blocked = !isAvailable(value);

  useEffect(() => {
    setMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [value]);

  /** First available minute of `day` within [fromMinute, toMinute), or null. */
  const firstAvailable = (day: Date, fromMinute: number, toMinute: number): Date | null => {
    for (let m = fromMinute; m < toMinute; m += 1) {
      const candidate = at(day, Math.floor(m / 60), m % 60);
      if (isAvailable(candidate)) return candidate;
    }
    return null;
  };

  const hourAvailable = (hour24: number) =>
    MINUTES.some((m) => isAvailable(at(value, hour24, m)));

  const halfAvailable = (isPm: boolean) =>
    firstAvailable(value, isPm ? 720 : 0, isPm ? 1440 : 720) !== null;

  const pickInHour = (hour24: number) =>
    isAvailable(at(value, hour24, minute))
      ? at(value, hour24, minute)
      : firstAvailable(value, hour24 * 60, hour24 * 60 + 60);

  return (
    <div style={{ opacity: disabled ? 0.55 : 1 }}>
      <CalendarMonth
        month={month}
        selected={value}
        min={min}
        ranges={ranges}
        disabled={disabled}
        onMonthChange={setMonth}
        onSelect={(day) => {
          setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
          const sameTime = at(day, value.getHours(), minute);
          const current = value.getHours() * 60 + minute;
          const next = isAvailable(sameTime)
            ? sameTime
            : firstAvailable(day, current, 1440) ?? firstAvailable(day, 0, current);
          if (next) onChange(next);
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          fontSize: "0.875rem",
          fontWeight: 600,
        }}
      >
        At:
        <select
          aria-label="Hour"
          disabled={disabled}
          value={hour12}
          onChange={(event) => {
            const next = pickInHour(toHour24(Number(event.target.value), pm));
            if (next) onChange(next);
          }}
          style={selectStyle(blocked, 64)}
        >
          {HOURS_12.map((h) => (
            <option key={h} value={h} disabled={!hourAvailable(toHour24(h, pm))}>
              {pad2(h)}
            </option>
          ))}
        </select>
        :
        <select
          aria-label="Minute"
          disabled={disabled}
          value={minute}
          onChange={(event) => {
            onChange(at(value, value.getHours(), Number(event.target.value)));
          }}
          style={selectStyle(blocked, 64)}
        >
          {MINUTES.map((m) => (
            <option
              key={m}
              value={m}
              disabled={!isAvailable(at(value, value.getHours(), m))}
            >
              {pad2(m)}
            </option>
          ))}
        </select>
        <select
          aria-label="AM or PM"
          disabled={disabled}
          value={pm ? "PM" : "AM"}
          onChange={(event) => {
            const nextPm = event.target.value === "PM";
            const sameTime = at(value, toHour24(hour12, nextPm), minute);
            const next = isAvailable(sameTime)
              ? sameTime
              : firstAvailable(value, nextPm ? 720 : 0, nextPm ? 1440 : 720);
            if (next) onChange(next);
          }}
          style={selectStyle(blocked, 76)}
        >
          <option disabled={!halfAvailable(false)}>AM</option>
          <option disabled={!halfAvailable(true)}>PM</option>
        </select>
      </div>
      {blocked && !disabled ? (
        <p style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: "0.8rem" }}>
          This minute is not available.
        </p>
      ) : null}
    </div>
  );
}

function selectStyle(blocked: boolean, width: number): CSSProperties {
  return {
    width,
    padding: "8px 6px",
    borderRadius: 8,
    border: `1px solid ${blocked ? "#fca5a5" : "#e5e7eb"}`,
    fontSize: "0.95rem",
    background: "#fff",
  };
}
