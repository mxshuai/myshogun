"use client";

import { useState, type ReactNode } from "react";
import type { CustomField } from "@puckeditor/core";

import type { LayoutFieldProps, SectionSidesFields } from "../Layout";
import { InlineNumberField } from "./inline-number-field";

function sideNumber(value: string | undefined): number {
  const n = parseFloat(String(value ?? "0").replace(/px$/i, ""));
  return Number.isFinite(n) ? n : 0;
}

function CollapsibleGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="visbuild-collapsible-object"
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary className="visbuild-collapsible-object__summary">
        <span className="visbuild-collapsible-object__chevron" aria-hidden="true" />
        {title}
      </summary>
      <div className="visbuild-layout-fields">{children}</div>
    </details>
  );
}

function LayoutSidebarFields({
  value,
  onChange,
  readOnly,
  showDimensions = true,
}: {
  value?: LayoutFieldProps;
  onChange: (value: LayoutFieldProps) => void;
  readOnly?: boolean;
  showDimensions?: boolean;
}) {
  const layout = value ?? {};
  const dimensions = layout.dimensions ?? {};
  const margin = layout.sectionMargin ?? {};
  const padding = layout.sectionPadding ?? {};

  const setDimension = (key: "minHeight" | "maxWidth", next: number) => {
    onChange({
      ...layout,
      dimensions: { ...dimensions, [key]: next },
    });
  };

  const setSide = (
    group: "sectionMargin" | "sectionPadding",
    current: SectionSidesFields,
    key: keyof SectionSidesFields,
    next: number,
  ) => {
    onChange({
      ...layout,
      [group]: { ...current, [key]: String(next) },
    });
  };

  return (
    <div className="visbuild-layout-groups">
      {showDimensions ? (
        <CollapsibleGroup title="Dimensions">
          <InlineNumberField
            label="Min Height"
            value={dimensions.minHeight ?? 0}
            min={0}
            suffix="PX"
            readOnly={readOnly}
            onChange={(next) => setDimension("minHeight", next)}
          />
          <InlineNumberField
            label="Max Width"
            value={dimensions.maxWidth ?? 0}
            min={0}
            suffix="PX"
            readOnly={readOnly}
            onChange={(next) => setDimension("maxWidth", next)}
          />
        </CollapsibleGroup>
      ) : null}
      <CollapsibleGroup title="Section margin">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <InlineNumberField
            key={side}
            label={side[0].toUpperCase() + side.slice(1)}
            value={sideNumber(margin[side])}
            min={0}
            suffix="PX"
            readOnly={readOnly}
            onChange={(next) => setSide("sectionMargin", margin, side, next)}
          />
        ))}
      </CollapsibleGroup>
      <CollapsibleGroup title="Section padding">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <InlineNumberField
            key={side}
            label={side[0].toUpperCase() + side.slice(1)}
            value={sideNumber(padding[side])}
            min={0}
            suffix="PX"
            readOnly={readOnly}
            onChange={(next) => setSide("sectionPadding", padding, side, next)}
          />
        ))}
      </CollapsibleGroup>
    </div>
  );
}

export function createLayoutSidebarField(options?: {
  showDimensions?: boolean;
}): CustomField<LayoutFieldProps> {
  const showDimensions = options?.showDimensions !== false;
  return {
    type: "custom",
    label: "Layout",
    render: ({ value, onChange, readOnly }) => (
      <LayoutSidebarFields
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        showDimensions={showDimensions}
      />
    ),
  };
}

export const layoutSidebarField = createLayoutSidebarField();
