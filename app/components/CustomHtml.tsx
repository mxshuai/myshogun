import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { withLayout } from "./Layout";

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
      padding: "8px",
    },
  },
  render: ({ html, css }) => {
    return (
      <div className="puck-custom-html-root">
        {css?.trim() ? (
          <style dangerouslySetInnerHTML={{ __html: css }} />
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: html ?? "" }} />
      </div>
    );
  },
};

export const CustomHtml = withLayout(CustomHtmlInternal);
