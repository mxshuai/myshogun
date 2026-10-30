import { useMemo, useState } from "react";
import type { ComponentConfig, Fields } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import {
  ICON_OPTIONS,
  iconFontSizeFromHeight,
  toFaIconClasses,
} from "./icon-options";
import { createPuckColorField } from "./ui/puck-color-field";
import { onOffOptions } from "./button-field-groups";

const switchField = (label: string) => ({
  type: "radio" as const,
  label,
  options: [...onOffOptions],
  switch: true,
});

const IconInternal: ComponentConfig<Components["Icon"]> = {
  fields: {
    main: {
      type: "object",
      label: "Main",
      defaultOpen: true,
      objectFields: {
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
          type: "number",
          label: "Height",
          inline: true,
          min: 1,
          max: 512,
          suffix: "PX",
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
        color: createPuckColorField("Color", "#333333"),
        ariaLabel: {
          type: "text",
          label: "Aria label",
        },
        addLink: switchField("Add link"),
        linkHref: {
          type: "text",
          label: "Add link",
          placeholder: "Link",
        },
        openInNewWindow: switchField("Open in new window"),
      },
    },
  },
  resolveFields: (data) => {
    const addLink = data.props?.main?.addLink === true;
    const objectFields = {
      ...((IconInternal.fields as { main?: { objectFields?: Record<string, unknown> } })
        .main?.objectFields ?? {}),
    };
    if (!addLink) {
      delete objectFields.linkHref;
      delete objectFields.openInNewWindow;
    }
    return {
      main: {
        type: "object",
        label: "Main",
        defaultOpen: true,
        objectFields,
      },
    } as Fields<Components["Icon"]>;
  },
  defaultProps: {
    main: {
      iconId: "shg-fa-address-book-o",
      height: 64,
      align: "center",
      color: "#333333",
      ariaLabel: "Address Book",
      addLink: false,
      linkHref: "",
      openInNewWindow: false,
    },
    layout: {
      ...defaultLayoutSpacing,
    },
  },
  render: (props) => {
    const main = props.main ?? {
      iconId: "shg-fa-address-book-o",
      height: 64,
      align: "center" as const,
      color: "#333333",
      ariaLabel: "",
      addLink: false,
      linkHref: "",
      openInNewWindow: false,
    };
    const {
      iconId,
      height,
      align,
      color,
      ariaLabel,
      addLink,
      linkHref,
      openInNewWindow,
    } = main;
    const puck = props.puck;
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
