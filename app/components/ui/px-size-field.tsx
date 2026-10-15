"use client";

import { useEffect, useState } from "react";
import type { CustomField } from "@puckeditor/core";

import "./px-size-field.css";

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

function PxSizeField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  useEffect(() => {
    setDraft(value == null || !Number.isFinite(value) ? "" : String(value));
  }, [value]);

  const commit = (next: number | undefined) => {
    if (next == null || !Number.isFinite(next)) {
      onChange(undefined);
      setDraft("");
      return;
    }
    const snapped = Math.max(0, Math.round(next));
    onChange(snapped);
    setDraft(String(snapped));
  };

  return (
    <div className="visbuild-px-size">
      <div className="visbuild-px-size__label">{label}</div>
      <div className="visbuild-px-size__row">
        <div className="visbuild-px-size__control">
          <input
            className="visbuild-px-size__input"
            type="text"
            inputMode="numeric"
            aria-label={label}
            value={draft}
            disabled={readOnly}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw !== "" && !/^\d*$/.test(raw)) return;
              setDraft(raw);
              if (raw === "") {
                onChange(undefined);
                return;
              }
              onChange(Math.max(0, Number(raw)));
            }}
            onBlur={() => {
              if (draft === "") {
                commit(undefined);
                return;
              }
              commit(Number(draft));
            }}
          />
          <div className="visbuild-px-size__steps">
            <button
              type="button"
              className="visbuild-px-size__step"
              aria-label="Increase"
              disabled={readOnly}
              onClick={() => commit((value ?? 0) + 1)}
            >
              <StepIcon direction="up" />
            </button>
            <button
              type="button"
              className="visbuild-px-size__step"
              aria-label="Decrease"
              disabled={readOnly || (value ?? 0) <= 0}
              onClick={() => commit(Math.max(0, (value ?? 0) - 1))}
            >
              <StepIcon direction="down" />
            </button>
          </div>
        </div>
        <select className="visbuild-px-size__unit" aria-label={`${label} unit`} disabled={readOnly} value="px">
          <option value="px">px</option>
        </select>
      </div>
    </div>
  );
}

export function createPxSizeField(label: string): CustomField<number | undefined> {
  return {
    type: "custom",
    label,
    render: ({ value, onChange, readOnly }) => (
      <PxSizeField
        label={label}
        value={typeof value === "number" ? value : undefined}
        onChange={onChange}
        readOnly={readOnly}
      />
    ),
  };
}
