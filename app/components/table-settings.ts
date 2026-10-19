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
  const flatColumns = Array.isArray(source.columns) ? source.columns : undefined;

  return {
    borderColor: main.borderColor ?? source.borderColor ?? "#D5D6D7",
    borderWidth: main.borderWidth ?? source.borderWidth ?? 1,
    tableBorderRadius: main.tableBorderRadius ?? source.tableBorderRadius ?? 0,
    headerBackgroundColor:
      header.headerBackgroundColor ?? source.headerBackgroundColor ?? "#FFFFFF",
    headerFont: header.headerFont ?? source.headerFont ?? "",
    headerSize: header.headerSize ?? source.headerSize ?? 14,
    headerTextColor: header.headerTextColor ?? source.headerTextColor ?? "#22194D",
    headerLineHeight: header.headerLineHeight ?? source.headerLineHeight,
    headerLetterSpacing: header.headerLetterSpacing ?? source.headerLetterSpacing ?? 0,
    headerTextAlignment:
      header.headerTextAlignment ?? source.headerTextAlignment ?? "left",
    columns: (tableColumns.columns ?? flatColumns ?? []) as TableColumnData[],
    columnSpacing: tableColumns.columnSpacing ?? source.columnSpacing ?? 10,
    numberOfRows: rows.numberOfRows ?? source.numberOfRows ?? 1,
    rowBackgroundColor: rows.rowBackgroundColor ?? source.rowBackgroundColor ?? "#ffffff",
    rowSpacing: rows.rowSpacing ?? source.rowSpacing ?? 10,
  };
}

const FLAT_KEYS = [
  "borderColor",
  "borderWidth",
  "tableBorderRadius",
  "headerBackgroundColor",
  "headerFont",
  "headerSize",
  "headerTextColor",
  "headerLineHeight",
  "headerLetterSpacing",
  "headerTextAlignment",
  "columns",
  "columnSpacing",
  "numberOfRows",
  "rowBackgroundColor",
  "rowSpacing",
] as const;

export function tableNeedsNesting(props: Record<string, any> | undefined): boolean {
  if (!props?.main || !props?.header || !props?.tableColumns || !props?.rows) return true;
  return false;
}

export function nestTableProps<T extends Record<string, any>>(props: T): T {
  const settings = readTableSettings(props);
  const next: Record<string, any> = {
    ...props,
    main: {
      borderColor: settings.borderColor,
      borderWidth: settings.borderWidth,
      tableBorderRadius: settings.tableBorderRadius,
    },
    header: {
      headerBackgroundColor: settings.headerBackgroundColor,
      headerFont: settings.headerFont,
      headerSize: settings.headerSize,
      headerTextColor: settings.headerTextColor,
      headerLineHeight: settings.headerLineHeight,
      headerLetterSpacing: settings.headerLetterSpacing,
      headerTextAlignment: settings.headerTextAlignment,
    },
    tableColumns: {
      columns: settings.columns,
      columnSpacing: settings.columnSpacing,
    },
    rows: {
      numberOfRows: settings.numberOfRows,
      rowBackgroundColor: settings.rowBackgroundColor,
      rowSpacing: settings.rowSpacing,
    },
  };
  for (const key of FLAT_KEYS) next[key] = undefined;
  return next as T;
}
