import type { CustomField } from "@puckeditor/core";
import { FieldLabel } from "@puckeditor/core";

import { SidebarColorInput } from "./SidebarColorInput";

/**
 * Puck 侧栏颜色字段工厂：色块 + hex 输入，供 Button / Image / Heading 等复用。
 * custom 字段需自行渲染 FieldLabel（Puck 不会为 custom 自动加标签）。
 */
export function createPuckColorField(
  label: string,
  fallback = "#000000"
): CustomField<string | undefined> {
  return {
    type: "custom",
    label,
    render: ({ value, onChange, readOnly }) => (
      <FieldLabel label={label} readOnly={readOnly}>
        <SidebarColorInput
          value={value}
          fallback={fallback}
          disabled={readOnly}
          onChange={onChange}
        />
      </FieldLabel>
    ),
  };
}
