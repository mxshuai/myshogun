import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { withLayout } from "./Layout";

const RawHTMLInternal: ComponentConfig<Components["RawHTML"]> = {
  fields: {
    html: {
      type: "textarea",
      label: "HTML (imported)",
    },
  },
  defaultProps: {
    html: "<p>Imported HTML</p>",
    layout: { padding: "0" },
  },
  render: ({ html }) => (
    <div
      className="visbuild-raw-html"
      dangerouslySetInnerHTML={{ __html: html ?? "" }}
    />
  ),
};

export const RawHTML = withLayout(RawHTMLInternal);
