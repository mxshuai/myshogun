"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

import { DEFAULT_IMAGE_FORM, DEFAULT_LINK_FORM } from "./text-defaults";

const accent = "#7c3aed";

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 24,
          minWidth: 360,
          maxWidth: "92vw",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: "1.25rem",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            ×
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 500,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  boxSizing: "border-box",
  marginBottom: 14,
};

export function LinkInsertModal({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...DEFAULT_LINK_FORM });

  const submit = () => {
    const href = form.url.trim() || "http://";
    const label = form.text.trim() || href;
    const attrs = {
      href,
      title: form.title.trim() || undefined,
      target: form.openInNewWindow ? "_blank" : undefined,
      rel: form.openInNewWindow ? "noopener noreferrer" : undefined,
    };
    const { empty } = editor.state.selection;
    if (empty) {
      const target = form.openInNewWindow ? ' target="_blank" rel="noopener noreferrer"' : "";
      const titleAttr = form.title.trim()
        ? ` title="${form.title.trim().replace(/"/g, "&quot;")}"`
        : "";
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${href.replace(/"/g, "&quot;")}"${titleAttr}${target}>${label}</a>`,
        )
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink(attrs).run();
    }
    onClose();
  };

  return (
    <ModalShell
      title="Insert or edit a link"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
          <button
            type="button"
            onClick={submit}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              background: accent,
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Insert link
          </button>
        </div>
      }
    >
      <label style={labelStyle}>URL</label>
      <input
        style={inputStyle}
        value={form.url}
        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
      />
      <label style={labelStyle}>Text to display</label>
      <input
        style={inputStyle}
        placeholder="Type your text here"
        value={form.text}
        onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
      />
      <label style={labelStyle}>Title</label>
      <input
        style={inputStyle}
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: "0.875rem",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={form.openInNewWindow}
          onChange={(e) =>
            setForm((f) => ({ ...f, openInNewWindow: e.target.checked }))
          }
        />
        Open link in new window
      </label>
    </ModalShell>
  );
}

export function ImageInsertModal({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...DEFAULT_IMAGE_FORM });
  const fileRef = useRef<HTMLInputElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!form.lockAspectRatio || !form.width || !form.height) return;
    const w = Number(form.width);
    const h = Number(form.height);
    if (w > 0 && h > 0) setRatio(w / h);
  }, [form.lockAspectRatio]);

  const onWidth = (raw: string) => {
    setForm((f) => {
      const next = { ...f, width: raw };
      if (f.lockAspectRatio && ratio && raw) {
        const w = Number(raw);
        if (w > 0) next.height = String(Math.round(w / ratio));
      }
      return next;
    });
  };

  const onHeight = (raw: string) => {
    setForm((f) => {
      const next = { ...f, height: raw };
      if (f.lockAspectRatio && ratio && raw) {
        const h = Number(raw);
        if (h > 0) next.width = String(Math.round(h * ratio));
      }
      return next;
    });
  };

  const canInsert = Boolean(form.url.trim());

  const submit = () => {
    const src = form.url.trim();
    if (!src) return;
    const attrs: { src: string; alt?: string; width?: number; height?: number } = {
      src,
      alt: form.alt.trim() || undefined,
    };
    const w = Number(form.width);
    const h = Number(form.height);
    if (w > 0) attrs.width = w;
    if (h > 0) attrs.height = h;
    editor.chain().focus().setImage(attrs).run();
    onClose();
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result ?? "");
      setForm((f) => ({ ...f, url }));
      const img = new Image();
      img.onload = () => {
        setRatio(img.width / img.height);
        setForm((f) => ({
          ...f,
          url,
          width: f.width || String(img.width),
          height: f.height || String(img.height),
        }));
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  return (
    <ModalShell
      title="Insert or edit an image"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 8 }}>
          <button
            type="button"
            disabled={!canInsert}
            onClick={submit}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              background: canInsert ? accent : "#cbd5e1",
              color: "#fff",
              fontWeight: 600,
              cursor: canInsert ? "pointer" : "not-allowed",
            }}
          >
            Insert Image
          </button>
        </div>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 6,
          border: "none",
          background: accent,
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 12,
        }}
      >
        Select image…
      </button>
      <p style={{ textAlign: "center", color: "#94a3b8", margin: "8px 0" }}>or</p>
      <label style={labelStyle}>Image URL</label>
      <input
        style={inputStyle}
        placeholder="http://"
        value={form.url}
        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
      />
      <label style={labelStyle}>Alt text</label>
      <input
        style={inputStyle}
        value={form.alt}
        onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Image width</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              style={{ ...inputStyle, marginBottom: 0 }}
              type="number"
              min={0}
              value={form.width}
              onChange={(e) => onWidth(e.target.value)}
            />
            <span style={{ fontSize: 12, color: "#64748b" }}>PX</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Image height</label>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              style={{ ...inputStyle, marginBottom: 0 }}
              type="number"
              min={0}
              value={form.height}
              onChange={(e) => onHeight(e.target.value)}
            />
            <span style={{ fontSize: 12, color: "#64748b" }}>PX</span>
          </div>
        </div>
        <button
          type="button"
          title={form.lockAspectRatio ? "Constrain proportions on" : "Constrain proportions off"}
          onClick={() =>
            setForm((f) => ({ ...f, lockAspectRatio: !f.lockAspectRatio }))
          }
          style={{
            border: "none",
            background: form.lockAspectRatio ? "#ede9fe" : "#f1f5f9",
            color: accent,
            borderRadius: 6,
            padding: "10px 12px",
            cursor: "pointer",
            marginBottom: 2,
          }}
        >
          ⛓
        </button>
      </div>
    </ModalShell>
  );
}

export function SourceCodeModal({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const [code, setCode] = useState(editor.getHTML());

  const save = () => {
    editor.chain().focus().setContent(code, { emitUpdate: true }).run();
    onClose();
  };

  return (
    <ModalShell
      title="Source Code"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 14px" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </div>
      }
    >
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{
          width: "100%",
          minHeight: 220,
          padding: 12,
          borderRadius: 6,
          border: "1px solid #7dd3fc",
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
          boxSizing: "border-box",
        }}
      />
    </ModalShell>
  );
}
