import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";

export const Spacer: ComponentConfig<Components["Spacer"]> = {
  fields: {
    height: {
      type: "number",
      min: 0,
      max: 200,
    },
  },
  defaultProps: {
    height: 32,
  },
  render: ({ height }) => {
    return <div style={{ height: `${height}px` }} />;
  },
};
