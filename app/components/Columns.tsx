import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { onOffOptions } from "./button-field-groups";
import {
  columnsGridClassName,
  columnsGridStyle,
} from "./columns-styles";
import "./columns.css";

const CustomSlot = (props: Record<string, unknown>) => {
  return <span {...props} />;
};

const columnsFields = {
  numColumns: {
    type: "number" as const,
    label: "Number of columns",
    min: 1,
    max: 12,
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
  items: {
    type: "slot" as const,
  },
};

const ColumnsInternal: ComponentConfig<Components["Columns"]> = {
  fields: columnsFields,
  resolveFields: (data) => {
    const props = data.props || {};
    if (props.stackOnSmallScreens) {
      return columnsFields as NonNullable<
        ComponentConfig<Components["Columns"]>["fields"]
      >;
    }
    const { stackingBehavior: _stackingBehavior, ...rest } = columnsFields;
    return rest as NonNullable<
      ComponentConfig<Components["Columns"]>["fields"]
    >;
  },
  defaultProps: {
    numColumns: 2,
    gap: 30,
    equalColumnHeights: false,
    stackOnSmallScreens: true,
    stackingBehavior: "leftFirst",
    items: [],
  },
  render: ({
    gap,
    numColumns,
    equalColumnHeights = false,
    stackOnSmallScreens = true,
    stackingBehavior = "leftFirst",
    items: Items,
  }) => {
    return (
      <Section>
        <Items
          as={CustomSlot}
          disallow={["Hero", "Stats"]}
          className={columnsGridClassName({
            equalColumnHeights,
            stackOnSmallScreens,
            stackingBehavior,
          })}
          style={columnsGridStyle(numColumns, gap)}
        />
      </Section>
    );
  },
};

export const Columns = withLayout(ColumnsInternal);

/** @deprecated 旧页面数据 type 为 Grid 时仍由 Puck 渲染 */
export const Grid = Columns;
