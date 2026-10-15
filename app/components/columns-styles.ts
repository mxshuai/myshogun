import type { CSSProperties } from "react";

export type ColumnsStackingBehavior = "leftFirst" | "rightFirst";

/** 单列最小占比。12 列时仍能均分（约 8.3%）且每列不低于该值。 */
export const MIN_COLUMN_WIDTH_PERCENT = 5;

const EQUAL_WIDTH_EPSILON = 0.4;

export function equalColumnWidths(numColumns: number): number[] {
  const n = Math.max(1, numColumns);
  const each = 100 / n;
  return Array.from({ length: n }, () => each);
}

export function resolveColumnWidths(
  columnWidths: number[] | undefined,
  numColumns: number,
): number[] {
  const n = Math.max(1, numColumns);
  if (
    !columnWidths ||
    columnWidths.length !== n ||
    columnWidths.some((w) => !Number.isFinite(w) || w <= 0)
  ) {
    return equalColumnWidths(n);
  }
  const sum = columnWidths.reduce((total, w) => total + w, 0);
  if (sum <= 0) return equalColumnWidths(n);
  if (Math.abs(sum - 100) < 0.01) return columnWidths.slice();
  return columnWidths.map((w) => (w / sum) * 100);
}

export function isEqualColumnWidths(
  columnWidths: number[] | undefined,
  numColumns: number,
): boolean {
  const n = Math.max(1, numColumns);
  const widths = resolveColumnWidths(columnWidths, n);
  const each = 100 / n;
  return widths.every((w) => Math.abs(w - each) <= EQUAL_WIDTH_EPSILON);
}

/** 滑块在列与列的分界上，数量比列数少 1。 */
export function columnDividerPositions(widths: number[]): number[] {
  const positions: number[] = [];
  let acc = 0;
  for (let i = 0; i < widths.length - 1; i += 1) {
    acc += widths[i];
    positions.push(acc);
  }
  return positions;
}

function splitPair(desired: number, pairTotal: number): [number, number] {
  const minBound = Math.min(MIN_COLUMN_WIDTH_PERCENT, pairTotal / 2);
  const maxBound = pairTotal - minBound;
  const primary = Math.min(maxBound, Math.max(minBound, desired));
  return [primary, pairTotal - primary];
}

function snapToEqual(widths: number[]): number[] {
  return isEqualColumnWidths(widths, widths.length)
    ? equalColumnWidths(widths.length)
    : widths;
}

/** 拖动第 index 个分界滑块，只在它左右两列之间腾挪宽度。 */
export function moveColumnThumb(
  columnWidths: number[],
  index: number,
  pointerPercent: number,
): number[] {
  const n = columnWidths.length;
  if (n <= 1 || index < 0 || index >= n - 1) return columnWidths.slice();
  const widths = resolveColumnWidths(columnWidths, n);
  const sum = widths.reduce((total, w) => total + w, 0);
  const left = widths.slice(0, index).reduce((total, w) => total + w, 0);
  const pair = widths[index] + widths[index + 1];
  const pointer = Math.min(sum, Math.max(0, pointerPercent));
  const next = widths.slice();
  const [current, neighbor] = splitPair(pointer - left, pair);
  next[index] = current;
  next[index + 1] = neighbor;
  return snapToEqual(next);
}

export function nudgeColumnWidth(
  columnWidths: number[],
  index: number,
  delta: number,
): number[] {
  const n = columnWidths.length;
  if (n <= 1 || index < 0 || index >= n - 1 || delta === 0) {
    return resolveColumnWidths(columnWidths, Math.max(1, n));
  }
  const widths = resolveColumnWidths(columnWidths, n);
  const pair = widths[index] + widths[index + 1];
  const next = widths.slice();
  const [current, neighbor] = splitPair(widths[index] + delta, pair);
  next[index] = current;
  next[index + 1] = neighbor;
  return snapToEqual(next);
}

export type ColumnsLayoutProps = {
  numColumns: number;
  gap: number;
  equalColumnHeights: boolean;
  stackOnSmallScreens: boolean;
  stackingBehavior: ColumnsStackingBehavior;
};

export function columnsGridClassName({
  equalColumnHeights,
  stackOnSmallScreens,
  stackingBehavior,
}: Pick<
  ColumnsLayoutProps,
  "equalColumnHeights" | "stackOnSmallScreens" | "stackingBehavior"
>): string {
  const classes = ["visbuild-columns"];
  if (equalColumnHeights) {
    classes.push("visbuild-columns--equal-heights");
  }
  if (stackOnSmallScreens) {
    classes.push("visbuild-columns--stack");
    if (stackingBehavior === "rightFirst") {
      classes.push("visbuild-columns--stack-right-first");
    }
  }
  return classes.join(" ");
}

export function columnsGridStyle(
  numColumns: number,
  gap: number,
  columnWidths?: number[],
): CSSProperties {
  const n = Math.max(1, numColumns);
  const widths = resolveColumnWidths(columnWidths, n);
  const gridTemplateColumns = isEqualColumnWidths(widths, n)
    ? `repeat(${n}, minmax(0, 1fr))`
    : widths
        .map((w) => `minmax(0, ${Number(w.toFixed(4))}fr)`)
        .join(" ");
  return {
    display: "grid",
    gridTemplateColumns,
    gap: `${gap}px`,
    width: "100%",
  };
}

export const COLUMNS_EXPORT_CSS = `/* Columns */
.visbuild-columns {
  align-items: start;
  width: 100%;
}

.visbuild-columns--equal-heights {
  align-items: stretch;
}

@media (max-width: 768px) {
  .visbuild-columns--stack {
    display: flex !important;
    flex-direction: column;
    grid-template-columns: unset !important;
  }

  .visbuild-columns--stack.visbuild-columns--stack-right-first {
    flex-direction: column-reverse;
  }
}
`;
