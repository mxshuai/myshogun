import type { ObjectField } from "@puckeditor/core";
import { createPuckColorField } from "./ui/puck-color-field";
import { TEXT_FONT_OPTIONS } from "./text/text-fonts";
import type { ButtonDimensionsGroup, ButtonStyleGroup, ButtonTextGroup } from "./button-styles";

const fontOptions = TEXT_FONT_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

export const onOffOptions = [
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

const baseStyleObjectFields = {
  textColor: createPuckColorField("Text color", "#ffffff"),
  backgroundColor: createPuckColorField("Color", "#000000"),
  borderThickness: {
    type: "number" as const,
    label: "Border thickness",
    min: 0,
    max: 50,
    step: 1,
  },
  borderRadius: {
    type: "number" as const,
    label: "Border radius",
    min: 0,
    max: 200,
    step: 1,
  },
  borderColor: createPuckColorField("Border color", "#e5e7eb"),
  boxShadow: {
    type: "radio" as const,
    label: "Box shadow",
    options: [...onOffOptions],
  },
};

const shadowDetailObjectFields = {
  boxShadowColor: createPuckColorField("Color", "#000000"),
  boxShadowOffsetX: shadowNumberField("Horizontal offset"),
  boxShadowOffsetY: shadowNumberField("Vertical offset"),
  boxShadowBlur: shadowNumberField("Blur"),
  boxShadowSpread: shadowNumberField("Spread"),
};

export function buildStyleObjectFields(
  boxShadowEnabled: boolean
): ObjectField<ButtonStyleGroup>["objectFields"] {
  if (!boxShadowEnabled) {
    return { ...baseStyleObjectFields } as ObjectField<ButtonStyleGroup>["objectFields"];
  }
  return {
    ...baseStyleObjectFields,
    ...shadowDetailObjectFields,
  } as ObjectField<ButtonStyleGroup>["objectFields"];
}

export const textFieldGroup: ObjectField<ButtonTextGroup> = {
  type: "object",
  label: "Text",
  objectFields: {
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
  },
};

export const dimensionsFieldGroup: ObjectField<ButtonDimensionsGroup> = {
  type: "object",
  label: "Dimensions",
  objectFields: {
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
  },
};

export function styleFieldGroup(
  label: string,
  boxShadowEnabled: boolean
): ObjectField<ButtonStyleGroup> {
  return {
    type: "object",
    label,
    objectFields: buildStyleObjectFields(boxShadowEnabled),
  };
}

export const defaultDefaultStyle = {
  textColor: "#ffffff",
  backgroundColor: "#000000",
  borderRadius: 2,
  borderColor: "#e5e7eb",
  boxShadow: false,
  boxShadowOffsetX: 0,
  boxShadowOffsetY: 0,
  boxShadowBlur: 0,
  boxShadowSpread: 0,
} satisfies ButtonStyleGroup;

export const defaultHoverStyle = {
  textColor: "#ffffff",
  backgroundColor: "#444444",
  borderColor: "#eeeeee",
  boxShadow: false,
  boxShadowOffsetX: 0,
  boxShadowOffsetY: 0,
  boxShadowBlur: 0,
  boxShadowSpread: 0,
} satisfies ButtonStyleGroup;

export const defaultActiveStyle = {
  textColor: "#ffffff",
  backgroundColor: "#000000",
  borderColor: "#e5e7eb",
  boxShadow: false,
  boxShadowOffsetX: 0,
  boxShadowOffsetY: 0,
  boxShadowBlur: 0,
  boxShadowSpread: 0,
} satisfies ButtonStyleGroup;
