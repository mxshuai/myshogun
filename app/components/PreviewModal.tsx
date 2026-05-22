import type { Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";

import { config } from "../../visbuild.config";

function stripPublicRootProps(data: Data): Data {
  const props = { ...(data.root?.props as Record<string, unknown>) };
  delete props.pagePath;
  return {
    ...data,
    root: { ...data.root, props },
  };
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Data;
}

/**
 * 弹窗内用 Puck Render 展示当前编辑数据对应的页面（与前台预览一致，不暴露 pagePath）。
 */
export function PreviewModal({ isOpen, onClose, data }: PreviewModalProps) {
  if (!isOpen) return null;

  const previewData = stripPublicRootProps(data);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          width: "96%",
          maxWidth: "1200px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600 }}>
            Preview
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
              padding: "0 8px",
              lineHeight: 1,
            }}
            aria-label="Close preview"
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "16px 24px",
            backgroundColor: "#f8f9fa",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              minHeight: "100%",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
            }}
          >
            <Render config={config} data={previewData} />
          </div>
        </div>
      </div>
    </div>
  );
}
