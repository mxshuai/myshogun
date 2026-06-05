import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";
import { buildButtonLinkStyle } from "./button-styles";
import "./button.css";

const fontOptions = TEXT_FONT_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

const onOffOptions = [
  { label: "Off", value: false },
  { label: "On", value: true },
] as const;

const shadowNumberField = (label: string) => ({
  type: "number" as const,
  label,
  min: -200,
  max: 200,
  step: 1,
});

function shadowFieldKeys(prefix: "" | "hover" | "active") {
  const base = prefix === "" ? "boxShadow" : `${prefix}BoxShadow`;
  return {
    enabled: base,
    color: `${base}Color`,
    offsetX: `${base}OffsetX`,
    offsetY: `${base}OffsetY`,
    blur: `${base}Blur`,
    spread: `${base}Spread`,
  };
}

function shadowDetailFields(prefix: "" | "hover" | "active") {
  const labelPrefix =
    prefix === ""
      ? ""
      : `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} `;
  const keys = shadowFieldKeys(prefix);

  return {
    [keys.enabled]: {
      type: "radio" as const,
      label: `${labelPrefix}Box shadow`,
      options: [...onOffOptions],
    },
    [keys.color]: {
      type: "text" as const,
      label: `${labelPrefix}Color`,
    },
    [keys.offsetX]: shadowNumberField(`${labelPrefix}Horizontal offset`),
    [keys.offsetY]: shadowNumberField(`${labelPrefix}Vertical offset`),
    [keys.blur]: shadowNumberField(`${labelPrefix}Blur`),
    [keys.spread]: shadowNumberField(`${labelPrefix}Spread`),
  };
}

const buttonFields = {
  label: {
    type: "text",
    label: "Button label",
    contentEditable: true,
  },
  href: {
    type: "text",
    label: "Button url",
    placeholder: "",
  },
  openInSameTab: {
    type: "radio",
    label: "Open in same tab",
    options: [...onOffOptions],
  },
  font: {
    type: "select",
    label: "Font",
    options: fontOptions,
  },
  fontSize: {
    type: "number",
    label: "Size",
    min: 8,
    max: 200,
    step: 0.1,
  },
  lineHeight: {
    type: "number",
    label: "Line height",
    min: 0.5,
    max: 5,
    step: 0.1,
  },
  letterSpacing: {
    type: "number",
    label: "Letter spacing",
    min: -10,
    max: 50,
    step: 0.1,
  },
  fullWidth: {
    type: "radio",
    label: "Full width",
    options: [...onOffOptions],
  },
  maxWidth: {
    type: "number",
    label: "Max width",
    min: 0,
    max: 2000,
    step: 1,
  },
  minHeight: {
    type: "number",
    label: "Min height",
    min: 0,
    max: 2000,
    step: 1,
  },
  textColor: {
    type: "text",
    label: "Text color",
  },
  backgroundColor: {
    type: "text",
    label: "Color",
  },
  borderThickness: {
    type: "number",
    label: "Border thickness",
    min: 0,
    max: 50,
    step: 1,
  },
  borderRadius: {
    type: "number",
    label: "Border radius",
    min: 0,
    max: 200,
    step: 1,
  },
  borderColor: {
    type: "text",
    label: "Border color",
  },
  ...shadowDetailFields(""),
  hoverTextColor: {
    type: "text",
    label: "Hover text color",
  },
  hoverBackgroundColor: {
    type: "text",
    label: "Hover color",
  },
  hoverBorderThickness: {
    type: "number",
    label: "Hover border thickness",
    min: 0,
    max: 50,
    step: 1,
  },
  hoverBorderRadius: {
    type: "number",
    label: "Hover border radius",
    min: 0,
    max: 200,
    step: 1,
  },
  hoverBorderColor: {
    type: "text",
    label: "Hover border color",
  },
  ...shadowDetailFields("hover"),
  activeTextColor: {
    type: "text",
    label: "Active text color",
  },
  activeBackgroundColor: {
    type: "text",
    label: "Active color",
  },
  activeBorderThickness: {
    type: "number",
    label: "Active border thickness",
    min: 0,
    max: 50,
    step: 1,
  },
  activeBorderRadius: {
    type: "number",
    label: "Active border radius",
    min: 0,
    max: 200,
    step: 1,
  },
  activeBorderColor: {
    type: "text",
    label: "Active border color",
  },
  ...shadowDetailFields("active"),
} as ComponentConfig<Components["Button"]>["fields"];

function stripShadowDetailFields(
  fields: Record<string, unknown>,
  prefix: "" | "hover" | "active",
  enabled: boolean
) {
  if (enabled) return;
  const keys = shadowFieldKeys(prefix);
  delete fields[keys.color];
  delete fields[keys.offsetX];
  delete fields[keys.offsetY];
  delete fields[keys.blur];
  delete fields[keys.spread];
}

const ButtonInternal: ComponentConfig<Components["Button"]> = {
  fields: buttonFields,
  resolveFields: (data) => {
    const props = data.props || {};
    const fields = { ...buttonFields } as Record<string, unknown>;
    stripShadowDetailFields(fields, "", props.boxShadow === true);
    stripShadowDetailFields(fields, "hover", props.hoverBoxShadow === true);
    stripShadowDetailFields(fields, "active", props.activeBoxShadow === true);
    return fields as NonNullable<
      ComponentConfig<Components["Button"]>["fields"]
    >;
  },
  defaultProps: {
    label: "Text",
    href: "",
    openInSameTab: true,
    font: "",
    fontSize: 14,
    fullWidth: false,
    textColor: "#ffffff",
    backgroundColor: "#000000",
    borderRadius: 2,
    borderColor: "#e5e7eb",
    boxShadow: false,
    boxShadowOffsetX: 0,
    boxShadowOffsetY: 0,
    boxShadowBlur: 0,
    boxShadowSpread: 0,
    hoverTextColor: "#ffffff",
    hoverBackgroundColor: "#444444",
    hoverBorderColor: "#eeeeee",
    hoverBoxShadow: false,
    hoverBoxShadowOffsetX: 0,
    hoverBoxShadowOffsetY: 0,
    hoverBoxShadowBlur: 0,
    hoverBoxShadowSpread: 0,
    activeTextColor: "#ffffff",
    activeBackgroundColor: "#000000",
    activeBorderColor: "#e5e7eb",
    activeBoxShadow: false,
    activeBoxShadowOffsetX: 0,
    activeBoxShadowOffsetY: 0,
    activeBoxShadowBlur: 0,
    activeBoxShadowSpread: 0,
    layout: {
      padding: "8px",
      ...defaultLayoutSpacing,
    },
  },
  render: (props) => {
    const { label, href, openInSameTab, puck } = props;
    const linkStyle = buildButtonLinkStyle(props);
    const resolvedHref = href?.trim() || "#";

    return (
      <Section>
        <a
          className="visbuild-button"
          href={puck.isEditing ? "#" : resolvedHref}
          target={openInSameTab ? undefined : "_blank"}
          rel={openInSameTab ? undefined : "noopener noreferrer"}
          onClick={puck.isEditing ? (e) => e.preventDefault() : undefined}
          style={{
            ...linkStyle,
            cursor: puck.isEditing ? "default" : "pointer",
          }}
          tabIndex={puck.isEditing ? -1 : undefined}
        >
          {label}
        </a>
      </Section>
    );
  },
};

export const Button = withLayout(ButtonInternal);
