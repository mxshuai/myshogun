"use client";

import type { CustomField } from "@puckeditor/core";
import { FieldLabel } from "@puckeditor/core";

import { useMediaPicker } from "./MediaPickerContext";
import type { ImageValue } from "./types";
import {
  formatDimensions,
  formatFileSize,
  normalizeImageValue,
} from "./types";
import "./media.css";

type ImagePickerVariant = "main" | "hover" | "background";

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 15l3-3 2 2 5-5 2 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </svg>
  );
}

function SelectedImageCard({
  value,
  readOnly,
  onChange,
  onReplace,
}: {
  value: ImageValue;
  readOnly?: boolean;
  onChange: (next: ImageValue | null) => void;
  onReplace: () => void;
}) {
  const filename = value.filename || value.url.split("/").pop()?.split("?")[0] || "image";
  const sizeText = formatFileSize(value.size);
  const dimText = formatDimensions(value.width, value.height);

  return (
    <div className="visbuild-image-picker__card">
      {!readOnly ? (
        <button
          type="button"
          className="visbuild-image-picker__remove"
          aria-label="Remove image"
          onClick={() => onChange(null)}
        >
          ×
        </button>
      ) : null}
      <div className="visbuild-image-picker__card-body">
        <img src={value.url} alt="" className="visbuild-image-picker__thumb" />
        <div className="visbuild-image-picker__meta">
          <div className="visbuild-image-picker__filename" title={filename}>
            {filename}
          </div>
          <div className="visbuild-image-picker__details">
            {[sizeText, dimText].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
      {!readOnly ? (
        <button
          type="button"
          className="visbuild-image-picker__replace"
          onClick={onReplace}
        >
          Change image
        </button>
      ) : null}
    </div>
  );
}

function ImagePickerFieldInner({
  label,
  variant,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  variant: ImagePickerVariant;
  value: ImageValue | null;
  onChange: (value: ImageValue | null) => void;
  readOnly?: boolean;
}) {
  const { openPicker } = useMediaPicker();
  const normalized = normalizeImageValue(value);

  const open = () => {
    if (readOnly) return;
    openPicker((next) => onChange(next));
  };

  if (!normalized) {
    const isMain = variant === "main";
    const isBackground = variant === "background";
    return (
      <FieldLabel label={label} readOnly={readOnly}>
        <button
          type="button"
          className={
            isMain
              ? "visbuild-image-picker__select-btn"
              : isBackground
                ? "visbuild-image-picker__background-btn"
                : "visbuild-image-picker__hover-btn"
          }
          disabled={readOnly}
          onClick={open}
        >
          {isMain ? (
            <>
              <ImageIcon />
              Select image
            </>
          ) : isBackground ? (
            "Add image (optional)"
          ) : (
            "Add hover image (optional)"
          )}
        </button>
      </FieldLabel>
    );
  }

  if (variant === "background") {
    return (
      <div className="visbuild-image-picker__background">
        <div className="visbuild-image-picker__background-label">
          <span>{label}</span>
          {!readOnly ? (
            <button
              type="button"
              className="visbuild-image-picker__background-remove"
              aria-label="Remove image"
              onClick={() => onChange(null)}
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="visbuild-image-picker__background-preview"
          disabled={readOnly}
          onClick={open}
        >
          <img src={normalized.url} alt="" />
        </button>
      </div>
    );
  }

  return (
    <FieldLabel label={label} readOnly={readOnly}>
      <SelectedImageCard
        value={normalized}
        readOnly={readOnly}
        onChange={onChange}
        onReplace={open}
      />
    </FieldLabel>
  );
}

export function createImagePickerField(
  label: string,
  options: { variant: ImagePickerVariant },
): CustomField<ImageValue | null> {
  return {
    type: "custom",
    label,
    render: ({ value, onChange, readOnly }) => (
      <ImagePickerFieldInner
        label={label}
        variant={options.variant}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    ),
  };
}
