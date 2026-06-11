import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";

const DividerInternal: ComponentConfig<Components["Divider"]> = {
  fields: {
    thickness: {
      type: "number",
      min: 1,
      max: 10,
    },
    color: createPuckColorField("Color", "#e0e0e0"),
    style: {
      type: "select",
      options: [
        { label: "Solid", value: "solid" },
        { label: "Dashed", value: "dashed" },
        { label: "Dotted", value: "dotted" },
      ],
    },
  },
  defaultProps: {
    thickness: 2,
    color: "#e0e0e0",
    style: "solid",
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
  render: ({ thickness, color, style }) => {
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
