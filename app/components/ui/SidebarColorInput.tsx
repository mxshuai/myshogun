import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  normalizeHexColor,
  toColorInputValue,
} from "./sidebar-color-utils";

import "./sidebar-color-input.css";

export type SidebarColorInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  /** color input 无法解析时的回退色 */
  fallback?: string;
  disabled?: boolean;
  /** 可选前缀标签，如 Text 的 Ab / 背景桶图标位 */
  prefix?: ReactNode;
  showHexInput?: boolean;
  hexPlaceholder?: string;
};

export function SidebarColorInput({
  value,
  onChange,
  fallback = "#000000",
  disabled = false,
  prefix,
  showHexInput = true,
  hexPlaceholder = "#000000",
}: SidebarColorInputProps) {
  const resolved = normalizeHexColor(value, fallback);
  const [hexDraft, setHexDraft] = useState(resolved);
  const hexFocusedRef = useRef(false);

  useEffect(() => {
    if (hexFocusedRef.current) return;
    setHexDraft(resolved);
  }, [resolved]);

  const commitHex = (raw: string) => {
    const next = normalizeHexColor(raw, fallback);
    onChange(next);
    setHexDraft(next);
  };

  return (
    <div className="visbuild-sidebar-color">
      {prefix ? (
        <span className="visbuild-sidebar-color__prefix">{prefix}</span>
      ) : null}
      <input
        type="color"
        className="visbuild-sidebar-color__picker"
        disabled={disabled}
        value={toColorInputValue(value, fallback)}
        onChange={(e) => {
          const next = e.target.value.toLowerCase();
          onChange(next);
          setHexDraft(next);
        }}
        aria-label="Color picker"
      />
      {showHexInput ? (
        <input
          type="text"
          className="visbuild-sidebar-color__hex"
          disabled={disabled}
          value={hexDraft}
          placeholder={hexPlaceholder}
          spellCheck={false}
          onFocus={() => {
            hexFocusedRef.current = true;
          }}
          onChange={(e) => setHexDraft(e.target.value)}
          onBlur={() => {
            hexFocusedRef.current = false;
            commitHex(hexDraft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
      ) : null}
    </div>
  );
}

/** Text 等场景：文字色 + 背景色并排 */
export function SidebarColorPair({
  textValue,
  backgroundValue,
  onTextChange,
  onBackgroundChange,
  textFallback = "#374151",
  backgroundFallback = "#ffffff",
  disabled = false,
}: {
  textValue?: string | null;
  backgroundValue?: string | null;
  onTextChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
  textFallback?: string;
  backgroundFallback?: string;
  disabled?: boolean;
}) {
  return (
    <div className="visbuild-sidebar-color-pair">
      <SidebarColorInput
        value={textValue}
        onChange={onTextChange}
        fallback={textFallback}
        disabled={disabled}
        prefix={<span className="visbuild-sidebar-color__abbr">Ab</span>}
      />
      <SidebarColorInput
        value={backgroundValue}
        onChange={onBackgroundChange}
        fallback={backgroundFallback}
        disabled={disabled}
        prefix={
          <span
            className="visbuild-sidebar-color__abbr visbuild-sidebar-color__abbr--bg"
            title="Background"
          >
            Bg
          </span>
        }
      />
    </div>
  );
}
