import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ComponentConfig, ObjectField } from "@puckeditor/core";
import { registerOverlayPortal, useGetPuck } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";
import {
  buildTabButtonStyle,
  clampActiveTabIndex,
  computeTabsTrailSegments,
  DEFAULT_ACTIVE_TAB_COLOR_GROUP,
  DEFAULT_TAB_COLOR_GROUP,
  TAB_CONTENT_PADDING,
  tabsTrailBorderColor,
  type TabColorGroup,
} from "./tabs-styles";
import "./tabs.css";

export type Tab = {
  id: string;
  title: string;
  content: Components["Tabs"]["tabs"][number]["content"];
};

type TabsProps = Components["Tabs"];

type TabsViewProps = {
  id?: string;
  tabs: TabsProps["tabs"];
  activeTabIndex?: number;
  theme: TabsProps["theme"];
  borderColor: string;
  borderThickness: number;
  font: string;
  fontSize: number;
  defaultColor?: TabsProps["defaultColor"];
  activeColors?: TabsProps["activeColors"];
  isEditing: boolean;
  effectiveActiveTab: number;
  onSelectTab: (index: number, e: React.MouseEvent) => void;
};

function getTabTitle(index: number, title?: string) {
  return title?.trim() ? title : `Tab ${index + 1}`;
}

/** 编辑态 title 可能为 Puck InlineTextField（ReactNode）；预览/导出仍为 string */
function renderTabTitle(
  title: unknown,
  index: number,
  isEditing: boolean,
): ReactNode {
  if (isEditing) {
    if (title != null && typeof title !== "string") {
      return title as ReactNode;
    }
    return getTabTitle(index, title as string | undefined);
  }
  return getTabTitle(index, typeof title === "string" ? title : undefined);
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

const fontOptions = TEXT_FONT_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

const defaultColorField: ObjectField<TabColorGroup> = {
  type: "object",
  label: "Default Color",
  objectFields: {
    backgroundColor: createPuckColorField("Background", "#F4F4F4"),
    textColor: createPuckColorField("Text", "#555555"),
  },
};

const activeColorsField: ObjectField<TabColorGroup> = {
  type: "object",
  label: "Active colors",
  objectFields: {
    backgroundColor: createPuckColorField("Background", "#ffffff"),
    textColor: createPuckColorField("Text", "#50b3da"),
  },
};

const tabsFields = {
  tabs: {
    type: "array" as const,
    label: "Manage tabs",
    arrayFields: {
      title: {
        type: "text" as const,
        label: "Title",
        contentEditable: true,
      },
      content: {
        type: "slot" as const,
        label: "Content",
      },
    },
    defaultItemProps: (index: number) => ({
      title: `Tab ${index + 1}`,
      content: [],
    }),
    getItemSummary: (item: { title?: unknown }, index: number) =>
      getTabTitle(
        index,
        typeof item?.title === "string" ? item.title : undefined,
      ),
  },
  theme: {
    type: "radio" as const,
    label: "Theme",
    options: [
      { label: "Rectangular", value: "rectangular" },
      { label: "Sloped", value: "sloped" },
      { label: "Stretch", value: "stretch" },
    ],
  },
  borderColor: createPuckColorField("Border color", "#dddddd"),
  borderThickness: {
    type: "number" as const,
    label: "Border thickness",
    min: 0,
    max: 10,
  },
  font: {
    type: "select" as const,
    label: "Font",
    options: fontOptions,
  },
  fontSize: {
    type: "number" as const,
    label: "Size",
    min: 8,
    max: 72,
  },
  defaultColor: defaultColorField,
  activeColors: activeColorsField,
} as ComponentConfig<TabsProps>["fields"];

function TabHeader({
  index,
  isActive,
  isEditing,
  style,
  onSelect,
  setButtonRef,
  children,
}: {
  index: number;
  isActive: boolean;
  isEditing: boolean;
  style: React.CSSProperties;
  onSelect: (index: number, e: React.MouseEvent) => void;
  setButtonRef: (index: number, el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    return registerOverlayPortal(ref.current);
  }, [isEditing, isActive, children]);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        setButtonRef(index, el);
      }}
      role="tab"
      aria-selected={isActive}
      style={{ ...style, cursor: "pointer" }}
      onClick={(e) => {
        if (isEditing && isInlineEditableTarget(e.target)) return;
        onSelect(index, e);
      }}
    >
      {children}
    </div>
  );
}

