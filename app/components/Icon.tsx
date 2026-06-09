import { useMemo, useState } from "react";
import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import {
  ICON_OPTIONS,
  iconFontSizeFromHeight,
  toFaIconClasses,
} from "./icon-options";

const IconInternal: ComponentConfig<Components["Icon"]> = {
  fields: {
    iconId: {
      type: "custom",
      label: "Find an icon",
      render: ({ value, onChange }) => {
        const [query, setQuery] = useState("");
        const filtered = useMemo(() => {
          const q = query.trim().toLowerCase();
          if (!q) return ICON_OPTIONS;
          return ICON_OPTIONS.filter(
            (o) =>
              o.label.toLowerCase().includes(q) ||
              o.value.toLowerCase().includes(q)
          );
        }, [query]);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="search"
              value={query}
              placeholder="Search icons…"
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #ddd",
                borderRadius: 6,
                fontSize: 13,
              }}
            />
            <div
              style={{
                maxHeight: 220,
                overflow: "auto",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
                background: "#fafafa",
              }}
            >
              {filtered.map((opt) => {
                const selected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "8px 10px",
                      border: "none",
                      borderBottom: "1px solid #eee",
                      background: selected ? "#e8f4ff" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 13,
                    }}
                  >
                    <i
                      className={toFaIconClasses(opt.value)}
                      style={{
                        fontSize: 18,
                        width: 24,
                        textAlign: "center",
                        color: "#333",
                      }}
                      aria-hidden
                    />
                    <span style={{ flex: 1, fontWeight: selected ? 600 : 400 }}>
                      {opt.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#888",
                        fontFamily: "monospace",
                        maxWidth: "42%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {opt.value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      },
    },
    height: {
      type: "text",
      label: "Height",
      placeholder: "64",
    },
    align: {
      type: "radio",
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    color: {
      type: "text",
      label: "Color",
    },
    ariaLabel: {
      type: "text",
      label: "Aria label",
    },
    addLink: {
      type: "radio",
      label: "Add link",
      options: [
        { label: "Off", value: false },
        { label: "On", value: true },
      ],
    },
    linkHref: {
      type: "text",
      label: "Add link",
      placeholder: "Link",
    },
    openInNewWindow: {
      type: "radio",
      label: "Open in new window",
      options: [
        { label: "Off", value: false },
        { label: "On", value: true },
      ],
    },
  },
  resolveFields: (data) => {
    const props = data.props || {};
    const fields = { ...IconInternal.fields } as Record<string, unknown>;
    if (!props.addLink) {
      delete fields.linkHref;
      delete fields.openInNewWindow;
    }
    return fields as typeof IconInternal.fields;
  },
  defaultProps: {
    iconId: "shg-fa-address-book-o",
    height: "64",
    align: "center",
    color: "#333333",
    ariaLabel: "Address Book",
    addLink: false,
    linkHref: "",
    openInNewWindow: false,
    layout: {
      ...defaultLayoutSpacing,
      sectionPadding: {
        top: "8px",
        right: "0",
        bottom: "8px",
        left: "0",
      },
    },
  },
  render: ({
    iconId,
    height,
    align,
    color,
    ariaLabel,
    addLink,
    linkHref,
    openInNewWindow,
    puck,
  }) => {
    const justifyContent =
      align === "left"
        ? "flex-start"
        : align === "right"
          ? "flex-end"
          : "center";
    const fa = toFaIconClasses(iconId);
    const fontSize = iconFontSizeFromHeight(height);

    const iconEl = (
      <i
        className={fa}
        style={{
          fontSize,
          lineHeight: 1,
          color,
        }}
        aria-hidden
      />
    );

    const labeled =
      ariaLabel?.trim() ? (
        <span aria-label={ariaLabel.trim()}>{iconEl}</span>
      ) : (
        iconEl
      );

    const inner =
      addLink && linkHref?.trim() ? (
        <a
          href={puck.isEditing ? "#" : linkHref.trim()}
          target={openInNewWindow ? "_blank" : undefined}
          rel={openInNewWindow ? "noopener noreferrer" : undefined}
          style={{
            display: "inline-flex",
            textDecoration: "none",
            color: "inherit",
            cursor: puck.isEditing ? "default" : "pointer",
          }}
          tabIndex={puck.isEditing ? -1 : undefined}
          aria-label={ariaLabel?.trim() || undefined}
        >
          {iconEl}
        </a>
      ) : (
        labeled
      );

    return (
      <Section>
        <div
          style={{
            display: "flex",
            justifyContent,
            width: "100%",
          }}
        >
          {inner}
        </div>
      </Section>
    );
  },
};

export const Icon = withLayout(IconInternal);
