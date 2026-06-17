import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ComponentConfig, ObjectField, Slot } from "@puckeditor/core";
import { registerOverlayPortal, useGetPuck } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";
import {
  ACCORDION_CARET_FA_CLASS,
  ACCORDION_PLUS_FA_CLASS,
  clampCurrentAccordionIndex,
} from "./accordion-styles";
import "./accordion.css";

type AccordionItem = {
  title: string;
  open: boolean;
  content: Slot;
};

type AccordionProps = Components["Accordion"];

type AccordionViewProps = {
  id?: string;
  items: AccordionProps["items"];
  currentAccordionIndex?: number;
  onlyOneOpen: boolean;
  openIcon: AccordionProps["openIcon"];
  paneHeaderText: AccordionProps["paneHeaderText"];
  colors: AccordionProps["colors"];
  isEditing: boolean;
  effectiveOpenMap: boolean[];
  contentAnimationKeys: Record<number, number>;
  onHeaderClick: (index: number, e: React.MouseEvent) => void;
};

function deriveEffectiveOpen(items: AccordionItem[], onlyOneOpen: boolean) {
  const openMap = items.map((it) => Boolean(it?.open));
  if (!onlyOneOpen) return openMap;

  const firstIndex = openMap.findIndex(Boolean);
  return openMap.map((_, idx) => idx === firstIndex);
}

function getItemTitle(index: number, title?: string) {
  return title?.trim() ? title : `Accordion ${index + 1}`;
}

/** 编辑态 title 可能为 Puck InlineTextField（ReactNode）；预览/导出仍为 string */
function renderItemTitle(
  title: unknown,
  index: number,
  isEditing: boolean,
): ReactNode {
  if (isEditing) {
    if (title != null && typeof title !== "string") {
      return title as ReactNode;
    }
    return getItemTitle(index, title as string | undefined);
  }
  return getItemTitle(index, typeof title === "string" ? title : undefined);
}

