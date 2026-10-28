"use client";

import { isDayBlocked, type OccupiedRange } from "~/lib/schedule-window";
import { sameLocalDay, startOfLocalDay } from "~/lib/schedule-format";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function monthLabel(month: Date): string {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month);
}

function gridStart(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  return new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
}

export function CalendarMonth({
  month,
  selected,
  min,
  ranges,
  disabled,
  onMonthChange,
  onSelect,
}: {
  month: Date;
  selected: Date | null;
  min: Date | null;
  ranges: OccupiedRange[];
  disabled?: boolean;
  onMonthChange: (month: Date) => void;
  onSelect: (day: Date) => void;
}) {
  const start = gridStart(month);
  const days = Array.from({ length: 42 }, (_, index) => {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
  });
  const today = new Date();
  const minDay = min ? startOfLocalDay(min).getTime() : null;

  return (
    <div style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        <span>{monthLabel(month)}</span>
        <span style={{ display: "inline-flex", gap: 4 }}>
          <MonthButton
            label="Previous month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            ‹
          </MonthButton>
          <MonthButton
            label="Next month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            ›
          </MonthButton>
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 36px)",
          gap: 2,
          justifyContent: "center",
        }}
      >
        {WEEKDAYS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            style={{
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#94a3b8",
              fontWeight: 600,
              paddingBottom: 4,
            }}
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const blocked =
            (minDay !== null && startOfLocalDay(day).getTime() < minDay) ||
            isDayBlocked(day, ranges);
          const isSelected = selected ? sameLocalDay(day, selected) : false;
          const isToday = sameLocalDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={blocked}
              onClick={() => onSelect(new Date(day.getFullYear(), day.getMonth(), day.getDate()))}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: isToday && !isSelected ? "1px solid #cbd5e1" : "1px solid transparent",
                background: isSelected ? "#2563eb" : "transparent",
                color: isSelected ? "#fff" : !inMonth || blocked ? "#cbd5e1" : "#0f172a",
                cursor: blocked ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
              }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "#334155",
        fontSize: "1.1rem",
      }}
    >
      {children}
    </button>
  );
}
