import { Extension, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import Heading, { type Level } from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";

import {
  DEFAULT_TEXT_LETTER_SPACING,
  DEFAULT_TEXT_LINE_HEIGHT,
} from "./text-defaults";
import { textHeadingClass, textHeadingInlineStyle } from "./text-heading";

import {
  DEFAULT_LINK_TEXT_COLOR,
  getLinkMarkRangeReadOnly,
} from "./text-link-utils";

const styleAttribute = (name: string, cssName: string) => ({
  default: null as string | null,
  parseHTML: (element: HTMLElement) => element.style[cssName as keyof CSSStyleDeclaration] as string || null,
  renderHTML: (attributes: Record<string, string | null>) => {
    const v = attributes[name];
    if (!v) return {};
    return { style: `${cssName}: ${v}` };
  },
});

/** 链接下划线可开关（否则仅靠 CSS 无法取消） */
export const VisbuildLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      showUnderline: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-show-underline") !== "false",
        renderHTML: (attrs) => {
          if (attrs.showUnderline === false) {
            return {
              "data-show-underline": "false",
              class: "visbuild-link-no-underline",
              style: "text-decoration: none",
            };
          }
          return {};
        },
      },
    };
  },
});

export const ExtendedTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: styleAttribute("fontSize", "font-size"),
      fontWeight: styleAttribute("fontWeight", "font-weight"),
      lineHeight: styleAttribute("lineHeight", "line-height"),
      letterSpacing: styleAttribute("letterSpacing", "letter-spacing"),
      backgroundColor: styleAttribute("backgroundColor", "background-color"),
    };
  },
});

/** 编辑器根节点带上 .visbuild-text，正文和列表样式才能在画布里生效 */
export const VisbuildTextRootClass = Extension.create({
  name: "visbuildTextRootClass",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        view(editorView) {
          editorView.dom.classList.add("visbuild-text");
          return {
            destroy() {
              editorView.dom.classList.remove("visbuild-text");
            },
          };
        },
      }),
    ];
  },
});

/** Dash-style bullets via list class */
export const DashList = Extension.create({
  name: "dashList",
  addGlobalAttributes() {
    return [
      {
        types: ["bulletList"],
        attributes: {
          class: {
            default: null,
            parseHTML: (el) => el.getAttribute("class"),
            renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
          },
        },
      },
    ];
  },
});

/** 标题输出为 h1–h6，并把标题外观写进行内 style */
export const VisbuildHeading = Heading.extend({
  parseHTML() {
    const levels = this.options.levels;
    return [
      ...levels.map((level: Level) => ({
        tag: `h${level}`,
        attrs: { level },
      })),
      ...levels.map((level: Level) => ({
        tag: `div.${textHeadingClass(level)}`,
        attrs: { level },
      })),
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = this.options.levels.includes(node.attrs.level)
      ? node.attrs.level
      : this.options.levels[0];
    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: textHeadingInlineStyle(level),
      }),
      0,
    ];
  },
});

export const textTiptapExtensions = [
  VisbuildHeading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
  VisbuildLink.configure({
    openOnClick: false,
    HTMLAttributes: { rel: "noopener noreferrer" },
  }),
  ExtendedTextStyle,
  Color.configure({ types: ["textStyle"] }),
  FontFamily.configure({ types: ["textStyle"] }),
  Image.configure({ inline: true, allowBase64: true }),
  DashList,
  VisbuildTextRootClass,
];

export type TextEditorUiState = ReturnType<typeof readTextEditorUiState>;

/** 块级未写 line-height 时与 .visbuild-text { line-height: 1.5 } 一致 */
const VISBUILD_INHERITED_LINE_HEIGHT = "1.5";

export function parseFontSizePx(fontSize: string): number {
  const n = parseInt(String(fontSize).replace(/px$/i, ""), 10);
  return Number.isNaN(n) ? 16 : n;
}

