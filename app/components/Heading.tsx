import type { CSSProperties } from "react";
import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";
import {
  HEADING_SIZE_BY_LEVEL,
  normalizeHeadingLevel,
  resolveHeadingFontSize,
} from "./heading-level-sizes";

const levelOptions = [
  { label: "h1", value: 1 },
  { label: "h2", value: 2 },
  { label: "h3", value: 3 },
  { label: "h4", value: 4 },
  { label: "h5", value: 5 },
  { label: "h6", value: 6 },
] as const;

const fontOptions = TEXT_FONT_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

const headingFields: ComponentConfig<Components["Heading"]>["fields"] = {
    level: {
      type: "select",
      label: "Heading type",
      options: [...levelOptions],
    },
    font: {
      type: "select",
      label: "Font",
      options: fontOptions,
    },
    fontSize: {
      type: "number",
      label: "Size",
      min: 8,
      max: 200,
      step: 0.1,
    },
    textColor: {
      type: "text",
      label: "Text color",
    },
    lineHeight: {
      type: "number",
      label: "Line height",
      min: 0.5,
      max: 5,
      step: 0.1,
    },
    letterSpacing: {
      type: "number",
      label: "Letter spacing",
      min: -10,
      max: 50,
      step: 0.1,
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
    align: {
      type: "radio",
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    text: {
      type: "textarea",
      contentEditable: true,
    },
};

const HeadingInternal: ComponentConfig<Components["Heading"]> = {
  fields: headingFields,
  resolveData: (data, { changed }) => {
    const props = data.props || {};
    const next = { ...props };
    let updated = false;

    const level = normalizeHeadingLevel(next.level);
    if (level !== next.level) {
      next.level = level;
      updated = true;
    }

    if (next.fontSize == null || !Number.isFinite(Number(next.fontSize))) {
      next.fontSize = resolveHeadingFontSize(next);
      updated = true;
    }

    if (changed.level) {
      const mapped = HEADING_SIZE_BY_LEVEL[level];
      if (next.fontSize !== mapped) {
        next.fontSize = mapped;
        updated = true;
      }
    }

    if (!updated) {
      return {};
    }

    return { props: next };
  },
  resolveFields: (data) => {
    const props = data.props || {};
    const fields = { ...headingFields } as Record<string, unknown>;
    if (!props.addLink) {
      delete fields.linkHref;
      delete fields.openInNewWindow;
    }
    return fields as NonNullable<ComponentConfig<Components["Heading"]>["fields"]>;
  },
  defaultProps: {
    text: "Heading",
    level: 1,
    font: "",
    fontSize: 32,
    textColor: "#555",
    addLink: false,
    linkHref: "",
    openInNewWindow: false,
    align: "center",
    layout: {
      padding: "8px",
      ...defaultLayoutSpacing,
    },
  },
  render: ({
    align,
    text,
    level,
    font,
    fontSize,
    textColor,
    lineHeight,
    letterSpacing,
    addLink,
    linkHref,
    openInNewWindow,
    puck,
  }) => {
    const resolvedLevel = normalizeHeadingLevel(level);
    const resolvedFontSize = resolveHeadingFontSize({ fontSize, level });

    const HeadingTag =
      `h${resolvedLevel}` as keyof React.JSX.IntrinsicElements;

    const headingStyle: CSSProperties = {
      margin: 0,
      fontWeight: 600,
      fontFamily: font?.trim() ? font : "inherit",
      fontSize: `${resolvedFontSize}px`,
      color: textColor || undefined,
      ...(lineHeight != null && Number.isFinite(lineHeight)
        ? { lineHeight }
        : {}),
      ...(letterSpacing != null && Number.isFinite(letterSpacing)
        ? { letterSpacing: `${letterSpacing}px` }
        : {}),
    };

    const inner = (
      <span
        style={{
          display: "block",
          textAlign: align,
          width: "100%",
        }}
      >
        {text}
      </span>
    );

    const content =
      addLink && linkHref?.trim() ? (
        <a
          href={puck.isEditing ? "#" : linkHref.trim()}
          target={openInNewWindow ? "_blank" : undefined}
          rel={openInNewWindow ? "noopener noreferrer" : undefined}
          onClick={puck.isEditing ? (e) => e.preventDefault() : undefined}
          style={{
            color: "inherit",
            textDecoration: "none",
            cursor: puck.isEditing ? "default" : "pointer",
          }}
        >
          {inner}
        </a>
      ) : (
        inner
      );

    return (
      <Section>
        <HeadingTag style={headingStyle}>{content}</HeadingTag>
      </Section>
    );
  },
};

export const Heading = withLayout(HeadingInternal);
