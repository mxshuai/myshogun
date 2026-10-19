import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { onOffOptions } from "./button-field-groups";

const FlexInternal: ComponentConfig<Components["Flex"]> = {
  fields: {
    main: {
      type: "object",
      label: "Main",
      defaultOpen: true,
      objectFields: {
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
          inline: true,
          min: 0,
        },
        wrap: {
          label: "Wrap",
          type: "radio",
          options: [...onOffOptions],
          switch: true,
        },
        items: {
          type: "slot",
          disallow: ["Hero"],
        },
      },
    },
  },
  defaultProps: {
    main: {
      justifyContent: "start",
      direction: "row",
      gap: 24,
      wrap: true,
      items: [],
    },
    layout: {
      grow: true,
    },
  },
  render: (props) => {
    const main = props.main ?? {
      justifyContent: "start" as const,
      direction: "row" as const,
      gap: 24,
      wrap: true,
      items: [] as unknown as Slot,
    };
    const { justifyContent, direction, gap, wrap, items: Items } = main;
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
            flexWrap: wrap ? "wrap" : "nowrap",
            height: "100%",
          }}
        />
      </Section>
    );
  },
};

export const Flex = withLayout(FlexInternal);
