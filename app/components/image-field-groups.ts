import type { ObjectField } from "@puckeditor/core";
import { onOffOptions } from "./button-field-groups";

export { onOffOptions };
import type { ImageDimensionsGroup, ImageStyleGroup } from "./image-styles";

const shadowNumberField = (label: string) => ({
  type: "number" as const,
  label,
  min: -200,
  max: 200,
  step: 1,
});

const imagePositionOptions = [
  { label: "Top left", value: "left top" },
  { label: "Top center", value: "center top" },
  { label: "Top right", value: "right top" },
  { label: "Center left", value: "left center" },
  { label: "Center", value: "center center" },
  { label: "Center right", value: "right center" },
  { label: "Bottom left", value: "left bottom" },
  { label: "Bottom center", value: "center bottom" },
  { label: "Bottom right", value: "right bottom" },
] as const;

const baseImageStyleObjectFields = {
  opacity: {
    type: "number" as const,
    label: "Opacity",
    min: 0,
    max: 1,
    step: 0.01,
  },
  borderColor: {
    type: "text" as const,
    label: "Border color",
  },
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
  boxShadow: {
    type: "radio" as const,
    label: "Box shadow",
    options: [...onOffOptions],
  },
};

const shadowDetailObjectFields = {
  boxShadowColor: {
    type: "text" as const,
    label: "Color",
  },
  boxShadowOffsetX: shadowNumberField("Horizontal offset"),
  boxShadowOffsetY: shadowNumberField("Vertical offset"),
  boxShadowBlur: shadowNumberField("Blur"),
  boxShadowSpread: shadowNumberField("Spread"),
};

function buildImageStyleObjectFields(boxShadowEnabled: boolean) {
  if (!boxShadowEnabled) {
    return { ...baseImageStyleObjectFields };
  }
  return {
    ...baseImageStyleObjectFields,
    ...shadowDetailObjectFields,
  };
}

export function imageStyleFieldGroup(
  label: string,
  boxShadowEnabled: boolean
): ObjectField<ImageStyleGroup> {
  return {
    type: "object",
    label,
    objectFields: buildImageStyleObjectFields(boxShadowEnabled),
  };
}

export const imageDimensionsFieldGroup: ObjectField<ImageDimensionsGroup> = {
  type: "object",
  label: "Dimensions",
  objectFields: {
    height: {
      type: "number",
      label: "Height",
      min: 0,
      max: 4000,
      step: 1,
    },
    imageFit: {
      type: "radio",
      label: "Image fit",
      options: [
        { label: "Cover", value: "cover" },
        { label: "Contain", value: "contain" },
        { label: "Stretch", value: "stretch" },
      ],
    },
    imagePosition: {
      type: "select",
      label: "Image position",
      options: [...imagePositionOptions],
    },
    zoom: {
      type: "number",
      label: "Zoom",
      min: 0,
      max: 200,
      step: 1,
    },
    aspectRatio: {
      type: "select",
      label: "Aspect ratio",
      options: [
        { label: "Auto (recommended)", value: "auto" },
        { label: "16:9", value: "16/9" },
        { label: "4:3", value: "4/3" },
        { label: "3:2", value: "3/2" },
        { label: "1:1", value: "1/1" },
      ],
    },
  },
};

export const imagePerformanceFieldGroup = {
  type: "object" as const,
  label: "Performance",
  objectFields: {
    imageQuality: {
      type: "select" as const,
      label: "Image quality",
      options: [
        { label: "~30% (Low)", value: 30 },
        { label: "~55% (Normal)", value: 55 },
        { label: "~80% (High)", value: 80 },
      ],
    },
    responsiveImage: {
      type: "radio" as const,
      label: "Responsive image",
      options: [...onOffOptions],
    },
    loading: {
      type: "radio" as const,
      label: "Loading",
      options: [
        { label: "Eager", value: "eager" },
        { label: "Lazy", value: "lazy" },
        { label: "Auto", value: "auto" },
      ],
    },
  },
};

export const defaultImageDimensions = {
  imageFit: "cover",
  imagePosition: "center center",
  zoom: 0,
  aspectRatio: "auto",
} satisfies ImageDimensionsGroup;

export const defaultImagePerformance = {
  imageQuality: 55,
  responsiveImage: true,
  loading: "auto",
} as const;

export const defaultImageDefaultStyle = {
  opacity: 1,
  borderColor: "#000000",
  borderThickness: 0,
  borderRadius: 0,
  boxShadow: false,
  boxShadowOffsetX: 0,
  boxShadowOffsetY: 0,
  boxShadowBlur: 0,
  boxShadowSpread: 0,
} satisfies ImageStyleGroup;

export const defaultImageHoverStyle = {
  opacity: 1,
  borderColor: "#000000",
  borderThickness: 0,
  borderRadius: 0,
  boxShadow: false,
  boxShadowOffsetX: 0,
  boxShadowOffsetY: 0,
  boxShadowBlur: 0,
  boxShadowSpread: 0,
} satisfies ImageStyleGroup;
