import React from "react";
import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";

export type TableColumn = {
  id: string;
  name: string;
  content: Components["Table"]["columns"][number]["content"];
};

type TableProps = Components["Table"];

const fontOptions = TEXT_FONT_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

const tableFields = {
  borderColor: createPuckColorField("Border color", "#D5D6D7"),
  borderWidth: {
    type: "number" as const,
    label: "Border width",
    min: 0,
    max: 10,
  },
  tableBorderRadius: {
    type: "number" as const,
    label: "Border radius",
    min: 0,
    max: 50,
  },
  headerBackgroundColor: createPuckColorField(
    "Header background color",
    "#FFFFFF"
  ),
  headerFont: {
    type: "select" as const,
    label: "Font",
    options: fontOptions,
  },
  headerSize: {
    type: "number" as const,
    label: "Size",
    min: 8,
    max: 72,
  },
  headerTextColor: createPuckColorField("Text color", "#22194D"),
  headerLineHeight: {
    type: "number" as const,
    label: "Line height (em)",
    min: 0.5,
    max: 3,
    step: 0.1,
  },
  headerLetterSpacing: {
    type: "number" as const,
    label: "Letter spacing",
    min: -5,
    max: 20,
  },
  headerTextAlignment: {
    type: "radio" as const,
    label: "Header text alignment",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
  columns: {
    type: "array" as const,
    label: "Manage columns",
    arrayFields: {
      name: {
        type: "text" as const,
        label: "Column name",
      },
      content: {
        type: "slot" as const,
        label: "Content",
      },
    },
  },
  columnSpacing: {
    type: "number" as const,
    label: "Column spacing",
    min: 0,
    max: 100,
  },
  numberOfRows: {
    type: "number" as const,
    label: "Number of rows",
    min: 1,
    max: 100,
  },
  rowBackgroundColor: createPuckColorField("Row background color", "#ffffff"),
  rowSpacing: {
    type: "number" as const,
    label: "Row spacing",
    min: 0,
    max: 100,
  },
} as ComponentConfig<TableProps>["fields"];

const TableInternal: ComponentConfig<TableProps> = {
  fields: tableFields,
  defaultProps: {
    borderColor: "#D5D6D7",
    borderWidth: 1,
    tableBorderRadius: 0,
    headerBackgroundColor: "#FFFFFF",
    headerFont: "",
    headerSize: 14,
    headerTextColor: "#22194D",
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

    const thPadding = `${columnSpacing ?? 10}px`;
    const tdPadding = `${rowSpacing ?? 10}px`;
    const cellBorder =
      borderWidth > 0
        ? `${borderWidth}px solid ${borderColor}`
        : "none";

    const tableStyle: React.CSSProperties = {
      width: "100%",
      borderCollapse: "collapse",
    };

    const headerCellStyle: React.CSSProperties = {
      padding: thPadding,
      backgroundColor: headerBackgroundColor,
      fontSize: `${headerSize}px`,
      fontWeight: "bold",
      color: headerTextColor,
      textAlign: headerTextAlignment,
      ...(headerLineHeight != null && Number.isFinite(headerLineHeight)
        ? { lineHeight: `${headerLineHeight}em` }
        : {}),
      letterSpacing: `${headerLetterSpacing}px`,
      fontFamily: headerFont?.trim() ? headerFont : "inherit",
      border: cellBorder,
    };

    const cellStyle: React.CSSProperties = {
      padding: tdPadding,
      backgroundColor: rowBackgroundColor,
      border: cellBorder,
      verticalAlign: "top",
    };

    return (
      <Section>
        <div
          style={{
            overflow: "hidden",
            borderRadius: `${tableBorderRadius}px`,
          }}
        >
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((column, colIndex) => (
                <th key={`header-${colIndex}`} style={headerCellStyle}>
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numberOfRows }).map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {columns.map((column, colIndex) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} style={cellStyle}>
                    <column.content
                      key={`slot-${rowIndex}-${colIndex}`}
                      disallow={["Hero"]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Section>
    );
  },
};

export const Table = withLayout(TableInternal);
