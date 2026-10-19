import type { CSSProperties } from "react";
import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import { onOffOptions } from "./button-field-groups";
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

const inlineNumber = (
  label: string,
  options: { min?: number; max?: number; step?: number },
) => ({
  type: "number" as const,
  label,
  inline: true,
  ...options,
});

const switchField = (label: string) => ({
  type: "radio" as const,
  label,
  options: [...onOffOptions],
  switch: true,
});

const headingMainFields = {
  level: {
    type: "select" as const,
    label: "Heading type",
    options: [...levelOptions],
  },
  font: {
    type: "select" as const,
    label: "Font",
    options: fontOptions,
  },
  fontSize: inlineNumber("Size", { min: 8, max: 200, step: 0.1 }),
  textColor: createPuckColorField("Text color", "#555555"),
  lineHeight: inlineNumber("Line height", { min: 0.5, max: 5, step: 0.1 }),
  letterSpacing: inlineNumber("Letter spacing", { min: -10, max: 50, step: 0.1 }),
  addLink: switchField("Add link"),
  linkHref: {
    type: "text" as const,
    label: "Add link",
    placeholder: "Link",
  },
  openInNewWindow: switchField("Open in new window"),
  align: {
    type: "radio" as const,
    label: "Alignment",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
  text: {
    type: "textarea" as const,
    contentEditable: true,
  },
};

const headingFields = {
  main: {
    type: "object" as const,
    label: "Main",
    defaultOpen: true,
    objectFields: headingMainFields,
  },
} as ComponentConfig<Components["Heading"]>["fields"];

const defaultHeadingMain: Components["Heading"]["main"] = {
  text: "Heading",
  level: 1,
  font: "",
  fontSize: 32,
  textColor: "#555",
  addLink: false,
  linkHref: "",
  openInNewWindow: false,
  align: "center",
};

const HeadingInternal: ComponentConfig<Components["Heading"]> = {
  fields: headingFields,
  resolveData: (data, { lastData }) => {
    const props = data.props || {};
    const source = props.main ?? defaultHeadingMain;
    const nextMain = { ...source };
    let updated = !props.main;

    const level = normalizeHeadingLevel(nextMain.level);
    if (level !== nextMain.level) {
      nextMain.level = level;
      updated = true;
    }

    if (nextMain.fontSize == null || !Number.isFinite(Number(nextMain.fontSize))) {
      nextMain.fontSize = resolveHeadingFontSize(nextMain);
      updated = true;
    }

    const previousLevel = lastData?.props?.main?.level;
    if (previousLevel != null && normalizeHeadingLevel(previousLevel) !== level) {
      const mapped = HEADING_SIZE_BY_LEVEL[level];
      if (nextMain.fontSize !== mapped) {
        nextMain.fontSize = mapped;
        updated = true;
      }
    }

    if (!updated) return {};

    return {
      props: {
        ...props,
        main: nextMain,
      },
    };
  },
  resolveFields: (data) => {
    const main = data.props?.main;
    const objectFields = { ...headingMainFields } as Record<string, unknown>;
    if (!main?.addLink) {
      delete objectFields.linkHref;
      delete objectFields.openInNewWindow;
    }
    return {
      main: {
        type: "object" as const,
        label: "Main",
        defaultOpen: true,
        objectFields,
      },
    } as NonNullable<ComponentConfig<Components["Heading"]>["fields"]>;
  },
  defaultProps: {
    main: { ...defaultHeadingMain },
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
  render: (props) => {
    const main = props.main ?? defaultHeadingMain;
    const {
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
    } = main;
    const puck = props.puck;
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
