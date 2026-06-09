import React, { useEffect, useMemo, useState } from "react";
import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

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
  return item?.title?.trim() ? item.title : `Pane ${index + 1}`;
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
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          marginLeft: 8,
          transform: `rotate(${open ? 90 : 0}deg)`,
          transition: "transform 0.2s ease",
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {">"}
      </span>
    );
  }

  // openIcon === "plus"
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        marginLeft: 8,
        userSelect: "none",
        fontWeight: 700,
      }}
      aria-hidden="true"
    >
      {open ? "-" : "+"}
    </span>
  );
}

const AccordionInternal: ComponentConfig<AccordionProps> = {
  fields: {
    items: {
      type: "array",
      label: "Manage accordion sections",
      arrayFields: {
        title: {
          type: "text",
          label: "Title",
        },
        open: {
          type: "radio",
          label: "Open",
          options: [
            { label: "true", value: true },
            { label: "false", value: false },
          ],
        },
        content: {
          type: "slot",
          label: "Content",
        },
      },
    },
    onlyOneOpen: {
      type: "radio",
      label: "Only one pane open",
      options: [
        { label: "true", value: true },
        { label: "false", value: false },
      ],
    },
    openIcon: {
      type: "radio",
      label: "Open icon",
      options: [
        { label: "None", value: "none" },
        { label: "Chevron", value: "chevron" },
        { label: "Plus", value: "plus" },
      ],
    },
    headerFont: {
      type: "text",
      label: "Font",
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
    headerBackgroundColor: {
      type: "text",
      label: "Header background",
    },
    headerTextColor: {
      type: "text",
      label: "Header text",
    },
    innerBackgroundColor: {
      type: "text",
      label: "Inner background",
    },
    borderColor: {
      type: "text",
      label: "Border",
    },
  },
  defaultProps: {
    items: [
      {
        title: "Pane 1",
        open: true,
        content: [],
      },
    ],
    onlyOneOpen: true,
    openIcon: "chevron",
    headerFont: "",
    headerSize: 16,
    headerTextAlignment: "left",
    headingPadding: 10,
    headerBackgroundColor: "#f5f5f5",
    headerTextColor: "#000000",
    innerBackgroundColor: "#ffffff",
    borderColor: "#dddddd",
  },
  render: ({
    items,
    onlyOneOpen,
    openIcon,
    headerFont,
    headerSize,
    headerTextAlignment,
    headingPadding,
    headerBackgroundColor,
    headerTextColor,
    innerBackgroundColor,
    borderColor,
    puck,
  }) => {
    const safeItems = (items ?? []) as unknown as AccordionItem[];
    const contentOpenMapFromProps = useMemo(
      () => deriveEffectiveOpen(safeItems, Boolean(onlyOneOpen)),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [safeItems, onlyOneOpen]
    );

    const [internalOpenMap, setInternalOpenMap] = useState<boolean[]>(
      contentOpenMapFromProps
    );

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

    const toggleItem = (index: number) => {
      setInternalOpenMap((prev) => {
        if (!onlyOneOpen) {
          const next = [...prev];
          next[index] = !next[index];
          return next;
        }

        return prev.map((_, idx) => idx === index);
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

                {isOpen ? (
                  <div
                    style={{
                      backgroundColor: innerBackgroundColor,
                      padding: `${headingPadding}px`,
                      borderBottom:
                        index === safeItems.length - 1 ? "none" : `1px solid ${borderColor}`,
                    }}
                  >
                    {React.createElement(item.content as any, {
                      key: `accordion-content-${index}`,
                      disallow: ["Accordion"],
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>
    );
  },
};

export const Accordion = withLayout(AccordionInternal);

