import type { Editor } from "@tiptap/react";

import type { LinkFormState } from "./text-defaults";
import { DEFAULT_LINK_FORM } from "./text-defaults";

/** 插入链接默认字色（可在属性面板用 textStyle 覆盖） */
export const DEFAULT_LINK_TEXT_COLOR = "#2563eb";

export type LinkMarkRange = { from: number; to: number };

/** 只读：不 dispatch 选区命令，避免渲染期触发 transaction 导致父组件 setState */
export function getLinkMarkRangeReadOnly(editor: Editor): LinkMarkRange | null {
  const { state } = editor;
  const { from, to, empty } = state.selection;

  if (!empty && editor.isActive("link")) {
    return { from, to };
  }

  if (!editor.isActive("link")) return null;

  const $pos = state.doc.resolve(from);
  const linkMark = $pos.marks().find((m) => m.type.name === "link");
  if (!linkMark) return null;

  const parentStart = $pos.start();
  const parentEnd = $pos.end();
  let start = from;
  let end = from;

  while (start > parentStart) {
    const $before = state.doc.resolve(start - 1);
    const mark = $before.marks().find((m) => m.type.name === "link" && m.eq(linkMark));
    if (!mark) break;
    start -= 1;
  }

  while (end < parentEnd) {
    const $at = state.doc.resolve(end);
    const mark = $at.marks().find((m) => m.type.name === "link" && m.eq(linkMark));
    if (!mark) break;
    end += 1;
  }

  return { from: start, to: end };
}

/** 写入前扩展链接选区（会 dispatch transaction，仅用于提交/删除） */
export function getLinkMarkRange(editor: Editor): LinkMarkRange | null {
  const readOnly = getLinkMarkRangeReadOnly(editor);
  if (!readOnly) return null;
  editor.commands.setTextSelection(readOnly);
  return readOnly;
}

export type LinkFormSnapshot = {
  form: LinkFormState;
  range: LinkMarkRange | null;
  editingExisting: boolean;
};

export function readLinkFormFromEditor(editor: Editor): LinkFormSnapshot {
  const { from, to, empty } = editor.state.selection;
  const range = getLinkMarkRangeReadOnly(editor);
  const link = editor.getAttributes("link");
  const editingExisting = Boolean(link.href && range);

  if (editingExisting && range) {
    return {
      editingExisting: true,
      range,
      form: {
        url: String(link.href ?? ""),
        text: editor.state.doc.textBetween(range.from, range.to, ""),
        title: String(link.title ?? ""),
        openInNewWindow: link.target === "_blank",
      },
    };
  }

  const selectedText = empty ? "" : editor.state.doc.textBetween(from, to, "");

  return {
    editingExisting: false,
    range: empty ? null : { from, to },
    form: {
      ...DEFAULT_LINK_FORM,
      text: selectedText || DEFAULT_LINK_FORM.text,
      openInNewWindow: true,
    },
  };
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeHtmlText(value: string): string {
  return escapeHtmlAttr(value).replace(/>/g, "&gt;");
}

function linkAttrsFromForm(form: LinkFormState) {
  const href = form.url.trim();
  const open = form.openInNewWindow;
  return {
    href,
    title: form.title.trim() || undefined,
    target: open ? "_blank" : undefined,
    rel: open ? "noopener noreferrer" : undefined,
    showUnderline: true,
  };
}

function buildLinkHtml(form: LinkFormState, label: string) {
  const href = escapeHtmlAttr(form.url.trim());
  const titleAttr = form.title.trim()
    ? ` title="${escapeHtmlAttr(form.title.trim())}"`
    : "";
  const target = form.openInNewWindow
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  const style = `color:${DEFAULT_LINK_TEXT_COLOR}`;
  return `<a href="${href}" style="${style}"${titleAttr}${target}>${escapeHtmlText(label)}</a>`;
}

/** 新链接着色：蓝字 + 下划线（textStyle + underline mark，可被属性面板改） */
export function applyDefaultLinkTextMarks(
  editor: Editor,
  range: LinkMarkRange,
) {
  editor
    .chain()
    .setTextSelection(range)
    .setMark("textStyle", { color: DEFAULT_LINK_TEXT_COLOR })
    .setMark("underline")
    .run();
}

/** 移除链接及默认链接装饰（保留其它 textStyle 如字号） */
export function removeLinkAndDefaultStyles(editor: Editor, range: LinkMarkRange) {
  editor.chain().setTextSelection(range).run();
  const ts = editor.getAttributes("textStyle") ?? {};
  const { color: _c, ...rest } = ts as Record<string, string | null>;
  editor
    .chain()
    .setTextSelection(range)
    .unsetLink()
    .unsetMark("underline")
    .setMark("textStyle", { ...rest, color: null })
    .run();
}

function insertLinkWithDefaultStyle(
  editor: Editor,
  form: LinkFormState,
  label: string,
) {
  const attrs = linkAttrsFromForm(form);
  editor.chain().focus().insertContent(buildLinkHtml(form, label)).run();
  const range = getLinkMarkRange(editor);
  if (range) {
    editor.chain().setTextSelection(range).setLink(attrs).run();
    applyDefaultLinkTextMarks(editor, range);
  }
}

export function applyLinkForm(
  editor: Editor,
  form: LinkFormState,
  options: {
    editingExisting: boolean;
    range: LinkMarkRange | null;
  },
) {
  const href = form.url.trim();
  const { editingExisting, range } = options;

  if (!href) {
    const unlinkRange = range ?? getLinkMarkRange(editor);
    if (unlinkRange) removeLinkAndDefaultStyles(editor, unlinkRange);
    return;
  }

  const attrs = linkAttrsFromForm(form);
  const label = form.text.trim() || href;

  if (editingExisting && range) {
    const currentText = editor.state.doc.textBetween(range.from, range.to, "");
    if (label !== currentText) {
      editor.chain().setTextSelection(range).deleteSelection().run();
      insertLinkWithDefaultStyle(editor, form, label);
    } else {
      editor
        .chain()
        .setTextSelection(range)
        .extendMarkRange("link")
        .setLink(attrs)
        .run();
    }
    return;
  }

  const { empty } = editor.state.selection;
  if (!empty && range) {
    editor.chain().focus().setTextSelection(range).setLink(attrs).run();
    applyDefaultLinkTextMarks(editor, range);
    return;
  }

  insertLinkWithDefaultStyle(editor, form, label);
}
