import type { ReactNode } from "react";
import type { Overrides } from "@puckeditor/core";

type CollapsibleObjectFieldProps = {
  children: ReactNode;
  name: string;
  field: { label?: string };
};

/** 默认折叠的 object 分组：左侧箭头 + summary，body 为 Puck 默认 ObjectField */
function CollapsibleObjectField({
  children,
  field,
  name,
}: CollapsibleObjectFieldProps) {
  const title = field.label || name;

  return (
    <details className="visbuild-collapsible-object">
      <summary className="visbuild-collapsible-object__summary">
        <span className="visbuild-collapsible-object__chevron" aria-hidden="true" />
        {title}
      </summary>
      <div className="visbuild-collapsible-object__body">{children}</div>
    </details>
  );
}

export const visbuildPuckFieldTypes: NonNullable<Overrides["fieldTypes"]> = {
  object: CollapsibleObjectField as NonNullable<
    Overrides["fieldTypes"]
  >["object"],
};
