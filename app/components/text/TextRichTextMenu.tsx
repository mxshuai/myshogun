"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { RichTextMenu } from "@puckeditor/core";

import {
  TEXT_FONT_OPTIONS,
  TEXT_FONT_WEIGHT_OPTIONS,
  TEXT_PARAGRAPH_STYLE_OPTIONS,
} from "./text-fonts";
import {
  emptyTextEditorUiState,
  readTextEditorUiState,
  runEditorChainOnScope,
  setTextStyleMark,
  toggleTextUnderline,
} from "./text-tiptap-extensions";
import {
  ImageInsertModal,
  LinkInsertModal,
  SourceCodeModal,
} from "./TextInsertModals";
import { readLinkFormFromEditor } from "./text-link-utils";
import { useSyncTextHtmlToPuck } from "./text-puck-sync";
import { resolveTextEditor } from "./use-active-text-editor";

/** 与 Puck 字段标签（Formatting）一致：--puck-font-size-xxs ≈ 14px */
const sectionLabel: React.CSSProperties = {
  fontSize: "var(--puck-font-size-xxs, 0.875rem)",
  fontWeight: 600,
  color: "var(--puck-color-grey-04, #64748b)",
  margin: "12px 0 6px",
};

const row: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const selectStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  fontSize: "0.875rem",
};

const numStyle: React.CSSProperties = {
  width: 72,
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  fontSize: "0.875rem",
};

type MenuProps = {
  children?: React.ReactNode;
  editor: Editor | null;
  editorState: Record<string, unknown> | null;
};

function applyParagraphStyle(editor: Editor, value: string) {
  runEditorChainOnScope(editor, (chain) => {
    if (value === "paragraph") return chain.setParagraph();
    const level = Number(value) as 1 | 2 | 3 | 4 | 5 | 6;
    return chain.setHeading({ level });
  });
}

function clearFormatting(editor: Editor) {
  runEditorChainOnScope(editor, (chain) =>
    chain.clearNodes().unsetAllMarks(),
  );
}

function setTextAlign(editor: Editor, align: "left" | "center" | "right" | "justify") {
  runEditorChainOnScope(editor, (chain) => chain.setTextAlign(align));
}

function parsePxAttr(value: string): string {
  if (!value) return "";
  const n = parseInt(String(value).replace(/px$/i, ""), 10);
  return Number.isNaN(n) ? "" : String(n);
}

