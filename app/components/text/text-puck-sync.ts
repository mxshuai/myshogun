import { useGetPuck } from "@puckeditor/core";
import type { Editor } from "@tiptap/react";

/** 侧栏/弹窗改完富文本后写回 Puck（画布 inline 失焦时 TipTap onUpdate 不会触发 onChange） */
export function useSyncTextHtmlToPuck() {
  const getPuck = useGetPuck();

  return (editor: Editor | null) => {
    if (!editor) return;

    const puck = getPuck();
    const item = puck.selectedItem;
    if (!item || item.type !== "Text") return;

    const componentId = (item.props as { id?: string }).id;
    if (!componentId) return;

    const selector = puck.getSelectorForId(componentId);
    if (!selector) return;

    puck.dispatch({
      type: "replace",
      data: {
        ...item,
        props: {
          ...item.props,
          html: editor.getHTML(),
        },
      },
      destinationIndex: selector.index,
      destinationZone: selector.zone,
    });
  };
}
