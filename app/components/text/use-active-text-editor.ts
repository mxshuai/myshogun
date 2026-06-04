import type { Editor } from "@tiptap/react";

import { getActiveInlineTextEditor } from "./text-active-editor";

/** 侧栏 menu 的 editor 与画布 inline 不是同一实例；优先用画布编辑器 */
export function resolveTextEditor(sidebarEditor: Editor | null): Editor | null {
  return getActiveInlineTextEditor() ?? sidebarEditor;
}
