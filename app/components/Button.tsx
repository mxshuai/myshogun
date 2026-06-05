import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import {
  defaultActiveStyle,
  defaultDefaultStyle,
  defaultHoverStyle,
  dimensionsFieldGroup,
  onOffOptions,
  styleFieldGroup,
  textFieldGroup,
} from "./button-field-groups";
import { buildButtonLinkStyle, flattenButtonProps } from "./button-styles";
import "./button.css";

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
  text: textFieldGroup,
  dimensions: dimensionsFieldGroup,
  defaultStyle: styleFieldGroup("Default style", false),
  hoverStyle: styleFieldGroup("Hover/focus style", false),
  activeStyle: styleFieldGroup("Active style", false),
} as ComponentConfig<Components["Button"]>["fields"];

const ButtonInternal: ComponentConfig<Components["Button"]> = {
  fields: buttonFields,
  resolveFields: (data) => {
    const props = data.props || {};
    return {
      ...buttonFields,
      defaultStyle: styleFieldGroup(
        "Default style",
        props.defaultStyle?.boxShadow === true
      ),
      hoverStyle: styleFieldGroup(
        "Hover/focus style",
        props.hoverStyle?.boxShadow === true
      ),
      activeStyle: styleFieldGroup(
        "Active style",
        props.activeStyle?.boxShadow === true
      ),
    } as NonNullable<ComponentConfig<Components["Button"]>["fields"]>;
  },
  defaultProps: {
    label: "Text",
    href: "",
    openInSameTab: true,
    text: {
      font: "",
      fontSize: 14,
    },
    dimensions: {
      fullWidth: false,
    },
    defaultStyle: { ...defaultDefaultStyle },
    hoverStyle: { ...defaultHoverStyle },
    activeStyle: { ...defaultActiveStyle },
    layout: {
      padding: "8px",
      ...defaultLayoutSpacing,
    },
  },
  render: (props) => {
    const { label, href, openInSameTab, puck } = props;
    const linkStyle = buildButtonLinkStyle(flattenButtonProps(props));
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
