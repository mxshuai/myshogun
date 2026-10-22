import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import {
  defaultLayoutSpacing,
  effectiveSectionSides,
  withLayout,
  type LayoutFieldProps,
} from "./Layout";
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

const defaultButtonPadding = {
  top: "10",
  right: "20",
  bottom: "10",
  left: "20",
};

function isZeroSide(value: string | undefined): boolean {
  const raw = (value ?? "").trim();
  return raw === "" || raw === "0" || raw === "0px";
}

function isZeroSectionPadding(padding?: LayoutFieldProps["sectionPadding"]): boolean {
  return (["top", "right", "bottom", "left"] as const).every((side) =>
    isZeroSide(padding?.[side]),
  );
}

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
  resolveData: (data, { lastData }) => {
    const layout = data.props?.layout;
    if (lastData || !isZeroSectionPadding(layout?.sectionPadding)) return {};
    return {
      props: {
        ...data.props,
        layout: {
          ...layout,
          sectionPadding: { ...defaultButtonPadding },
        },
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
      sectionPadding: { ...defaultButtonPadding },
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
    const textPadding = effectiveSectionSides(props.layout).padding;
    const resolvedHref = href?.trim() || "#";
    const justifyContent =
      align === "left"
        ? "flex-start"
        : align === "right"
          ? "flex-end"
          : "center";

    return (
      <Section
        sectionPaddingTop="0"
        sectionPaddingRight="0"
        sectionPaddingBottom="0"
        sectionPaddingLeft="0"
      >
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
              paddingTop: textPadding.top,
              paddingRight: textPadding.right,
              paddingBottom: textPadding.bottom,
              paddingLeft: textPadding.left,
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
