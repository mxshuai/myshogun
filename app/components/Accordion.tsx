import React, { useEffect, useMemo, useState } from "react";
import type { ComponentConfig, ObjectField, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";
import "./accordion.css";

type AccordionItem = {
  title: string;
  open: boolean;
  content: Slot;
};

type AccordionProps = Components["Accordion"];

function deriveEffectiveOpen(items: AccordionItem[], onlyOneOpen: boolean) {
  const openMap = items.map((it) => Boolean(it?.open));
  if (!onlyOneOpen) return openMap;

  // 只允许第一个被标记为 open 的面板处于展开状态
  const firstIndex = openMap.findIndex(Boolean);
  return openMap.map((_, idx) => idx === firstIndex);
}

function getItemTitle(index: number, item: Partial<AccordionItem> | undefined) {
  return item?.title?.trim() ? item.title : `Accordion ${index + 1}`;
}

function renderOpenIcon({
  open,
  openIcon,
}: {
  open: boolean;
  openIcon: AccordionProps["openIcon"];
}) {
  if (openIcon === "none") return null;

  if (openIcon === "chevron") {
    return (
      <span
        className={`visbuild-accordion-icon visbuild-accordion-icon--chevron${
          open ? " visbuild-accordion-icon--chevron-open" : ""
        }`}
        aria-hidden="true"
      >
        {">"}
      </span>
    );
  }

  // openIcon === "plus"
  return (
    <span
      className={`visbuild-accordion-icon visbuild-accordion-icon--plus${
        open ? " visbuild-accordion-icon--plus-open" : ""
      }`}
      aria-hidden="true"
    >
      +
    </span>
  );
}

const fontOptions = TEXT_FONT_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

const paneHeaderTextFieldGroup: ObjectField<AccordionProps["paneHeaderText"]> = {
  type: "object",
  label: "Pane header text",
  objectFields: {
    headerFont: {
      type: "select",
      label: "Font",
      options: fontOptions,
    },
    headerSize: {
      type: "number",
      label: "Size",
      min: 8,
      max: 72,
    },
    headerTextAlignment: {
      type: "radio",
      label: "Text alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
    headingPadding: {
      type: "number",
      label: "Heading padding",
      min: 0,
      max: 48,
    },
  },
};

const colorsFieldGroup: ObjectField<AccordionProps["colors"]> = {
  type: "object",
  label: "Colors",
  objectFields: {
    headerBackgroundColor: createPuckColorField("Header background", "#f5f5f5"),
    headerTextColor: createPuckColorField("Header text", "#8FCEE7"),
    innerBackgroundColor: createPuckColorField("Inner background", "#ffffff"),
    borderColor: createPuckColorField("Border", "#dddddd"),
  },
};

const accordionFields = {
  items: {
    type: "array" as const,
    label: "Manage accordion sections",
    arrayFields: {
      title: {
        type: "text" as const,
        label: "Title",
      },
      open: {
        type: "radio" as const,
        label: "Open",
        options: [
          { label: "true", value: true },
          { label: "false", value: false },
        ],
      },
      content: {
        type: "slot" as const,
        label: "Content",
      },
    },
    defaultItemProps: (index: number) => ({
      title: `Accordion ${index + 1}`,
      open: false,
      content: [],
    }),
    getItemSummary: (item: { title?: string }, index: number) =>
      item?.title?.trim() || `Accordion ${index + 1}`,
  },
  onlyOneOpen: {
    type: "radio" as const,
    label: "Only one pane open",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  openIcon: {
    type: "radio" as const,
    label: "Open icon",
    options: [
      { label: "None", value: "none" },
      { label: "Chevron", value: "chevron" },
      { label: "Plus", value: "plus" },
    ],
  },
  paneHeaderText: paneHeaderTextFieldGroup,
  colors: colorsFieldGroup,
} as ComponentConfig<AccordionProps>["fields"];

const AccordionInternal: ComponentConfig<AccordionProps> = {
  fields: accordionFields,
  defaultProps: {
    items: [
      {
        title: "Accordion 1",
        open: true,
        content: [],
      },
    ],
    onlyOneOpen: true,
    openIcon: "none",
    paneHeaderText: {
      headerFont: "",
      headerSize: 16,
      headerTextAlignment: "left",
      headingPadding: 10,
    },
    colors: {
      headerBackgroundColor: "#f5f5f5",
      headerTextColor: "#8FCEE7",
      innerBackgroundColor: "#ffffff",
      borderColor: "#dddddd",
    },
  },
  render: ({
    items,
    onlyOneOpen,
    openIcon,
    paneHeaderText,
    colors,
    puck,
  }) => {
    const {
      headerFont = "",
      headerSize = 16,
      headerTextAlignment = "left",
      headingPadding = 10,
    } = paneHeaderText ?? {};
    const {
      headerBackgroundColor = "#f5f5f5",
      headerTextColor = "#8FCEE7",
      innerBackgroundColor = "#ffffff",
      borderColor = "#dddddd",
    } = colors ?? {};
    const safeItems = (items ?? []) as unknown as AccordionItem[];
    const contentOpenMapFromProps = useMemo(
      () => deriveEffectiveOpen(safeItems, Boolean(onlyOneOpen)),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [safeItems, onlyOneOpen]
    );

    const [internalOpenMap, setInternalOpenMap] = useState<boolean[]>(
      contentOpenMapFromProps
    );
    const [contentAnimationKeys, setContentAnimationKeys] = useState<
      Record<number, number>
    >({});

    useEffect(() => {
      // 进入预览/离开编辑时，用 props 中的 open 状态重新初始化
      if (!puck?.isEditing) {
        setInternalOpenMap(contentOpenMapFromProps);
      }
    }, [contentOpenMapFromProps, puck?.isEditing]);

    const effectiveOpenMap = puck?.isEditing ? contentOpenMapFromProps : internalOpenMap;

    const borderStyle: React.CSSProperties = useMemo(
      () => ({
        border: `1px solid ${borderColor}`,
        borderRadius: 6,
        overflow: "hidden",
        background: "transparent",
      }),
      [borderColor]
    );

    const headerBaseStyle: React.CSSProperties = useMemo(
      () => ({
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: `${headingPadding}px`,
        backgroundColor: headerBackgroundColor,
        color: headerTextColor,
        fontFamily: headerFont || "inherit",
        fontSize: `${headerSize}px`,
        fontWeight: 600,
        textAlign: headerTextAlignment,
        cursor: puck?.isEditing ? "default" : "pointer",
        userSelect: "none",
      }),
      [
        headingPadding,
        headerBackgroundColor,
        headerTextColor,
        headerFont,
        headerSize,
        headerTextAlignment,
        puck?.isEditing,
      ]
    );

    const bumpContentAnimation = (index: number) => {
      setContentAnimationKeys((prev) => ({
        ...prev,
        [index]: (prev[index] || 0) + 1,
      }));
    };

    const toggleItem = (index: number) => {
      setInternalOpenMap((prev) => {
        let next: boolean[];
        if (!onlyOneOpen) {
          next = [...prev];
          next[index] = !next[index];
        } else if (prev[index]) {
          next = prev.map(() => false);
        } else {
          next = prev.map((_, idx) => idx === index);
        }

        if (next[index]) {
          bumpContentAnimation(index);
        }

        return next;
      });
    };

    if (!safeItems || safeItems.length === 0) {
      return <Section>No panes defined</Section>;
    }

    return (
      <Section>
        <div style={borderStyle}>
          {safeItems.map((item, index) => {
            const isOpen = Boolean(effectiveOpenMap[index]);
            const title = getItemTitle(index, item);
            return (
              <div key={`accordion-pane-${index}`}>
                <div
                  style={{
                    ...headerBaseStyle,
                    borderBottom:
                      index === safeItems.length - 1 ? "none" : `1px solid ${borderColor}`,
                  }}
                  onClick={() => {
                    if (puck?.isEditing) return;
                    toggleItem(index);
                  }}
                >
                  <div style={{ flex: 1, textAlign: headerTextAlignment }}>
                    {title}
                  </div>
                  {renderOpenIcon({ open: isOpen, openIcon })}
                </div>

                <div
                  className={`visbuild-accordion-content-panel${
                    isOpen ? " visbuild-accordion-content-panel--open" : ""
                  }`}
                  style={{
                    backgroundColor: innerBackgroundColor,
                    padding: isOpen ? `0 ${headingPadding}px` : "0",
                    borderBottom:
                      index === safeItems.length - 1
                        ? "none"
                        : `1px solid ${borderColor}`,
                  }}
                >
                  {isOpen ? (
                    <div
                      key={`accordion-content-inner-${index}-${
                        contentAnimationKeys[index] || 0
                      }`}
                      className="visbuild-accordion-content-inner"
                    >
                      {React.createElement(item.content as any, {
                        key: `accordion-content-${index}`,
                        disallow: ["Accordion"],
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    );
  },
};

export const Accordion = withLayout(AccordionInternal);

