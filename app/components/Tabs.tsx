import React, { useState } from "react";
import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

// Tab 类型定义
export type Tab = {
  id: string;
  title: string;
  content: Slot;
};

// Tabs 组件 Props 类型
type TabsProps = Components["Tabs"];

const TabsInternal: ComponentConfig<TabsProps> = {
  fields: {
    // Active Tab Control - 用于在编辑模式下切换tab
    activeTabIndex: {
      type: "number",
      label: "Active Tab Index (for editing)",
      min: 0,
    },

    // Tabs Management
    tabs: {
      type: "array",
      label: "Manage tabs",
      arrayFields: {
        title: {
          type: "text",
          label: "Title",
        },
        content: {
          type: "slot",
          label: "Content",
        },
      },
    },

    // Theme Section
    theme: {
      type: "radio",
      label: "Theme",
      options: [
        { label: "Rectangular", value: "rectangular" },
        { label: "Sloped", value: "sloped" },
        { label: "Stretch", value: "stretch" },
      ],
    },

    // Border Section
    borderColor: {
      type: "text",
      label: "Border color",
    },
    borderThickness: {
      type: "number",
      label: "Border thickness",
      min: 0,
      max: 10,
    },

    // Font Section
    font: {
      type: "text",
      label: "Font",
    },
    fontSize: {
      type: "number",
      label: "Size",
      min: 8,
      max: 72,
    },
  },
  defaultProps: {
    activeTabIndex: 0,
    tabs: [
      { title: "Tab 1", content: [] },
      { title: "Tab 2", content: [] },
    ],
    theme: "rectangular",
    borderColor: "#e0e0e0",
    borderThickness: 1,
    font: "",
    fontSize: 16,
    layout: {
      padding: "0px",
    },
  },
  render: ({
    tabs,
    activeTabIndex,
    theme,
    borderColor,
    borderThickness,
    font,
    fontSize,
    puck,
  }) => {
    // 使用activeTabIndex或useState来控制激活的tab
    // 在编辑模式下使用activeTabIndex（从属性面板控制）
    // 在预览模式下使用useState（点击切换）
    const [internalActiveTab, setInternalActiveTab] = useState(0);
    
    // 决定使用哪个activeTab值
    const effectiveActiveTab = puck.isEditing ? (activeTabIndex ?? 0) : internalActiveTab;

    if (!tabs || tabs.length === 0) {
      return <Section>No tabs defined</Section>;
    }

    // Tab标题样式 - 根据主题和激活状态动态计算
    const getTabStyle = (index: number, isActive: boolean) => {
      const baseStyle: React.CSSProperties = {
        padding: "12px 24px",
        cursor: "pointer",
        fontFamily: font || "inherit",
        fontSize: `${fontSize}px`,
        fontWeight: isActive ? 600 : 400,
        transition: "all 0.2s ease",
        userSelect: "none",
        position: "relative",
        zIndex: isActive ? 1 : 0,
        // Stretch主题：平均分配宽度
        flex: theme === "stretch" ? 1 : "none",
        textAlign: theme === "stretch" ? "center" as const : "left" as const,
      };

      // Sloped主题：只有下边框，无边框
      if (theme === "sloped") {
        baseStyle.borderBottom = `${borderThickness}px solid ${isActive ? "#0070f3" : borderColor}`;
        baseStyle.borderTop = "none";
        baseStyle.borderLeft = "none";
        baseStyle.borderRight = "none";
        baseStyle.borderRadius = "8px 8px 0 0";
        baseStyle.background = "transparent";
        baseStyle.color = isActive ? "#0070f3" : "#999999";
        // 移除transform和boxShadow效果
        baseStyle.marginBottom = "0";
      } else if (theme === "stretch") {
        // Stretch主题：基于Rectangular，但平均分配宽度
        baseStyle.border = `${borderThickness}px solid ${borderColor}`;
        baseStyle.borderBottom = "none";
        baseStyle.borderRadius = isActive ? "8px 8px 0 0" : "4px 4px 0 0";
        baseStyle.background = isActive ? "#ffffff" : "#f5f5f5";
        baseStyle.color = isActive ? "#0070f3" : "#666666";
        baseStyle.marginBottom = "-1px";
      } else {
        // Rectangular主题
        baseStyle.border = `${borderThickness}px solid ${borderColor}`;
        baseStyle.borderBottom = "none";
        baseStyle.borderRadius = isActive ? "8px 8px 0 0" : "4px 4px 0 0";
        baseStyle.background = isActive ? "#ffffff" : "#f5f5f5";
        baseStyle.color = isActive ? "#0070f3" : "#666666";
        baseStyle.marginBottom = "-1px";
      }

      return baseStyle;
    };

    // 内容区域样式
    const contentStyle: React.CSSProperties = {
      borderTop: theme === "sloped" ? `${borderThickness}px solid #e0e0e0` : "none",
      borderBottom: "none",
      borderLeft: "none",
      borderRight: "none",
      padding: "24px",
      backgroundColor: "#ffffff",
      borderRadius: theme === "sloped" ? "0 0 8px 8px" : "0 0 8px 8px",
    };

    return (
      <Section>
        <div>
          {/* Tab标题栏 */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              borderBottom: `${borderThickness}px solid ${borderColor}`,
            }}
          >
            {tabs.map((tab, index) => (
              <div
                key={`tab-${index}`}
                style={getTabStyle(index, index === effectiveActiveTab)}
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
          </div>

          {/* Tab内容区域 */}
          <div style={contentStyle}>
            {tabs.map((tab, index) => {
              if (index === effectiveActiveTab) {
                const TabContent = tab.content as any;
                return TabContent ? (
                  <TabContent key={`tab-content-${index}`} />
                ) : null;
              }
              return null;
            })}
          </div>
        </div>
      </Section>
    );
  },
};

export const Tabs = withLayout(TabsInternal);
