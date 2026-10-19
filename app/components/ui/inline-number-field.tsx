"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import "./inline-number-field.css";

type InlineNumberFieldProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  readOnly?: boolean;
  onChange: (value: number) => void;
};

type InlineFieldConfig = {
  type?: string;
  label?: string;
  inline?: boolean;
  switch?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

function decimalsOf(step: number): number {
  const text = step.toString();
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function snap(n: number, min?: number, max?: number, step = 1): number {
  if (!Number.isFinite(n)) {
    return min != null && Number.isFinite(min) ? min : 0;
  }
  let next = n;
  if (step > 0) {
    const base = min != null && Number.isFinite(min) ? min : 0;
    const places = decimalsOf(step);
    next = Number((base + Math.round((n - base) / step) * step).toFixed(places));
  }
  if (min != null && Number.isFinite(min)) next = Math.max(min, next);
  if (max != null && Number.isFinite(max)) next = Math.min(max, next);
  return next;
}

function StepIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden="true">
      {direction === "up" ? (
        <path
          d="M1 4.2 4 .8 7 4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M1 .8 4 4.2 7 .8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function InlineNumberField({
  label,
  value,
  min,
  max,
  step = 1,
  readOnly,
  onChange,
}: InlineNumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (next: number) => {
    const snapped = snap(next, min, max, step);
    onChange(snapped);
    setDraft(String(snapped));
  };

  const atMin = min != null && value <= min;
  const atMax = max != null && value >= max;

  return (
    <div className="visbuild-inline-number">
      <span className="visbuild-inline-number__label">{label}</span>
      <div className="visbuild-inline-number__control">
        <input
          className="visbuild-inline-number__input"
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={draft}
          disabled={readOnly}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw !== "" && raw !== "-" && !/^-?\d*\.?\d*$/.test(raw)) return;
            setDraft(raw);
            if (raw === "" || raw === "-" || raw === "." || raw === "-.") return;
            const next = Number(raw);
            if (!Number.isFinite(next)) return;
            if (min != null && next < min) return;
            if (max != null && next > max) return;
            onChange(next);
          }}
          onBlur={() => {
            if (draft === "" || draft === "-" || draft === "." || draft === "-.") {
              setDraft(String(value));
              return;
            }
            commit(Number(draft));
          }}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.key === "ArrowUp") {
              e.preventDefault();
              commit(value + step);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              commit(value - step);
            } else if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <div className="visbuild-inline-number__steps">
          <button
            type="button"
            className="visbuild-inline-number__step"
            aria-label="Increase"
            disabled={readOnly || atMax}
            onClick={() => commit(value + step)}
          >
            <StepIcon direction="up" />
          </button>
          <button
            type="button"
            className="visbuild-inline-number__step"
            aria-label="Decrease"
            disabled={readOnly || atMin}
            onClick={() => commit(value - step)}
          >
            <StepIcon direction="down" />
          </button>
        </div>
      </div>
    </div>
  );
}

type InlineLayoutFieldProps = {
  field: InlineFieldConfig;
  value?: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  children?: ReactNode;
  label?: string;
  name?: string;
};

function InlineSwitch({
  label,
  checked,
  readOnly,
  onChange,
}: {
  label: string;
  checked: boolean;
  readOnly?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="visbuild-inline-switch">
      <span className="visbuild-inline-switch__label">{label}</span>
      <button
        type="button"
        className={`visbuild-inline-switch__track${checked ? " is-on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={readOnly}
        onClick={() => onChange(!checked)}
      >
        <span className="visbuild-inline-switch__knob" />
      </button>
    </div>
  );
}

/** Puck fieldTypes 包装：字段上写 inline: true 时改成左右排列，否则保持原样。 */
export function InlineLayoutField({
  field,
  value,
  onChange,
  readOnly,
  children,
  label,
  name,
}: InlineLayoutFieldProps) {
  if (field.switch) {
    return (
      <InlineSwitch
        label={field.label || label || name || ""}
        checked={value === true}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }

  if (field.inline && field.type === "number") {
    const current =
      typeof value === "number" && Number.isFinite(value)
        ? value
        : field.min != null && Number.isFinite(field.min)
          ? field.min
          : 0;
    return (
      <InlineNumberField
        label={field.label || label || name || ""}
        value={current}
        min={field.min}
        max={field.max}
        step={field.step}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }

  if (!field.inline) return <>{children}</>;

  return <div className="visbuild-inline-field">{children}</div>;
}
