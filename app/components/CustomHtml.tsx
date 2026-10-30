import type { ComponentConfig, Fields } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";

const defaultMain: Components["CustomHtml"]["main"] = {
  html: '<p class="custom-html-intro">Custom HTML</p>',
  css: ".custom-html-intro {\n  margin: 0;\n  color: #333;\n  font-size: 1rem;\n}",
};

const CustomHtmlInternal: ComponentConfig<Components["CustomHtml"]> = {
  fields: {
    main: {
      type: "object",
      label: "Main",
      defaultOpen: true,
      objectFields: {
        html: {
          type: "textarea",
          label: "HTML",
          placeholder: "<div>...</div>",
          initialHeight: 200,
        },
        css: {
          type: "textarea",
          label: "CSS",
          placeholder: ".my-class { ... }",
          initialHeight: 160,
        },
      },
    },
  } as Fields<Components["CustomHtml"]>,
  defaultProps: {
    main: { ...defaultMain },
    layout: {
      ...defaultLayoutSpacing,
      sectionPadding: {
        top: "8px",
        right: "0",
        bottom: "8px",
        left: "0",
      },
    },
  },
  render: (props) => {
    const { html, css } = props.main ?? defaultMain;
    return (
      <Section>
        <div className="visbuild-custom-html-root">
          {css?.trim() ? (
            <style dangerouslySetInnerHTML={{ __html: css }} />
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: html ?? "" }} />
        </div>
      </Section>
    );
  },
};

export const CustomHtml = withLayout(CustomHtmlInternal);
