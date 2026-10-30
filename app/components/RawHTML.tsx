import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";

const defaultMain: Components["RawHTML"]["main"] = {
  html: "<p>Imported HTML</p>",
};

const RawHTMLInternal: ComponentConfig<Components["RawHTML"]> = {
  fields: {
    main: {
      type: "object",
      label: "Main",
      defaultOpen: true,
      objectFields: {
        html: {
          type: "textarea",
          label: "HTML (imported)",
        },
      },
    },
  },
  defaultProps: {
    main: { ...defaultMain },
  },
  render: (props) => {
    const { html } = props.main ?? defaultMain;
    return (
      <Section>
        <div
          className="visbuild-raw-html"
          dangerouslySetInnerHTML={{ __html: html ?? "" }}
        />
      </Section>
    );
  },
};

export const RawHTML = withLayout(RawHTMLInternal);