function isInlineEditableTarget(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null;
  while (el) {
    const ce = el.getAttribute("contenteditable");
    if (ce === "true" || ce === "plaintext-only") return true;
    el = el.parentElement;
  }
  return false;
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
        className={`visbuild-accordion-icon visbuild-accordion-icon--caret${
          open ? " visbuild-accordion-icon--open" : ""
        }`}
        aria-hidden="true"
      >
        <i className={ACCORDION_CARET_FA_CLASS} />
      </span>
    );
  }

  return (
    <span
      className={`visbuild-accordion-icon visbuild-accordion-icon--plus${
        open ? " visbuild-accordion-icon--open" : ""
      }`}
      aria-hidden="true"
    >
      <i className={ACCORDION_PLUS_FA_CLASS} />
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
        contentEditable: true,
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
    getItemSummary: (item: { title?: unknown }, index: number) =>
      getItemTitle(
        index,
        typeof item?.title === "string" ? item.title : undefined,
      ),
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

function AccordionHeader({
  index,
  isEditing,
  style,
  textAlign,
  title,
  isOpen,
  openIcon,
  onHeaderClick,
}: {
  index: number;
  isEditing: boolean;
  style: React.CSSProperties;
  textAlign: React.CSSProperties["textAlign"];
  title: ReactNode;
  isOpen: boolean;
  openIcon: AccordionProps["openIcon"];
  onHeaderClick: (index: number, e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    return registerOverlayPortal(ref.current);
  }, [isEditing, isOpen, title]);

  return (
    <div
      ref={ref}
      style={{ ...style, cursor: "pointer" }}
      onClick={(e) => {
        if (isEditing && isInlineEditableTarget(e.target)) return;
        onHeaderClick(index, e);
      }}
    >
      <div style={{ flex: 1, textAlign }}>{title}</div>
      {renderOpenIcon({ open: isOpen, openIcon })}
    </div>
  );
}

function AccordionView({
  items,
  onlyOneOpen,
  openIcon,
  paneHeaderText,
  colors,
  isEditing,
  effectiveOpenMap,
  contentAnimationKeys,
  onHeaderClick,
}: AccordionViewProps) {
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

  const borderStyle: React.CSSProperties = useMemo(
    () => ({
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      overflow: "hidden",
      background: "transparent",
    }),
    [borderColor],
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
      userSelect: "none",
    }),
    [
      headingPadding,
      headerBackgroundColor,
      headerTextColor,
      headerFont,
      headerSize,
      headerTextAlignment,
    ],
  );

  if (!safeItems || safeItems.length === 0) {
    return <Section>No panes defined</Section>;
  }

  return (
    <Section>
      <div style={borderStyle}>
        {safeItems.map((item, index) => {
          const isOpen = Boolean(effectiveOpenMap[index]);
          return (
            <div key={`accordion-pane-${index}`}>
              <AccordionHeader
                index={index}
                isEditing={isEditing}
                style={{
                  ...headerBaseStyle,
                  borderBottom:
                    index === safeItems.length - 1
                      ? "none"
                      : `1px solid ${borderColor}`,
                }}
                textAlign={headerTextAlignment}
                title={renderItemTitle(item.title, index, isEditing)}
                isOpen={isOpen}
                openIcon={openIcon}
                onHeaderClick={onHeaderClick}
              />

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
}

function buildEditingOpenMap(
  items: AccordionItem[],
  onlyOneOpen: boolean,
  currentAccordionIndex: number | undefined,
) {
  const itemCount = items.length;
  const editingIndex =
    itemCount > 0
      ? clampCurrentAccordionIndex(currentAccordionIndex, itemCount) - 1
      : 0;
  const base = deriveEffectiveOpen(items, onlyOneOpen);
  if (itemCount === 0) return base;
  if (base[editingIndex]) return base;
  const next = [...base];
  next[editingIndex] = true;
  return next;
}

/** Only mounted inside <Puck> editor — may call useGetPuck. */
function AccordionEditor(
  props: Omit<
    AccordionViewProps,
    "isEditing" | "effectiveOpenMap" | "contentAnimationKeys" | "onHeaderClick"
  >,
) {
  const getPuck = useGetPuck();
  const safeItems = (props.items ?? []) as unknown as AccordionItem[];
  const itemCount = safeItems.length;
  const [contentAnimationKeys, setContentAnimationKeys] = useState<
    Record<number, number>
  >({});

  const effectiveOpenMap = useMemo(
    () =>
      buildEditingOpenMap(
        safeItems,
        Boolean(props.onlyOneOpen),
        props.currentAccordionIndex,
      ),
    [safeItems, props.onlyOneOpen, props.currentAccordionIndex],
  );

  const onHeaderClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.id) return;
    const nextIndex = clampCurrentAccordionIndex(index + 1, itemCount);
    if (
      nextIndex === clampCurrentAccordionIndex(props.currentAccordionIndex, itemCount)
    ) {
      return;
    }
    const puckApi = getPuck();
    const item = puckApi.getItemById(props.id);
    const selector = puckApi.getSelectorForId(props.id);
    if (!item || !selector) return;
    puckApi.dispatch({
      type: "replace",
      data: {
        ...item,
        props: {
          ...item.props,
          currentAccordionIndex: nextIndex,
        },
      },
      destinationIndex: selector.index,
      destinationZone: selector.zone,
    });
    setContentAnimationKeys((prev) => ({
      ...prev,
      [index]: (prev[index] || 0) + 1,
    }));
  };

  return (
    <AccordionView
      {...props}
      isEditing
      effectiveOpenMap={effectiveOpenMap}
      contentAnimationKeys={contentAnimationKeys}
      onHeaderClick={onHeaderClick}
    />
  );
}

function AccordionPreview(
  props: Omit<
    AccordionViewProps,
    "isEditing" | "effectiveOpenMap" | "contentAnimationKeys" | "onHeaderClick"
  >,
) {
  const safeItems = (props.items ?? []) as unknown as AccordionItem[];
  const contentOpenMapFromProps = useMemo(
    () => deriveEffectiveOpen(safeItems, Boolean(props.onlyOneOpen)),
    [safeItems, props.onlyOneOpen],
  );
  const [internalOpenMap, setInternalOpenMap] = useState<boolean[]>(
    contentOpenMapFromProps,
  );
  const [contentAnimationKeys, setContentAnimationKeys] = useState<
    Record<number, number>
  >({});

  useEffect(() => {
    setInternalOpenMap(contentOpenMapFromProps);
  }, [contentOpenMapFromProps]);

  const bumpContentAnimation = (index: number) => {
    setContentAnimationKeys((prev) => ({
      ...prev,
      [index]: (prev[index] || 0) + 1,
    }));
  };

  const onHeaderClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalOpenMap((prev) => {
      let next: boolean[];
      if (!props.onlyOneOpen) {
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

  return (
    <AccordionView
      {...props}
      isEditing={false}
      effectiveOpenMap={internalOpenMap}
      contentAnimationKeys={contentAnimationKeys}
      onHeaderClick={onHeaderClick}
    />
  );
}

const AccordionInternal: ComponentConfig<AccordionProps> = {
  fields: accordionFields,
  resolveData: (data) => {
    const props = data.props || {};
    const items = props.items ?? [];
    let itemsChanged = false;
    const normalizedItems = items.map((item, index) => {
      if (typeof item?.title !== "string") return item;
      const trimmed = item.title.trim();
      if (trimmed) return item;
      itemsChanged = true;
      return { ...item, title: getItemTitle(index, item.title) };
    });
    const itemCount = Math.max(1, normalizedItems.length);
    const clamped = clampCurrentAccordionIndex(
      props.currentAccordionIndex,
      itemCount,
    );
    if (itemsChanged || clamped !== props.currentAccordionIndex) {
      return {
        props: {
          ...props,
          items: normalizedItems,
          currentAccordionIndex: clamped,
        },
      };
    }
    return {};
  },
  defaultProps: {
    currentAccordionIndex: 1,
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
  render: (props) => {
    const viewProps = {
      id: props.id,
      items: props.items,
      currentAccordionIndex: props.currentAccordionIndex,
      onlyOneOpen: props.onlyOneOpen,
      openIcon: props.openIcon,
      paneHeaderText: props.paneHeaderText,
      colors: props.colors,
    };

    if (props.puck?.isEditing) {
      return <AccordionEditor {...viewProps} />;
    }

    return <AccordionPreview {...viewProps} />;
  },
};

export const Accordion = withLayout(AccordionInternal);
