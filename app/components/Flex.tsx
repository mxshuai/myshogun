import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

const FlexInternal: ComponentConfig<Components["Flex"]> = {
  fields: {
    direction: {
      label: "Direction",
      type: "radio",
      options: [
        { label: "Row", value: "row" },
        { label: "Column", value: "column" },
      ],
    },
    justifyContent: {
      label: "Justify Content",
      type: "radio",
      options: [
        { label: "Start", value: "start" },
        { label: "Center", value: "center" },
        { label: "End", value: "end" },
      ],
    },
    gap: {
      label: "Gap",
      type: "number",
      min: 0,
    },
    wrap: {
      label: "Wrap",
      type: "radio",
      options: [
        { label: "true", value: "wrap" },
        { label: "false", value: "nowrap" },
      ],
    },
    items: {
      type: "slot",
    },
  },
  defaultProps: {
    justifyContent: "start",
    direction: "row",
    gap: 24,
    wrap: "wrap",
    layout: {
      grow: true,
    },
    items: [],
  },
  render: ({ justifyContent, direction, gap, wrap, items: Items }) => {
    const justifyContentMap: Record<string, string> = {
      start: "flex-start",
      center: "center",
      end: "flex-end",
    };

    return (
      <Section style={{ height: "100%" }}>
        <Items
          disallow={["Hero", "Stats"]}
          style={{
            display: "flex",
            justifyContent: justifyContentMap[justifyContent],
            flexDirection: direction,
            gap: `${gap}px`,
            flexWrap: wrap,
            height: "100%",
          }}
        />
      </Section>
    );
  },
};

export const Flex = withLayout(FlexInternal);
