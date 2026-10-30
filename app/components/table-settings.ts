export type TableColumnData = {
  name: string;
  content?: any;
};

export function readTableSettings(props: Record<string, any> | undefined) {
  const source = props ?? {};
  const main = source.main ?? {};
  const header = source.header ?? {};
  const tableColumns = source.tableColumns ?? {};
  const rows = source.rows ?? {};

  return {
    borderColor: main.borderColor ?? "#D5D6D7",
    borderWidth: main.borderWidth ?? 1,
    tableBorderRadius: main.tableBorderRadius ?? 0,
    headerBackgroundColor: header.headerBackgroundColor ?? "#FFFFFF",
    headerFont: header.headerFont ?? "",
    headerSize: header.headerSize ?? 14,
    headerTextColor: header.headerTextColor ?? "#22194D",
    headerLineHeight: header.headerLineHeight,
    headerLetterSpacing: header.headerLetterSpacing ?? 0,
    headerTextAlignment: header.headerTextAlignment ?? "left",
    columns: (tableColumns.columns ?? []) as TableColumnData[],
    columnSpacing: tableColumns.columnSpacing ?? 10,
    numberOfRows: rows.numberOfRows ?? 1,
    rowBackgroundColor: rows.rowBackgroundColor ?? "#ffffff",
    rowSpacing: rows.rowSpacing ?? 10,
  };
}
