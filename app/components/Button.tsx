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
  main: {
    type: "object" as const,
    label: "Main",
    defaultOpen: true,
    objectFields: {
      label: {
        type: "text" as const,
        label: "Button label",
        contentEditable: true,
      },
      href: {
        type: "text" as const,
        label: "Button url",
        placeholder: "",
      },
      openInSameTab: {
        type: "radio" as const,
        label: "Open in same tab",
        options: [...onOffOptions],
        switch: true,
      },
      align: {
        type: "radio" as const,
        label: "Alignment",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
      },
    },
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
  resolveData: (data) => {
    const props = data.props || {};
    if (props.main?.label != null || props.main?.href != null || props.main?.align != null) {
      return {};
    }
    const legacy = props as unknown as {
      label?: string;
      href?: string;
      openInSameTab?: boolean;
      align?: Components["Button"]["main"]["align"];
    };
    if (legacy.label == null && legacy.href == null && legacy.align == null && legacy.openInSameTab == null) {
      return {};
    }
    return {
      props: {
        ...props,
        main: {
          label: legacy.label ?? "Text",
          href: legacy.href ?? "",
          openInSameTab: legacy.openInSameTab ?? true,
          align: legacy.align ?? "center",
        },
        label: undefined,
        href: undefined,
        openInSameTab: undefined,
        align: undefined,
      },
    };
  },
  defaultProps: {
    main: {
      label: "Text",
      href: "",
      openInSameTab: true,
      align: "center",
    },
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
      ...defaultLayoutSpacing,
    },
  },
  render: (props) => {
    const main = props.main ?? {
      label: "Text",
      href: "",
      openInSameTab: true,
      align: "center" as const,
    };
    const { label, href, openInSameTab, align } = main;
    const puck = props.puck;
    const linkStyle = buildButtonLinkStyle(flattenButtonProps(props));
    const resolvedHref = href?.trim() || "#";
    const justifyContent =
      align === "left"
        ? "flex-start"
        : align === "right"
          ? "flex-end"
          : "center";

    return (
      <Section>
        <div
          style={{
            display: "flex",
            justifyContent,
            width: "100%",
          }}
        >
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
        </div>
      </Section>
    );
  },
};

export const Button = withLayout(ButtonInternal);
