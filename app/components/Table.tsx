import React from "react";
import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

// Table 列类型定义
export type TableColumn = {
  id: string;
  name: string;
  content: Slot;
};

// Table 组件 Props 类型
type TableProps = Components["Table"];

const TableInternal: ComponentConfig<TableProps> = {
  fields: {
    // Main Section
    borderColor: {
      type: "text",
      label: "Border color",
      default: "#e0e0e0",
    },
    borderWidth: {
      type: "number",
      label: "Border width",
      min: 0,
      max: 10,
      default: 1,
    },
    tableBorderRadius: {
      type: "number",
      label: "Table border radius",
      min: 0,
      max: 50,
      default: 4,
    },

    // Header Section
    headerBackgroundColor: {
      type: "text",
      label: "Header background color",
      default: "#f5f5f5",
    },
    headerFont: {
      type: "text",
      label: "Font",
      default: "",
    },
    headerSize: {
      type: "number",
      label: "Size",
      min: 8,
      max: 72,
      default: 14,
    },
    headerTextColor: {
      type: "text",
      label: "Text color",
      default: "#000000",
    },
    headerLineHeight: {
      type: "number",
      label: "Line height",
      min: 0.5,
      max: 3,
      step: 0.1,
      default: 1.5,
    },
    headerLetterSpacing: {
      type: "number",
      label: "Letter spacing",
      min: -5,
      max: 20,
      default: 0,
    },
    headerTextAlignment: {
      type: "radio",
      label: "Header text alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
      default: "left",
    },

    // Columns Section
    columns: {
      type: "array",
      label: "Manage columns",
      arrayFields: {
        name: {
          type: "text",
          label: "Column name",
        },
        content: {
          type: "slot",
          label: "Content",
        },
      },
    },
    columnSpacing: {
      type: "number",
      label: "Column spacing",
      min: 0,
      max: 100,
      default: 10,
    },

    // Rows Section
    numberOfRows: {
      type: "number",
      label: "Number of rows",
      min: 1,
      max: 100,
      default: 3,
    },
    rowBackgroundColor: {
      type: "text",
      label: "Row background color",
      default: "#ffffff",
    },
    rowSpacing: {
      type: "number",
      label: "Row spacing",
      min: 0,
      max: 100,
      default: 10,
    },
  },
  defaultProps: {
    borderColor: "#e0e0e0",
    borderWidth: 1,
    tableBorderRadius: 4,
    headerBackgroundColor: "#f5f5f5",
    headerFont: "",
    headerSize: 14,
    headerTextColor: "#000000",
    headerLineHeight: 1.5,
    headerLetterSpacing: 0,
    headerTextAlignment: "left",
    columns: [
      {
        name: "New Column",
        content: [],
      },
    ],
    columnSpacing: 10,
    numberOfRows: 1,
    rowBackgroundColor: "#ffffff",
    rowSpacing: 10,
  },
  render: ({
    borderColor,
    borderWidth,
    tableBorderRadius,
    headerBackgroundColor,
    headerFont,
    headerSize,
    headerTextColor,
    headerLineHeight,
    headerLetterSpacing,
    headerTextAlignment,
    columns,
    columnSpacing,
    numberOfRows,
    rowBackgroundColor,
    rowSpacing,
  }) => {
    if (!columns || columns.length === 0) {
      return <Section>No columns defined</Section>;
    }

    const tableStyle: React.CSSProperties = {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: `${columnSpacing}px ${rowSpacing}px`,
      borderRadius: `${tableBorderRadius}px`,
      overflow: "hidden",
    };

    const headerCellStyle: React.CSSProperties = {
      padding: "12px 8px",
      backgroundColor: headerBackgroundColor,
      fontSize: `${headerSize}px`,
      fontWeight: "bold",
      color: headerTextColor,
      textAlign: headerTextAlignment,
      lineHeight: headerLineHeight,
      letterSpacing: `${headerLetterSpacing}px`,
      fontFamily: headerFont || "inherit",
      borderBottom: `${borderWidth}px solid ${borderColor}`,
    };

    const cellStyle: React.CSSProperties = {
      padding: "12px 8px",
      backgroundColor: rowBackgroundColor,
      borderBottom: `${borderWidth}px solid ${borderColor}`,
      verticalAlign: "top",
    };

    return (
      <Section>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((column: any, colIndex: number) => (
                <th key={`header-${colIndex}`} style={headerCellStyle}>
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numberOfRows }).map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map((column: any, colIndex: number) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} style={cellStyle}>
                    <column.content key={`slot-${rowIndex}-${colIndex}`} disallow={["Hero"]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    );
  },
};

export const Table = withLayout(TableInternal);
