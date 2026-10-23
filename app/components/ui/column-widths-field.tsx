"use client";

import { useRef, useState } from "react";
import type { CustomField } from "@puckeditor/core";
import { createUsePuck } from "@puckeditor/core";

import {
  columnDividerPositions,
  equalColumnWidths,
  isEqualColumnWidths,
  moveColumnThumb,
  nudgeColumnWidth,
  resolveColumnWidths,
} from "../columns-styles";
import "./column-widths-field.css";

const useEditorPuck = createUsePuck();

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 12;

function clampColumnCount(n: unknown): number {
  const num = Math.round(Number(n));
  if (!Number.isFinite(num)) return 2;
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, num));
}

function ColumnWidthsField({
  value,
  onChange,
  readOnly,
}: {
  value?: number[];
  onChange: (value: number[]) => void;
  readOnly?: boolean;
}) {
  const numColumns = useEditorPuck((state) =>
    clampColumnCount(
      (
        state.selectedItem?.props as { main?: { numColumns?: number } } | undefined
      )?.main?.numColumns,
    ),
  );
  const widths = resolveColumnWidths(value, numColumns);
  const dividers = columnDividerPositions(widths);
  const equal = isEqualColumnWidths(widths, numColumns);
  const trackRef = useRef<HTMLDivElement>(null);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;
  const [active, setActive] = useState<number | null>(null);

  const apply = (next: number[]) => {
    widthsRef.current = next;
    onChange(next);
  };

  const pointerPercent = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return null;
    return ((clientX - rect.left) / rect.width) * 100;
  };

  return (
    <div className="visbuild-column-widths">
      <div className="visbuild-column-widths__label">Column widths</div>
      <div
        ref={trackRef}
        className="visbuild-column-widths__track"
      >
        <div className="visbuild-column-widths__bar" />
        {dividers.map((position, index) => (
          <button
            key={index}
            type="button"
            className={`visbuild-column-widths__thumb${
              active === index ? " is-active" : ""
            }`}
            style={{ left: `${position}%` }}
            role="slider"
            aria-label={`Width between column ${index + 1} and ${index + 2}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
            aria-disabled={readOnly}
            disabled={readOnly}
            onPointerDown={(event) => {
              if (readOnly) return;
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              setActive(index);
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const percent = pointerPercent(event.clientX);
              if (percent == null) return;
              apply(moveColumnThumb(widthsRef.current, index, percent));
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              setActive(null);
            }}
            onLostPointerCapture={() => {
              setActive(null);
            }}
            onKeyDown={(event) => {
              if (readOnly) return;
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const delta = event.key === "ArrowRight" ? 1 : -1;
              apply(nudgeColumnWidth(widthsRef.current, index, delta));
            }}
          />
        ))}
      </div>
      <button
        type="button"
        className="visbuild-column-widths__reset"
        disabled={readOnly || equal}
        onClick={() => apply(equalColumnWidths(numColumns))}
      >
        Reset column widths
      </button>
    </div>
  );
}

export function createColumnWidthsField(): CustomField<number[] | undefined> {
  return {
    type: "custom",
    label: "Column widths",
    render: ({ value, onChange, readOnly }) => (
      <ColumnWidthsField
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    ),
  };
}
