import type { CSSProperties } from "react";

export type TabTheme = "rectangular" | "sloped" | "stretch";

export type TabColorGroup = {
  backgroundColor: string;
  textColor: string;
};

export const TAB_BUTTON_PADDING = "10px 15px";
export const TAB_BUTTON_BORDER_RADIUS = "4px 4px 0 0";
export const TAB_CONTENT_PADDING = "0 14px";
export const TAB_CONTENT_FADE_MS = 500;

export const TABS_EXPORT_CSS = `/* Tabs */
@keyframes visbuild-tabs-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.visbuild-tabs-content-panel.visbuild-tabs-content-panel--active {
  animation: visbuild-tabs-fade-in ${TAB_CONTENT_FADE_MS}ms ease;
}
`;

export const DEFAULT_TAB_COLOR_GROUP: TabColorGroup = {
  backgroundColor: "#F4F4F4",
  textColor: "#555555",
};

export const DEFAULT_ACTIVE_TAB_COLOR_GROUP: TabColorGroup = {
  backgroundColor: "#ffffff",
  textColor: "#50b3da",
};

/** 侧栏 Active Tab Index 为 1-based */
export function clampActiveTabIndex(
  oneBased: number | undefined,
  tabCount: number
): number {
  const count = Math.max(1, tabCount);
  const raw = oneBased ?? 1;
  return Math.min(Math.max(1, raw), count);
}

/** 激活 / 非激活 tab 左/上/右边框均使用侧栏 Border color */
export function tabSideBorderColor(borderColor: string): string {
  return borderColor;
}

/** 激活 tab 左右两侧非激活区域下方的横线，同样使用 Border color */
export function tabsTrailBorderColor(borderColor: string): string {
  return borderColor;
}

export type TabsTrailSegments = {
  left: { width: number };
  right: { left: number; width: number };
};

export function computeTabsTrailSegments(
  barWidth: number,
  activeTabLeft: number,
  activeTabRight: number
): TabsTrailSegments {
  return {
    left: { width: Math.max(0, activeTabLeft) },
    right: {
      left: Math.max(0, activeTabRight),
      width: Math.max(0, barWidth - Math.max(0, activeTabRight)),
    },
  };
}

export function buildTabButtonStyle({
  theme,
  isActive,
  borderColor,
  borderThickness,
  font,
  fontSize,
  defaultColor,
  activeColors,
}: {
  theme: TabTheme;
  isActive: boolean;
  borderColor: string;
  borderThickness: number;
  font: string;
  fontSize: number;
  defaultColor: TabColorGroup;
  activeColors: TabColorGroup;
}): CSSProperties {
  const colors = isActive ? activeColors : defaultColor;
  const sideColor = tabSideBorderColor(borderColor);
  const side =
    borderThickness > 0
      ? `${borderThickness}px solid ${sideColor}`
      : "none";

  const base: CSSProperties = {
    padding: TAB_BUTTON_PADDING,
    borderRadius: TAB_BUTTON_BORDER_RADIUS,
    cursor: "pointer",
    fontFamily: font?.trim() ? font : "inherit",
    fontSize: `${fontSize}px`,
    fontWeight: 400,
    transition: "all 0.2s ease",
    userSelect: "none",
    position: "relative",
    zIndex: isActive ? 1 : 0,
    flex: theme === "stretch" ? 1 : "none",
    textAlign: theme === "stretch" ? "center" : "left",
    boxSizing: "border-box",
  };

  if (theme === "sloped") {
    return {
      ...base,
      borderBottom: `${borderThickness}px solid ${
        isActive ? activeColors.textColor : borderColor
      }`,
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      background: "transparent",
      color: colors.textColor,
      marginBottom: 0,
    };
  }

  return {
    ...base,
    borderTop: side,
    borderLeft: side,
    borderRight: side,
    borderBottom: "none",
    background: colors.backgroundColor,
    color: colors.textColor,
    marginBottom: 0,
  };
}

export function serializeTabButtonStyle(
  params: Parameters<typeof buildTabButtonStyle>[0]
): string {
  const style = buildTabButtonStyle(params);
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${cssKey}: ${value}`;
    })
    .join("; ");
}