/** 侧栏 PX 数字框：本地草稿 + blur 提交，避免 onChange 抢焦点 */
function SidebarPxInput({
  disabled,
  pxFromEditor,
  onCommit,
}: {
  disabled: boolean;
  pxFromEditor: string;
  onCommit: (px: number | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const focusedRef = useRef(false);

  useEffect(() => {
    if (focusedRef.current) return;
    setDraft(parsePxAttr(pxFromEditor));
  }, [pxFromEditor]);

  return (
    <input
      type="number"
      min={0}
      placeholder=""
      style={numStyle}
      disabled={disabled}
      value={draft}
      onFocus={() => {
        focusedRef.current = true;
        setDraft(parsePxAttr(pxFromEditor));
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focusedRef.current = false;
        const raw = draft.trim();
        if (!raw) {
          onCommit(null);
          return;
        }
        const n = Number(raw);
        onCommit(Number.isNaN(n) || n < 0 ? null : n);
      }}
    />
  );
}

export function TextRichTextMenu({ children, editor: sidebarEditor, editorState }: MenuProps) {
  const [modal, setModal] = useState<"link" | "image" | "code" | null>(null);
  const linkSnapshotRef = useRef<ReturnType<typeof readLinkFormFromEditor> | null>(
    null,
  );
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const syncHtmlToPuck = useSyncTextHtmlToPuck();
  const editor = resolveTextEditor(sidebarEditor);

  useEffect(() => {
    if (!editor || modal) return;
    const onUpdate = () => refresh();
    editor.on("selectionUpdate", onUpdate);
    return () => {
      editor.off("selectionUpdate", onUpdate);
    };
  }, [editor, modal]);

  const st = editor ? readTextEditorUiState(editor) : emptyTextEditorUiState();
  const readOnly = Boolean(
    (editorState as { readOnly?: boolean } | null)?.readOnly,
  );
  const canEdit = Boolean(editor) && !readOnly;

  const afterModalApply = (ed: Editor) => {
    syncHtmlToPuck(ed);
    refresh();
  };

  if (!editor) {
    return <RichTextMenu>{children}</RichTextMenu>;
  }

  return (
    <>
      <div className="visbuild-text-inspector">
        <p style={sectionLabel}>Text decoration</p>
        <div className="visbuild-tool-row">
          <RichTextMenu.Control
            title="Bold"
            active={editor.isActive("bold")}
            disabled={!canEdit}
            icon={<span style={{ fontWeight: 700 }}>B</span>}
            onClick={() =>
              runEditorChainOnScope(editor, (c) => c.toggleBold())
            }
          />
          <RichTextMenu.Control
            title="Italic"
            active={editor.isActive("italic")}
            disabled={!canEdit}
            icon={<span style={{ fontStyle: "italic" }}>I</span>}
            onClick={() =>
              runEditorChainOnScope(editor, (c) => c.toggleItalic())
            }
          />
          <RichTextMenu.Control
            title="Underline"
            active={Boolean(st.isUnderline)}
            disabled={!canEdit}
            icon={<span style={{ textDecoration: "underline" }}>U</span>}
            onClick={() => {
              toggleTextUnderline(editor);
              syncHtmlToPuck(editor);
              refresh();
            }}
          />
          <RichTextMenu.Control
            title="Strikethrough"
            active={editor.isActive("strike")}
            disabled={!canEdit}
            icon={<span style={{ textDecoration: "line-through" }}>S</span>}
            onClick={() =>
              runEditorChainOnScope(editor, (c) => c.toggleStrike())
            }
          />
        </div>

        <p style={sectionLabel}>Paragraph style</p>
        <select
          style={{ ...selectStyle, width: "100%" }}
          disabled={!canEdit}
          value={String(st.paragraphStyle ?? "paragraph")}
          onChange={(e) => applyParagraphStyle(editor, e.target.value)}
        >
          {TEXT_PARAGRAPH_STYLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <p style={sectionLabel}>Font</p>
        <select
          style={{ ...selectStyle, width: "100%", marginBottom: 8 }}
          disabled={!canEdit}
          value={String(st.fontFamily ?? "")}
          onChange={(e) =>
            setTextStyleMark(editor, {
              fontFamily: e.target.value || null,
            })
          }
        >
          {TEXT_FONT_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div style={{ ...row, marginBottom: 8 }}>
          <select
            style={selectStyle}
            disabled={!canEdit}
            value={String(st.fontWeight ?? "400")}
            onChange={(e) =>
              setTextStyleMark(editor, { fontWeight: e.target.value })
            }
          >
            {TEXT_FONT_WEIGHT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SidebarPxInput
            disabled={!canEdit}
            pxFromEditor={String(st.fontSize ?? "16px")}
            onCommit={(n) =>
              setTextStyleMark(editor, {
                fontSize: n == null ? null : `${n}px`,
              })
            }
          />
          <span style={{ fontSize: 12, color: "#64748b" }}>PX</span>
        </div>

        <p style={sectionLabel}>Text and background color</p>
        <div style={row}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Ab</span>
            <input
              type="color"
              disabled={!canEdit}
              value={String(st.textColor ?? "#374151").startsWith("#") ? String(st.textColor) : "#374151"}
              onChange={(e) =>
                setTextStyleMark(editor, { color: e.target.value })
              }
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span title="Background">🪣</span>
            <input
              type="color"
              disabled={!canEdit}
              value={
                String(st.backgroundColor ?? "#ffffff").startsWith("#")
                  ? String(st.backgroundColor)
                  : "#ffffff"
              }
              onChange={(e) =>
                setTextStyleMark(editor, {
                  backgroundColor: e.target.value,
                })
              }
            />
          </label>
        </div>

        <p style={sectionLabel}>Alignment</p>
        <div className="visbuild-tool-row">
          <RichTextMenu.Control
            title="Align left"
            active={editor.isActive({ textAlign: "left" })}
            disabled={!canEdit}
            icon={<span>≡</span>}
            onClick={() => setTextAlign(editor, "left")}
          />
          <RichTextMenu.Control
            title="Align center"
            active={editor.isActive({ textAlign: "center" })}
            disabled={!canEdit}
            icon={<span>≡</span>}
            onClick={() => setTextAlign(editor, "center")}
          />
          <RichTextMenu.Control
            title="Align right"
            active={editor.isActive({ textAlign: "right" })}
            disabled={!canEdit}
            icon={<span>≡</span>}
            onClick={() => setTextAlign(editor, "right")}
          />
          <RichTextMenu.Control
            title="Justify"
            active={editor.isActive({ textAlign: "justify" })}
            disabled={!canEdit}
            icon={<span>≡</span>}
            onClick={() => setTextAlign(editor, "justify")}
          />
        </div>

        <p style={sectionLabel}>List and indentation</p>
        <div className="visbuild-tool-row">
          <RichTextMenu.Control
            title="Dash list"
            active={Boolean(st.isDashList)}
            disabled={!canEdit}
            icon={<span>—</span>}
            onClick={() => {
              if (st.isDashList) {
                runEditorChainOnScope(editor, (c) => c.toggleBulletList());
              } else {
                runEditorChainOnScope(editor, (c) =>
                  c
                    .toggleBulletList()
                    .updateAttributes("bulletList", {
                      class: "visbuild-list-dash",
                    }),
                );
              }
            }}
          />
          <RichTextMenu.Control
            title="Bullet list"
            active={editor.isActive("bulletList") && !st.isDashList}
            disabled={!canEdit}
            icon={<span>•</span>}
            onClick={() =>
              runEditorChainOnScope(editor, (c) => c.toggleBulletList())
            }
          />
          <RichTextMenu.Control
            title="Ordered list"
            active={editor.isActive("orderedList")}
            disabled={!canEdit}
            icon={<span>1.</span>}
            onClick={() =>
              runEditorChainOnScope(editor, (c) => c.toggleOrderedList())
            }
          />
        </div>

        <p style={sectionLabel}>Line height and letter spacing</p>
        <div style={{ ...row, marginBottom: 8 }}>
          <SidebarPxInput
            disabled={!canEdit}
            pxFromEditor={String(st.lineHeight ?? "")}
            onCommit={(n) =>
              setTextStyleMark(editor, {
                lineHeight: n == null ? null : `${n}px`,
              })
            }
          />
          <span style={{ fontSize: 12, color: "#64748b" }}>PX</span>
          <SidebarPxInput
            disabled={!canEdit}
            pxFromEditor={String(st.letterSpacing ?? "")}
            onCommit={(n) =>
              setTextStyleMark(editor, {
                letterSpacing: n == null ? null : `${n}px`,
              })
            }
          />
          <span style={{ fontSize: 12, color: "#64748b" }}>PX</span>
        </div>

        <p style={sectionLabel}>Insert…</p>
        <div className="visbuild-tool-row visbuild-tool-row--insert">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => {
              if (editor) {
                linkSnapshotRef.current = readLinkFormFromEditor(editor);
              }
              setModal("link");
            }}
            style={toolBtn}
          >
            Link
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setModal("image")}
            style={toolBtn}
          >
            Image
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setModal("code")}
            style={toolBtn}
          >
            Code
          </button>
        </div>

        <button
          type="button"
          disabled={!canEdit}
          onClick={() => clearFormatting(editor)}
          style={{
            marginTop: 12,
            border: "none",
            background: "none",
            color: "#64748b",
            fontSize: "0.875rem",
            cursor: canEdit ? "pointer" : "not-allowed",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Clear text formatting
        </button>
      </div>

      {modal === "link" && linkSnapshotRef.current ? (
        <LinkInsertModal
          key={`link-${linkSnapshotRef.current.form.url}-${linkSnapshotRef.current.range?.from ?? 0}`}
          editor={editor}
          initial={linkSnapshotRef.current}
          onClose={() => setModal(null)}
          onApplied={afterModalApply}
        />
      ) : null}
      {modal === "image" ? (
        <ImageInsertModal
          editor={editor}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "code" ? (
        <SourceCodeModal
          editor={editor}
          onClose={() => {
            syncHtmlToPuck(editor);
            setModal(null);
          }}
        />
      ) : null}
    </>
  );
}

const toolBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: "0.875rem",
  cursor: "pointer",
};