/** 将 line-height（px 或倍率）转为侧栏 PX 数字字符串 */
export function lineHeightToSidebarPx(
  lineHeight: string,
  fontSizePx: number,
): string {
  const raw = lineHeight.trim();
  if (!raw) {
    return String(Math.round(fontSizePx * 1.5));
  }
  if (/^[\d.]+$/.test(raw)) {
    return String(Math.round(parseFloat(raw) * fontSizePx));
  }
  if (/px$/i.test(raw)) {
    const px = parseInt(raw, 10);
    return String(Number.isNaN(px) ? Math.round(fontSizePx * 1.5) : px);
  }
  return String(Math.round(fontSizePx * 1.5));
}

function sidebarPxFromAttr(value: string): string {
  const n = parseInt(String(value).replace(/px$/i, ""), 10);
  return Number.isNaN(n) ? "0" : String(n);
}

/** 选区文字的实际行高、字号（含标题 em）。view 不可用时返回空。 */
function readSelectionMetrics(editor: import("@tiptap/react").Editor): {
  lineHeightPx: string | null;
  fontSizePx: number | null;
} {
  const empty = { lineHeightPx: null, fontSizePx: null };
  try {
    if (editor.isDestroyed) return empty;
    const view = editor.view;
    if (!view?.dom?.isConnected) return empty;
    const pos = Math.max(0, editor.state.selection.from);
    const { node } = view.domAtPos(pos);
    const el: HTMLElement | null =
      node.nodeType === Node.TEXT_NODE
        ? node.parentElement
        : node instanceof HTMLElement
          ? node
          : null;
    if (!el) return empty;
    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize);
    const lh = style.lineHeight;
    const lhPx = parseFloat(lh);
    return {
      lineHeightPx:
        lh && lh !== "normal" && !Number.isNaN(lhPx)
          ? String(Math.round(lhPx))
          : null,
      fontSizePx: Number.isNaN(fontSize) ? null : fontSize,
    };
  } catch {
    return empty;
  }
}

export const emptyTextEditorUiState = (): TextEditorUiState => ({
  fontFamily: "",
  fontSize: "16px",
  fontWeight: "400",
  lineHeightSidebarPx: lineHeightToSidebarPx(
    DEFAULT_TEXT_LINE_HEIGHT,
    16,
  ),
  lineHeightExplicit: false,
  letterSpacingSidebarPx: sidebarPxFromAttr(DEFAULT_TEXT_LETTER_SPACING),
  letterSpacingExplicit: false,
  textColor: "#374151",
  backgroundColor: "",
  paragraphStyle: "paragraph",
  isDashList: false,
  isLink: false,
  isUnderline: false,
});

function hasTextRangeSelection(editor: import("@tiptap/react").Editor) {
  const { empty, from, to } = editor.state.selection;
  return !empty && from < to;
}

/** 有选区 → 仅选区；仅光标/无选区 → 整段 Text 组件全文 */
export function runEditorChainOnScope(
  editor: import("@tiptap/react").Editor,
  build: (
    chain: ReturnType<import("@tiptap/react").Editor["chain"]>,
  ) => ReturnType<import("@tiptap/react").Editor["chain"]>,
) {
  if (hasTextRangeSelection(editor)) {
    build(editor.chain()).run();
    return;
  }
  const anchor = editor.state.selection.from;
  build(editor.chain().selectAll()).run();
  const end = editor.state.doc.content.size;
  const restoreTo = Math.min(Math.max(anchor, 1), Math.max(1, end - 1));
  editor.commands.setTextSelection({ from: restoreTo, to: restoreTo });
}

function readTextStyleAttrs(editor: import("@tiptap/react").Editor) {
  const atSelection = editor.getAttributes("textStyle") ?? {};
  if (hasTextRangeSelection(editor)) return atSelection;

  const hasValue = (attrs: Record<string, unknown>) =>
    Object.values(attrs).some((v) => v != null && v !== "");

  if (hasValue(atSelection)) return atSelection;

  const { doc } = editor.state;
  let fromDoc: Record<string, unknown> = {};
  doc.descendants((node) => {
    if (!node.isText) return true;
    const mark = node.marks.find((m) => m.type.name === "textStyle");
    if (mark) {
      fromDoc = mark.attrs;
      return false;
    }
    return true;
  });
  return fromDoc;
}

