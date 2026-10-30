import { useState } from "react";
import type { Data } from "@puckeditor/core";
import { convertToHTML } from "~/lib/convert-to-html";

interface ViewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Data;
}

export function ViewPageModal({ isOpen, onClose, data }: ViewPageModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'html'>('json');

  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);
  const htmlString = convertToHTML(data);
  
  const currentContent = activeTab === 'json' ? jsonString : htmlString;
  const fileExtension = activeTab === 'json' ? 'json' : 'html';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-data.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "900px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
            Page Source Code
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
          }}
        >
          {(['json', 'html'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCopied(false);
              }}
              style={{
                flex: 1,
                padding: "12px 24px",
                backgroundColor: activeTab === tab ? "#ffffff" : "transparent",
                border: "none",
                borderBottom: activeTab === tab ? "2px solid #0070f3" : "2px solid transparent",
                cursor: "pointer",
                fontWeight: activeTab === tab ? 600 : 400,
                fontSize: "0.875rem",
                color: activeTab === tab ? "#0070f3" : "#666",
                transition: "all 0.2s ease",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = "#f0f0f0";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            gap: "12px",
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 16px",
              backgroundColor: copied ? "#10b981" : "#0070f3",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "0.875rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.backgroundColor = "#0051a2";
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.backgroundColor = "#0070f3";
              }
            }}
          >
            {copied ? "✓ Copied!" : `Copy ${activeTab.toUpperCase()}`}
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: "0.875rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#545b62";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#6c757d";
            }}
          >
            Download {fileExtension.toUpperCase()}
          </button>
        </div>

        {/* Code Display */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "24px",
            backgroundColor: "#f8f9fa",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#333",
              fontFamily: "'Monaco', 'Menlo', 'Courier New', monospace",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          >
            {currentContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
