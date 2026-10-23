"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

import {
  getActiveInlineTextEditor,
  setActiveInlineTextEditor,
} from "./text-active-editor";

/** 注册画布 inline 编辑器，供侧栏 Formatting / 链接弹窗使用 */
export function TextInlineEditorBridge({
  editor,
  children,
}: {
  editor: Editor | null;
  children?: React.ReactNode;
}) {
  if (editor) setActiveInlineTextEditor(editor);

  useEffect(() => {
    if (!editor) {
      setActiveInlineTextEditor(null);
      return;
    }

    setActiveInlineTextEditor(editor);

    const onFocus = () => setActiveInlineTextEditor(editor);
    editor.on("focus", onFocus);

    return () => {
      editor.off("focus", onFocus);
      if (getActiveInlineTextEditor() === editor) {
        setActiveInlineTextEditor(null);
      }
    };
  }, [editor]);

  return <>{children}</>;
}
