import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";

const DividerInternal: ComponentConfig<Components["Divider"]> = {
  fields: {
    main: {
      type: "object",
      label: "Main",
      defaultOpen: true,
      objectFields: {
        thickness: {
          type: "number",
          label: "Thickness",
          inline: true,
          min: 1,
          max: 10,
        },
        color: createPuckColorField("Color", "#e0e0e0"),
        style: {
          type: "select",
          label: "Style",
          options: [
            { label: "Solid", value: "solid" },
            { label: "Dashed", value: "dashed" },
            { label: "Dotted", value: "dotted" },
          ],
        },
      },
    },
  },
  defaultProps: {
    main: {
      thickness: 2,
      color: "#e0e0e0",
      style: "solid",
    },
    layout: {
      ...defaultLayoutSpacing,
      sectionPadding: {
        top: "30px",
        right: "0",
        bottom: "30px",
        left: "0",
      },
    },
  },
  render: (props) => {
    const main = props.main ?? {
      thickness: 2,
      color: "#e0e0e0",
      style: "solid" as const,
    };
    const { thickness, color, style } = main;
    return (
      <Section>
        <hr
          style={{
            border: "none",
            borderTop: `${thickness}px ${style} ${color}`,
            margin: 0,
          }}
        />
      </Section>
    );
  },
};

export const Divider = withLayout(DividerInternal);
