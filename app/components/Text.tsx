import { isValidElement, type ReactNode } from "react";
import type { ComponentConfig } from "@puckeditor/core";
import { RichTextMenu } from "@puckeditor/core";

import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import { DEFAULT_TEXT_HTML } from "./text/text-defaults";
import { TextRichTextMenu } from "./text/TextRichTextMenu";
import { textTiptapExtensions } from "./text/text-tiptap-extensions";

import "./text/text-rich-text.css";

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function staticHtmlFromProps(props: {
  html?: unknown;
  text?: string;
}): string {
  if (typeof props.html === "string" && props.html.trim()) {
    return props.html;
  }
  if (typeof props.text === "string" && props.text.trim()) {
    return `<p>${escapeHtmlText(props.text)}</p>`;
  }
  return DEFAULT_TEXT_HTML;
}

function renderTextBody(htmlProp: unknown, legacyText?: string): ReactNode {
  /** 编辑态：Puck 将 html 替换为 inline TipTap 组件，必须原样渲染 */
  if (isValidElement(htmlProp)) {
    return <div className="visbuild-text visbuild-text--editing">{htmlProp}</div>;
  }

  const raw =
    typeof htmlProp === "string" && htmlProp.trim()
      ? htmlProp
      : typeof legacyText === "string" && legacyText.trim()
        ? `<p>${escapeHtmlText(legacyText)}</p>`
        : DEFAULT_TEXT_HTML;

  return (
    <div
      className="visbuild-text"
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  );
}

const TextInternal: ComponentConfig<Components["Text"]> = {
  fields: {
    html: {
      type: "richtext",
      label: "Formatting",
      contentEditable: true,
      options: {
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      },
      tiptap: {
        extensions: textTiptapExtensions,
      },
      renderMenu: ({ editor, editorState }) => (
        <TextRichTextMenu editor={editor} editorState={editorState} />
      ),
      renderInlineMenu: ({ children }: { children?: ReactNode }) => (
        <RichTextMenu>{children}</RichTextMenu>
      ),
    },
    maxWidth: { type: "text" },
  },
  defaultProps: {
    html: DEFAULT_TEXT_HTML,
    layout: defaultLayoutSpacing,
  },
  render: (props) => (
    <Section maxWidth={props.maxWidth}>
      {renderTextBody(props.html, props.text)}
    </Section>
  ),
};

export const Text = withLayout(TextInternal);
