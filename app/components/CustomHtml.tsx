import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";

const CustomHtmlInternal: ComponentConfig<Components["CustomHtml"]> = {
  fields: {
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
  defaultProps: {
    html: '<p class="custom-html-intro">Custom HTML</p>',
    css: ".custom-html-intro {\n  margin: 0;\n  color: #333;\n  font-size: 1rem;\n}",
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
  render: ({ html, css }) => (
    <Section>
      <div className="visbuild-custom-html-root">
        {css?.trim() ? (
          <style dangerouslySetInnerHTML={{ __html: css }} />
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: html ?? "" }} />
      </div>
    </Section>
  ),
};

export const CustomHtml = withLayout(CustomHtmlInternal);
