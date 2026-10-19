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
  resolveData: (data) => {
    const props = data.props || {};
    if (props.main) return {};
    const legacy = props as unknown as {
      direction?: "row" | "column";
      justifyContent?: "start" | "center" | "end";
      gap?: number;
      wrap?: boolean | "wrap" | "nowrap";
      items?: Slot;
    };
    const wrap =
      legacy.wrap === false || legacy.wrap === "nowrap" ? false : true;
    return {
      props: {
        ...props,
        main: {
          direction: legacy.direction ?? "row",
          justifyContent: legacy.justifyContent ?? "start",
          gap: legacy.gap ?? 24,
          wrap,
          items: legacy.items ?? [],
        },
        direction: undefined,
        justifyContent: undefined,
        gap: undefined,
        wrap: undefined,
        items: undefined,
      },
    };
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
