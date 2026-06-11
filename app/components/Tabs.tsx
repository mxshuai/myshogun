import { useLayoutEffect, useRef, useState } from "react";
import type { ComponentConfig, ObjectField } from "@puckeditor/core";
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
  activeTabIndex: {
    type: "number" as const,
    label: "Active Tab Index (for editing)",
    min: 1,
    max: 1,
  },
  tabs: {
    type: "array" as const,
    label: "Manage tabs",
    arrayFields: {
      title: {
        type: "text" as const,
        label: "Title",
      },
      content: {
        type: "slot" as const,
        label: "Content",
      },
    },
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

const TabsInternal: ComponentConfig<TabsProps> = {
  fields: tabsFields,
  resolveData: (data) => {
    const props = data.props || {};
    const tabCount = Math.max(1, props.tabs?.length ?? 1);
    const clamped = clampActiveTabIndex(props.activeTabIndex, tabCount);
    if (clamped !== props.activeTabIndex) {
      return { props: { ...props, activeTabIndex: clamped } };
    }
    return {};
  },
  resolveFields: (data) => {
    const tabCount = Math.max(1, data.props?.tabs?.length ?? 1);
    return {
      ...tabsFields,
      activeTabIndex: {
        type: "number" as const,
        label: "Active Tab Index (for editing)",
        min: 1,
        max: tabCount,
      },
    } as NonNullable<ComponentConfig<TabsProps>["fields"]>;
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
  render: ({
    tabs,
    activeTabIndex,
    theme,
    borderColor,
    borderThickness,
    font,
    fontSize,
    defaultColor,
    activeColors,
    puck,
  }) => {
    const [internalActiveTab, setInternalActiveTab] = useState(0);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const tabButtonRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [trail, setTrail] = useState({
      left: { width: 0 },
      right: { left: 0, width: 0 },
    });

    const tabCount = tabs?.length ?? 0;
    const editingIndex =
      tabCount > 0 ? clampActiveTabIndex(activeTabIndex, tabCount) - 1 : 0;
    const effectiveActiveTab = puck.isEditing
      ? editingIndex
      : internalActiveTab;

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
        activeRight
      );
      setTrail({
        left: {
          width: effectiveActiveTab > 0 ? segments.left.width : 0,
        },
        right: {
          left: segments.right.left,
          width:
            effectiveActiveTab < tabCount - 1 ? segments.right.width : 0,
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
              <div
                key={`tab-${index}`}
                ref={(el) => {
                  tabButtonRefs.current[index] = el;
                }}
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
                onClick={(e) => {
                  if (!puck.isEditing) {
                    e.stopPropagation();
                    setInternalActiveTab(index);
                  }
                }}
              >
                {tab.title || `Tab ${index + 1}`}
              </div>
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
  },
};

export const Tabs = withLayout(TabsInternal);
