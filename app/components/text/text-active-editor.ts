import type { Editor } from "@tiptap/react";

/** 画布 inline TipTap（contentEditable）；侧栏菜单应优先用它 */
let activeInlineTextEditor: Editor | null = null;

export function setActiveInlineTextEditor(editor: Editor | null) {
  activeInlineTextEditor = editor;
}

export function getActiveInlineTextEditor(): Editor | null {
  return activeInlineTextEditor;
}