function readParagraphStyle(editor: import("@tiptap/react").Editor) {
  if (hasTextRangeSelection(editor)) {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      if (editor.isActive("heading", { level })) return String(level);
    }
    return "paragraph";
  }

  const { doc } = editor.state;
  let style = "paragraph";
  doc.forEach((node) => {
    if (node.type.name === "heading") {
      style = String(node.attrs.level ?? 1);
    } else if (node.type.name === "paragraph") {
      style = "paragraph";
    }
  });
  return style;
}

export function readTextEditorUiState(editor: import("@tiptap/react").Editor) {
  const ts = readTextStyleAttrs(editor);
  const paragraphStyle = readParagraphStyle(editor);
  const isDashList =
    editor.isActive("bulletList") &&
    editor.getAttributes("bulletList")?.class === "visbuild-list-dash";

  const textColor =
    (ts.color as string) ??
    (editor.isActive("link") ? DEFAULT_LINK_TEXT_COLOR : "#374151");

  const markLineHeight = ts.lineHeight as string | undefined;
  const markLetterSpacing = ts.letterSpacing as string | undefined;
  const metrics = readSelectionMetrics(editor);
  const fontSizePx = ts.fontSize
    ? parseFontSizePx(ts.fontSize as string)
    : (metrics.fontSizePx ?? 16);

  return {
    fontFamily: (ts.fontFamily as string) ?? "",
    fontSize: (ts.fontSize as string) ?? "16px",
    fontWeight: (ts.fontWeight as string) ?? "400",
    lineHeightSidebarPx: markLineHeight
      ? lineHeightToSidebarPx(markLineHeight, fontSizePx)
      : (metrics.lineHeightPx ??
        lineHeightToSidebarPx(VISBUILD_INHERITED_LINE_HEIGHT, fontSizePx)),
    lineHeightExplicit: Boolean(markLineHeight),
    letterSpacingSidebarPx: markLetterSpacing
      ? sidebarPxFromAttr(markLetterSpacing)
      : sidebarPxFromAttr(DEFAULT_TEXT_LETTER_SPACING),
    letterSpacingExplicit: Boolean(markLetterSpacing),
    textColor,
    backgroundColor: (ts.backgroundColor as string) ?? "",
    paragraphStyle,
    isDashList,
    isLink: editor.isActive("link"),
    isUnderline: isUnderlineActive(editor),
  };
}

export function isUnderlineActive(editor: import("@tiptap/react").Editor) {
  if (editor.isActive("underline")) return true;
  if (!editor.isActive("link")) return false;
  const link = editor.getAttributes("link") as { showUnderline?: boolean };
  return link.showUnderline !== false;
}

/** 链接内只改链接范围；无选区且非链接时改全文 */
export function toggleTextUnderline(editor: import("@tiptap/react").Editor) {
  const { empty, from, to } = editor.state.selection;
  const hasRange = !empty && from < to;
  const linkRange = editor.isActive("link")
    ? getLinkMarkRangeReadOnly(editor)
    : null;
  const shouldRemove = isUnderlineActive(editor);

  const run = (
    chain: ReturnType<import("@tiptap/react").Editor["chain"]>,
  ) => {
    if (editor.isActive("link")) {
      if (shouldRemove) {
        return chain
          .extendMarkRange("link")
          .updateAttributes("link", { showUnderline: false })
          .unsetMark("underline");
      }
      return chain
        .extendMarkRange("link")
        .updateAttributes("link", { showUnderline: true })
        .setMark("underline");
    }
    return shouldRemove
      ? chain.unsetMark("underline")
      : chain.setMark("underline");
  };

  if (hasRange || linkRange) {
    const range = hasRange ? { from, to } : linkRange!;
    editor.chain().setTextSelection(range).run();
    run(editor.chain()).run();
    return;
  }

  runEditorChainOnScope(editor, run);
}

/** 侧栏改样式时不要 focus() 回画布，否则数字输入框会失焦 */
export function setTextStyleMark(
  editor: import("@tiptap/react").Editor,
  attrs: Record<string, string | null>,
) {
  runEditorChainOnScope(editor, (chain) => chain.setMark("textStyle", attrs));
}
