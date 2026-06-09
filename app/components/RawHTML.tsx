import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
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
  },
  render: ({ html }) => (
    <Section>
      <div
        className="visbuild-raw-html"
        dangerouslySetInnerHTML={{ __html: html ?? "" }}
      />
    </Section>
  ),
};

export const RawHTML = withLayout(RawHTMLInternal);
