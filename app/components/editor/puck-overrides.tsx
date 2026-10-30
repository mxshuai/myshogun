import { useState, type ReactNode } from "react";
import type { Overrides } from "@puckeditor/core";

import { InlineLayoutField } from "../ui/inline-number-field";

type CollapsibleObjectFieldProps = {
  children: ReactNode;
  name: string;
  field: { label?: string; defaultOpen?: boolean };
};

/** object 分组：左侧箭头 + summary。defaultOpen 为 true 时初始展开，否则收起。 */
function CollapsibleObjectField({
  children,
  field,
  name,
}: CollapsibleObjectFieldProps) {
  const title = field.label || name;
  const [open, setOpen] = useState(field.defaultOpen === true);

  return (
    <details
      className="visbuild-collapsible-object"
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary className="visbuild-collapsible-object__summary">
        <span className="visbuild-collapsible-object__chevron" aria-hidden="true" />
        {title}
      </summary>
      <div className="visbuild-collapsible-object__body">{children}</div>
    </details>
  );
}

const inlineLayout = InlineLayoutField as NonNullable<
  Overrides["fieldTypes"]
>["text"];

export const visbuildPuckFieldTypes: NonNullable<Overrides["fieldTypes"]> = {
  object: CollapsibleObjectField as NonNullable<
    Overrides["fieldTypes"]
  >["object"],
  // 字段配置 inline: true 后，标签在左、控件在右
  number: inlineLayout,
  text: inlineLayout,
  select: inlineLayout,
  radio: inlineLayout,
  textarea: inlineLayout,
};
