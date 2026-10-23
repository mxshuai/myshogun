import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/react";
import type { ComponentConfig } from "@puckeditor/core";
import { RichTextMenu } from "@puckeditor/core";

import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import { DEFAULT_TEXT_HTML } from "./text/text-defaults";
import { replaceTextHeadingTags, TEXT_CONTENT_CSS } from "./text/text-heading";
import { TextInlineEditorBridge } from "./text/TextInlineEditorBridge";
import { TextRichTextMenu } from "./text/TextRichTextMenu";
import { textTiptapExtensions } from "./text/text-tiptap-extensions";

import "./text/text-rich-text.css";

function mergeClassNames(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function renderTextBody(htmlProp: unknown): ReactNode {
  /** 编辑态：Puck 将 html 替换为 inline TipTap（含 overlay portal），避免再包一层 div 阻断选中 */
  if (isValidElement(htmlProp)) {
    const existing = (htmlProp.props as { className?: string }).className;
    return cloneElement(htmlProp as ReactElement<{ className?: string }>, {
      className: mergeClassNames(existing, "visbuild-text", "visbuild-text--editing"),
    });
  }

  const raw =
    typeof htmlProp === "string" && htmlProp.trim()
      ? htmlProp
      : DEFAULT_TEXT_HTML;

  return (
    <div
      className="visbuild-text"
      dangerouslySetInnerHTML={{ __html: replaceTextHeadingTags(raw) }}
    />
  );
}

const TextInternal: ComponentConfig<Components["Text"]> = {
  inline: true,
  fields: {
    main: {
      type: "object",
      label: "Main",
      defaultOpen: true,
      objectFields: {
        html: {
          type: "richtext",
          label: "",
          contentEditable: true,
          options: {
            heading: false,
            link: false,
          },
          tiptap: {
            extensions: textTiptapExtensions,
          },
          renderMenu: ({ editor, editorState }) => (
            <TextRichTextMenu editor={editor} editorState={editorState} />
          ),
          renderInlineMenu: ({ editor, children }: { editor: Editor | null; children?: ReactNode }) => (
            <TextInlineEditorBridge editor={editor}>
              <RichTextMenu>{children}</RichTextMenu>
            </TextInlineEditorBridge>
          ),
        },
      },
    },
  },
  defaultProps: {
    main: {
      html: DEFAULT_TEXT_HTML,
    },
    layout: {
      ...defaultLayoutSpacing,
      sectionPadding: {
        top: "16px",
        right: "0",
        bottom: "16px",
        left: "0",
      },
    },
  },
  render: (props) => {
    const main = props.main ?? { html: DEFAULT_TEXT_HTML };
    return (
      <Section>
        <style>{TEXT_CONTENT_CSS}</style>
        {renderTextBody(main.html)}
      </Section>
    );
  },
};

export const Text = withLayout(TextInternal);
