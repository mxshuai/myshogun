import type { CustomField } from "@puckeditor/core";

import { SidebarColorInput } from "./SidebarColorInput";

/**
 * Puck 侧栏颜色字段：标签在左，色块在右。点击色块打开拾色面板。
 */
export function createPuckColorField(
  label: string,
  fallback = "#000000"
): CustomField<string> {
  const fieldKey = `${label}|${fallback}`;
  return {
    type: "custom",
    label,
    render: ({ value, onChange, readOnly }) => (
      <div className="visbuild-inline-color">
        <span className="visbuild-inline-color__label">{label}</span>
        <SidebarColorInput
          fieldKey={fieldKey}
          value={value}
          fallback={fallback}
          disabled={readOnly}
          onChange={onChange}
        />
      </div>
    ),
  };
}
