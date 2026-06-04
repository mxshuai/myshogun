import { Extension } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";

const styleAttribute = (name: string, cssName: string) => ({
  default: null as string | null,
  parseHTML: (element: HTMLElement) => element.style[cssName as keyof CSSStyleDeclaration] as string || null,
  renderHTML: (attributes: Record<string, string | null>) => {
    const v = attributes[name];
    if (!v) return {};
    return { style: `${cssName}: ${v}` };
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

export const textTiptapExtensions = [
  ExtendedTextStyle,
  Color.configure({ types: ["textStyle"] }),
  FontFamily.configure({ types: ["textStyle"] }),
  Image.configure({ inline: true, allowBase64: true }),
  DashList,
];

export type TextEditorUiState = ReturnType<typeof readTextEditorUiState>;

export const emptyTextEditorUiState = (): TextEditorUiState => ({
  fontFamily: "",
  fontSize: "16px",
  fontWeight: "400",
  lineHeight: "",
  letterSpacing: "",
  textColor: "#374151",
  backgroundColor: "",
  paragraphStyle: "paragraph",
  isDashList: false,
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

  return {
    fontFamily: (ts.fontFamily as string) ?? "",
    fontSize: (ts.fontSize as string) ?? "16px",
    fontWeight: (ts.fontWeight as string) ?? "400",
    lineHeight: (ts.lineHeight as string) ?? "",
    letterSpacing: (ts.letterSpacing as string) ?? "",
    textColor: (ts.color as string) ?? "#374151",
    backgroundColor: (ts.backgroundColor as string) ?? "",
    paragraphStyle,
    isDashList,
  };
}

/** 侧栏改样式时不要 focus() 回画布，否则数字输入框会失焦 */
export function setTextStyleMark(
  editor: import("@tiptap/react").Editor,
  attrs: Record<string, string | null>,
) {
  runEditorChainOnScope(editor, (chain) => chain.setMark("textStyle", attrs));
}
