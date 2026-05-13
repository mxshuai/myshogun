import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";

export const Divider: ComponentConfig<Components["Divider"]> = {
  fields: {
    thickness: {
      type: "number",
      min: 1,
      max: 10,
    },
    color: {
      type: "text",
    },
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
    thickness: 1,
    color: "#e0e0e0",
    style: "solid",
  },
  render: ({ thickness, color, style }) => {
    return (
      <div style={{ padding: "16px 0" }}>
        <hr
          style={{
            border: "none",
            borderTop: `${thickness}px ${style} ${color}`,
            margin: 0,
          }}
        />
      </div>
    );
  },
};
