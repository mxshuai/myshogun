import React from "react";
import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";
import { readTableSettings } from "./table-settings";

type TableProps = Components["Table"];

const inlineNumber = (
  label: string,
  options: { min?: number; max?: number; step?: number; suffix?: string },
) => ({
  type: "number" as const,
  label,
  inline: true,
  ...options,
});

const tableFields = {
  main: {
    type: "object" as const,
    label: "Main",
    defaultOpen: true,
    objectFields: {
      borderColor: createPuckColorField("Border color", "#D5D6D7"),
      borderWidth: inlineNumber("Border width", { min: 0, max: 10, suffix: "PX" }),
      tableBorderRadius: inlineNumber("Table border radius", { min: 0, max: 50, suffix: "PX" }),
    },
  },
  header: {
    type: "object" as const,
    label: "Header",
    objectFields: {
      headerBackgroundColor: createPuckColorField("Header background color", "#FFFFFF"),
      headerFont: {
        type: "select" as const,
        label: "Font",
        options: TEXT_FONT_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
      headerSize: inlineNumber("Size", { min: 8, max: 72, suffix: "PX" }),
      headerTextColor: createPuckColorField("Text color", "#22194D"),
      headerLineHeight: inlineNumber("Line height", { min: 0.5, max: 3, step: 0.1 }),
      headerLetterSpacing: inlineNumber("Letter spacing", { min: -5, max: 20, suffix: "PX" }),
      headerTextAlignment: {
        type: "radio" as const,
        label: "Header text alignment",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
      },
    },
  },
  tableColumns: {
    type: "object" as const,
    label: "Columns",
    objectFields: {
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
            disallow: ["Hero"],
          },
        },
      },
      columnSpacing: inlineNumber("Column spacing", { min: 0, max: 100, suffix: "PX" }),
    },
  },
  rows: {
    type: "object" as const,
    label: "Rows",
    objectFields: {
      numberOfRows: inlineNumber("Number of rows", { min: 1, max: 100 }),
      rowBackgroundColor: createPuckColorField("Row background color", "#ffffff"),
      rowSpacing: inlineNumber("Row spacing", { min: 0, max: 100, suffix: "PX" }),
    },
  },
} as ComponentConfig<TableProps>["fields"];

const TableInternal: ComponentConfig<TableProps> = {
  fields: tableFields,
  defaultProps: {
    main: {
      borderColor: "#D5D6D7",
      borderWidth: 1,
      tableBorderRadius: 0,
    },
    header: {
      headerBackgroundColor: "#FFFFFF",
      headerFont: "",
      headerSize: 14,
      headerTextColor: "#22194D",
      headerLetterSpacing: 0,
      headerTextAlignment: "left",
    },
    tableColumns: {
      columns: [
        {
          name: "New Column",
          content: [],
        },
      ],
      columnSpacing: 10,
    },
    rows: {
      numberOfRows: 1,
      rowBackgroundColor: "#ffffff",
      rowSpacing: 10,
    },
  },
  render: (props) => {
    const {
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
    } = readTableSettings(props);

    if (!columns || columns.length === 0) {
      return <Section>No columns defined</Section>;
    }

    const thPadding = `${columnSpacing ?? 10}px`;
    const tdPadding = `${rowSpacing ?? 10}px`;
    const cellBorder =
      borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none";

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
                  {columns.map((column, colIndex) => {
                    const CellContent = column.content;
                    return (
                      <td key={`cell-${rowIndex}-${colIndex}`} style={cellStyle}>
                        {CellContent ? (
                          <CellContent
                            key={`slot-${rowIndex}-${colIndex}`}
                            disallow={["Hero"]}
                          />
                        ) : null}
                      </td>
                    );
                  })}
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