function TabsView({
  tabs,
  theme,
  borderColor,
  borderThickness,
  font,
  fontSize,
  defaultColor,
  activeColors,
  isEditing,
  effectiveActiveTab,
  onSelectTab,
}: TabsViewProps) {
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [trail, setTrail] = useState({
    left: { width: 0 },
    right: { left: 0, width: 0 },
  });

  const tabCount = tabs?.length ?? 0;

  const resolvedDefault: TabColorGroup = {
    backgroundColor:
      defaultColor?.backgroundColor ?? DEFAULT_TAB_COLOR_GROUP.backgroundColor,
    textColor: defaultColor?.textColor ?? DEFAULT_TAB_COLOR_GROUP.textColor,
  };
  const resolvedActive: TabColorGroup = {
    backgroundColor:
      activeColors?.backgroundColor ??
      DEFAULT_ACTIVE_TAB_COLOR_GROUP.backgroundColor,
    textColor:
      activeColors?.textColor ?? DEFAULT_ACTIVE_TAB_COLOR_GROUP.textColor,
  };

  const trailColor = tabsTrailBorderColor(borderColor);
  const showTrails =
    tabCount > 0 && theme !== "sloped" && borderThickness > 0;

  useLayoutEffect(() => {
    if (!showTrails) {
      setTrail({
        left: { width: 0 },
        right: { left: 0, width: 0 },
      });
      return;
    }
    const bar = tabBarRef.current;
    const activeEl = tabButtonRefs.current[effectiveActiveTab];
    if (!bar || !activeEl) return;
    const barRect = bar.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const activeLeft = activeRect.left - barRect.left;
    const activeRight = activeRect.right - barRect.left;
    const segments = computeTabsTrailSegments(
      barRect.width,
      activeLeft,
      activeRight,
    );
    setTrail({
      left: {
        width: effectiveActiveTab > 0 ? segments.left.width : 0,
      },
      right: {
        left: segments.right.left,
        width: effectiveActiveTab < tabCount - 1 ? segments.right.width : 0,
      },
    });
  }, [
    showTrails,
    effectiveActiveTab,
    tabCount,
    theme,
    borderThickness,
    fontSize,
    font,
  ]);

  if (tabCount === 0) {
    return <Section>No tabs defined</Section>;
  }

  const contentStyle: React.CSSProperties = {
    borderTop:
      theme === "sloped"
        ? `${borderThickness}px solid ${borderColor}`
        : "none",
    padding: TAB_CONTENT_PADDING,
    backgroundColor: resolvedActive.backgroundColor,
    borderRadius: "0 0 8px 8px",
  };

  return (
    <Section>
      <div>
        <div
          ref={tabBarRef}
          style={{
            position: "relative",
            display: "flex",
            gap: "4px",
            alignItems: "flex-end",
            width: "100%",
          }}
        >
          {tabs.map((tab, index) => (
            <TabHeader
              key={`tab-${index}`}
              index={index}
              isActive={index === effectiveActiveTab}
              isEditing={isEditing}
              setButtonRef={(i, el) => {
                tabButtonRefs.current[i] = el;
              }}
              onSelect={onSelectTab}
              style={buildTabButtonStyle({
                theme,
                isActive: index === effectiveActiveTab,
                borderColor,
                borderThickness,
                font,
                fontSize,
                defaultColor: resolvedDefault,
                activeColors: resolvedActive,
              })}
            >
              {renderTabTitle(tab.title, index, isEditing)}
            </TabHeader>
          ))}
          {showTrails && trail.left.width > 0 ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                width: trail.left.width,
                height: borderThickness,
                backgroundColor: trailColor,
                pointerEvents: "none",
              }}
            />
          ) : null}
          {showTrails && trail.right.width > 0 ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                bottom: 0,
                left: trail.right.left,
                width: trail.right.width,
                height: borderThickness,
                backgroundColor: trailColor,
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>

        <div style={contentStyle}>
          {tabs.map((tab, index) => {
            if (index !== effectiveActiveTab) return null;
            const TabContent = tab.content;
            return (
              <div
                key={`tab-content-panel-${index}`}
                className="visbuild-tabs-content-panel"
              >
                {TabContent ? <TabContent /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/** Only mounted inside <Puck> editor — may call useGetPuck. */
function TabsEditor(
  props: Omit<TabsViewProps, "effectiveActiveTab" | "onSelectTab" | "isEditing">,
) {
  const getPuck = useGetPuck();
  const tabCount = props.tabs?.length ?? 0;
  const editingIndex =
    tabCount > 0
      ? clampActiveTabIndex(props.activeTabIndex, tabCount) - 1
      : 0;

  const onSelectTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!props.id) return;
    const puckApi = getPuck();
    const item = puckApi.getItemById(props.id);
    const selector = puckApi.getSelectorForId(props.id);
    if (!item || !selector) return;
    const nextIndex = clampActiveTabIndex(index + 1, tabCount);
    if (nextIndex === clampActiveTabIndex(props.activeTabIndex, tabCount)) {
      return;
    }
    puckApi.dispatch({
      type: "replace",
      data: {
        ...item,
        props: {
          ...item.props,
          activeTabIndex: nextIndex,
        },
      },
      destinationIndex: selector.index,
      destinationZone: selector.zone,
    });
  };

  return (
    <TabsView
      {...props}
      isEditing
      effectiveActiveTab={editingIndex}
      onSelectTab={onSelectTab}
    />
  );
}

function TabsPreview(props: Omit<TabsViewProps, "effectiveActiveTab" | "onSelectTab" | "isEditing">) {
  const [internalActiveTab, setInternalActiveTab] = useState(0);

  const onSelectTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalActiveTab(index);
  };

  return (
    <TabsView
      {...props}
      isEditing={false}
      effectiveActiveTab={internalActiveTab}
      onSelectTab={onSelectTab}
    />
  );
}

const TabsInternal: ComponentConfig<TabsProps> = {
  fields: tabsFields,
  resolveData: (data) => {
    const props = data.props || {};
    const tabs = props.tabs ?? [];
    let tabsChanged = false;
    const normalizedTabs = tabs.map((tab, index) => {
      if (typeof tab?.title !== "string") return tab;
      const trimmed = tab.title.trim();
      if (trimmed) return tab;
      tabsChanged = true;
      return { ...tab, title: getTabTitle(index, tab.title) };
    });
    const tabCount = Math.max(1, normalizedTabs.length);
    const clamped = clampActiveTabIndex(props.activeTabIndex, tabCount);
    if (tabsChanged || clamped !== props.activeTabIndex) {
      return {
        props: {
          ...props,
          tabs: normalizedTabs,
          activeTabIndex: clamped,
        },
      };
    }
    return {};
  },
  defaultProps: {
    activeTabIndex: 1,
    tabs: [{ title: "Tab 1", content: [] }],
    theme: "stretch",
    borderColor: "#dddddd",
    borderThickness: 1,
    font: "",
    fontSize: 16,
    defaultColor: { ...DEFAULT_TAB_COLOR_GROUP },
    activeColors: { ...DEFAULT_ACTIVE_TAB_COLOR_GROUP },
  },
  render: (props) => {
    const viewProps: Omit<TabsViewProps, "effectiveActiveTab" | "onSelectTab" | "isEditing"> = {
      id: props.id,
      tabs: props.tabs,
      activeTabIndex: props.activeTabIndex,
      theme: props.theme,
      borderColor: props.borderColor,
      borderThickness: props.borderThickness,
      font: props.font,
      fontSize: props.fontSize,
      defaultColor: props.defaultColor,
      activeColors: props.activeColors,
    };

    if (props.puck?.isEditing) {
      return <TabsEditor {...viewProps} />;
    }

    return <TabsPreview {...viewProps} />;
  },
};

export const Tabs = withLayout(TabsInternal);
