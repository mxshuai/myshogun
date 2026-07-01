import { forwardRef, type HTMLAttributes } from "react";
import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { onOffOptions } from "./button-field-groups";
import {
  columnsGridClassName,
  columnsGridStyle,
} from "./columns-styles";
import "./columns.css";

/** Puck DropZone 必须接收 ref；每列用 div 承载一个独立 slot */
const ColumnSlot = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />,
);
ColumnSlot.displayName = "ColumnSlot";

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 12;

function clampColumnCount(n: unknown): number {
  const num = Math.round(Number(n));
  if (!Number.isFinite(num)) return 2;
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, num));
}

/**
 * 每列一个独立 slot（列数由 numColumns 驱动，resolveData 自动同步）。
 * columns 字段声明为带 slot 的数组以启用 DropZone，但在 resolveFields 中
 * 对侧栏隐藏——用户仍通过 "Number of columns" 控制列数。
 */
const columnsFields = {
  numColumns: {
    type: "number" as const,
    label: "Number of columns",
    min: MIN_COLUMNS,
    max: MAX_COLUMNS,
  },
  gap: {
    label: "Space between columns",
    type: "number" as const,
    min: 0,
  },
  equalColumnHeights: {
    type: "radio" as const,
    label: "Equal column heights",
    options: [...onOffOptions],
  },
  stackOnSmallScreens: {
    type: "radio" as const,
    label: "Stacking on smaller screens",
    options: [...onOffOptions],
  },
  stackingBehavior: {
    type: "radio" as const,
    label: "Stacking behavior",
    options: [
      { label: "Left first", value: "leftFirst" },
      { label: "Right first", value: "rightFirst" },
    ],
  },
  columns: {
    type: "array" as const,
    label: "Columns",
    arrayFields: {
      content: {
        type: "slot" as const,
        label: "Content",
      },
    },
  },
};

type ColumnItem = { content: Slot };

const ColumnsInternal: ComponentConfig<Components["Columns"]> = {
  fields: columnsFields,
  resolveFields: (data) => {
    const props = data.props || {};
    // 侧栏只展示配置项，隐藏由 numColumns 驱动的 columns 数组
    const { columns: _columns, stackingBehavior, ...base } = columnsFields;
    const shown = props.stackOnSmallScreens
      ? { ...base, stackingBehavior }
      : base;
    return shown as NonNullable<
      ComponentConfig<Components["Columns"]>["fields"]
    >;
  },
  resolveData: (data) => {
    const props = data.props || {};
    const n = clampColumnCount(props.numColumns);

    let columns: ColumnItem[] = Array.isArray(props.columns)
      ? props.columns.map((c) => ({
          content: Array.isArray(c?.content) ? c.content : [],
        }))
      : [];
    let changed = false;

    // 迁移旧的单 items slot：并入第一列
    const legacyItems = Array.isArray((props as { items?: Slot }).items)
      ? ((props as { items?: Slot }).items as Slot)
      : [];
    if (columns.length === 0 && legacyItems.length > 0) {
      columns = [{ content: legacyItems }];
      changed = true;
    }

    // 按 numColumns 同步列数（多删少补，删除时把内容并入最后一列避免丢失）
    if (columns.length < n) {
      while (columns.length < n) columns.push({ content: [] });
      changed = true;
    } else if (columns.length > n) {
      const overflow = columns.slice(n).flatMap((c) => c.content);
      columns = columns.slice(0, n);
      if (overflow.length > 0) {
        columns[n - 1] = {
          content: [...columns[n - 1].content, ...overflow],
        };
      }
      changed = true;
    }

    const hadLegacyItems = (props as { items?: Slot }).items !== undefined;
    if (changed || hadLegacyItems) {
      const { items: _drop, ...rest } = props as typeof props & {
        items?: Slot;
      };
      return { props: { ...rest, columns } };
    }
    return {};
  },
  defaultProps: {
    numColumns: 2,
    gap: 30,
    equalColumnHeights: false,
    stackOnSmallScreens: true,
    stackingBehavior: "leftFirst",
    columns: [{ content: [] }, { content: [] }],
  },
  render: ({
    gap,
    numColumns,
    equalColumnHeights = false,
    stackOnSmallScreens = true,
    stackingBehavior = "leftFirst",
    columns,
    puck,
  }) => {
    const isEditing = puck?.isEditing === true;
    const cols = Array.isArray(columns) ? columns : [];
    const count = cols.length > 0 ? cols.length : clampColumnCount(numColumns);
    const gridClass = columnsGridClassName({
      equalColumnHeights,
      stackOnSmallScreens,
      stackingBehavior,
    });

    return (
      <Section>
        <div
          className={
            isEditing ? `${gridClass} visbuild-columns--editing` : gridClass
          }
          style={columnsGridStyle(count, gap)}
        >
          {cols.map((col, index) => {
            const ColumnContent = col.content;
            return (
              <ColumnContent
                key={index}
                as={ColumnSlot}
                className="visbuild-column-slot"
                disallow={["Hero", "Stats"]}
                minEmptyHeight="80px"
              />
            );
          })}
        </div>
      </Section>
    );
  },
};

export const Columns = withLayout(ColumnsInternal);

/** @deprecated 旧页面数据 type 为 Grid 时仍由 Puck 渲染 */
export const Grid = Columns;
