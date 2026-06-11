import type { CSSProperties } from "react";

export type ColumnsStackingBehavior = "leftFirst" | "rightFirst";

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
  gap: number
): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${Math.max(1, numColumns)}, 1fr)`,
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
