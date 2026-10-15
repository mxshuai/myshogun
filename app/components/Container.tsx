import type { CSSProperties } from "react";
import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { resolveBackgroundSizeCss } from "./container-background-size";
import { Section } from "./Section";
import {
  defaultLayoutSpacing,
  effectiveSectionSides,
  type LayoutFieldProps,
  withLayout,
} from "./Layout";
import { onOffOptions } from "./button-field-groups";
import { createPuckColorField } from "./ui/puck-color-field";
import { createImagePickerField } from "./editor/media/ImagePickerField";
import { createPxSizeField } from "./ui/px-size-field";
import { normalizeImageValue } from "./editor/media/types";
import {
  containerBackgroundImageUrl,
  containerNeedsNesting,
  defaultContainerBackground,
  defaultContainerMain,
  nestContainerProps,
  readContainerSettings,
  type ContainerBackground,
  type ContainerMain,
} from "./container-settings";

const backgroundImageField = createImagePickerField("Background image", {
  variant: "background",
});
const widthField = createPxSizeField("Width");
const heightField = createPxSizeField("Height");
const horizontalOffsetField = createPxSizeField("Horizontal offset");
const verticalOffsetField = createPxSizeField("Vertical offset");

const alignOptions = [
  { label: "Top", value: "top" },
  { label: "Middle", value: "middle" },
  { label: "Bottom", value: "bottom" },
] as const;

const backgroundTypeOptions = [
  { label: "Color", value: "color" },
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
] as const;

const switchField = (label: string) => ({
  type: "radio" as const,
  label,
  options: [...onOffOptions],
  switch: true,
});

function resolveMainField(main: ContainerMain | undefined): any {
  const objectFields: Record<string, unknown> = {
    entireContainerClickable: switchField("Entire container clickable"),
  };
  if (main?.entireContainerClickable === true) {
    objectFields.containerUrl = {
      type: "text" as const,
      label: "Container Url",
      placeholder: "Link",
    };
    objectFields.openInNewWindow = switchField("Open in new window");
  }
  objectFields.verticalAlign = {
    type: "radio" as const,
    label: "Vertically align content",
    options: [...alignOptions],
  };
  return {
    type: "object" as const,
    label: "Main",
    defaultOpen: true,
    objectFields,
  };
}

function resolveBackgroundField(background: ContainerBackground | undefined): any {
  const settings = background ?? defaultContainerBackground;
  const objectFields: Record<string, unknown> = {
    backgroundType: {
      type: "radio" as const,
      label: "Background",
      options: [...backgroundTypeOptions],
    },
  };

  if (settings.backgroundType === "color") {
    objectFields.backgroundColor = createPuckColorField("Background color", "#ffffff");
  } else if (settings.backgroundType === "image") {
    objectFields.backgroundImage = backgroundImageField;
    if (normalizeImageValue(settings.backgroundImage)) {
      objectFields.backgroundSize = {
        type: "radio" as const,
        label: "Background size",
        options: [
          { label: "Cover", value: "cover" },
          { label: "Contain", value: "contain" },
          { label: "Custom", value: "custom" },
        ],
      };
      if (settings.backgroundSize === "custom") {
        objectFields.backgroundWidth = widthField;
        objectFields.backgroundHeight = heightField;
      }
      objectFields.backgroundRepeat = {
        type: "radio" as const,
        label: "Background repeat",
        options: [
          { label: "No Repeat", value: "no-repeat" },
          { label: "Repeat", value: "repeat" },
        ],
      };
      objectFields.horizontalPosition = {
        type: "radio" as const,
        label: "Horizontal position",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
          { label: "…", value: "custom" },
        ],
      };
      if (settings.horizontalPosition === "custom") {
        objectFields.horizontalPositionValue = horizontalOffsetField;
      }
      objectFields.verticalPosition = {
        type: "radio" as const,
        label: "Vertical position",
        options: [
          { label: "Top", value: "top" },
          { label: "Center", value: "center" },
          { label: "Bottom", value: "bottom" },
          { label: "…", value: "custom" },
        ],
      };
      if (settings.verticalPosition === "custom") {
        objectFields.verticalPositionValue = verticalOffsetField;
      }
      objectFields.responsiveImage = switchField("Responsive image");
      objectFields.loading = {
        type: "radio" as const,
        label: "Loading",
        options: [
          { label: "Eager", value: "eager" },
          { label: "Lazy", value: "lazy" },
          { label: "Auto", value: "auto" },
        ],
      };
    }
    objectFields.parallaxEffect = switchField("Parallax effect");
  } else if (settings.backgroundType === "video") {
    objectFields.backgroundVideo = {
      type: "text" as const,
      label: "Link",
      placeholder: "Youtube or Vimeo link",
    };
    objectFields.sound = switchField("Sound");
    objectFields.parallaxEffect = switchField("Parallax effect");
  }

  return {
    type: "object" as const,
    label: "Background",
    objectFields,
  };
}

const ContainerInternal: ComponentConfig<Components["Container"]> = {
  fields: {
    main: resolveMainField(defaultContainerMain),
    background: resolveBackgroundField(defaultContainerBackground),
    content: {
      type: "slot",
      label: "Content",
      disallow: ["Hero"],
    },
  },
  defaultProps: {
    main: { ...defaultContainerMain },
    background: { ...defaultContainerBackground },
    content: [],
    layout: {
      ...defaultLayoutSpacing,
      dimensions: {
        ...defaultLayoutSpacing.dimensions,
        minHeight: 50,
      },
    },
  },
  resolveFields: (data) => {
    const { main, background } = readContainerSettings(data?.props);
    return {
      main: resolveMainField(main),
      background: resolveBackgroundField(background),
      content: {
        type: "slot" as const,
        label: "Content",
        disallow: ["Hero"],
      },
    };
  },
  resolveData: (data) => {
    const props = data.props || {};
    if (!containerNeedsNesting(props)) return {};
    return { props: nestContainerProps(props) };
  },
  render: ({ content: Content, layout, puck, ...props }) => {
    const { main: settings, background: backdrop } = readContainerSettings(props);
    const alignMap: Record<string, string> = {
      top: "flex-start",
      middle: "center",
      bottom: "flex-end",
    };
    const layoutState = layout as LayoutFieldProps | undefined;
    const sectionPadding = effectiveSectionSides(layoutState).padding;
    const sectionMinHeight =
      layoutState?.dimensions?.minHeight != null &&
      layoutState.dimensions.minHeight > 0
        ? `${layoutState.dimensions.minHeight}px`
        : undefined;
    const imageUrl = containerBackgroundImageUrl(backdrop.backgroundImage);

    const getBackgroundStyle = (): CSSProperties => {
      const baseStyle: CSSProperties = {
        display: "flex",
        flexDirection: "column",
        justifyContent: alignMap[settings.verticalAlign] ?? "center",
        paddingTop: sectionPadding.top,
        paddingRight: sectionPadding.right,
        paddingBottom: sectionPadding.bottom,
        paddingLeft: sectionPadding.left,
        ...(sectionMinHeight ? { minHeight: sectionMinHeight } : {}),
      };

      if (backdrop.backgroundType === "image" && imageUrl) {
        baseStyle.backgroundImage = `url(${imageUrl})`;
        baseStyle.backgroundSize = resolveBackgroundSizeCss(
          backdrop.backgroundSize,
          backdrop.backgroundWidth,
          backdrop.backgroundHeight,
        );
        baseStyle.backgroundRepeat = backdrop.backgroundRepeat;
        const hPos =
          backdrop.horizontalPosition === "custom" &&
          backdrop.horizontalPositionValue &&
          backdrop.horizontalPositionValue > 0
            ? `${backdrop.horizontalPositionValue}px`
            : backdrop.horizontalPosition;
        const vPos =
          backdrop.verticalPosition === "custom" &&
          backdrop.verticalPositionValue &&
          backdrop.verticalPositionValue > 0
            ? `${backdrop.verticalPositionValue}px`
            : backdrop.verticalPosition;
        baseStyle.backgroundPosition = `${hPos} ${vPos}`;
        if (backdrop.parallaxEffect) {
          baseStyle.backgroundAttachment = "fixed";
        }
      } else if (backdrop.backgroundType === "color") {
        baseStyle.backgroundColor = backdrop.backgroundColor || "#ffffff";
      } else if (backdrop.backgroundType === "video") {
        baseStyle.backgroundColor = "#000";
        baseStyle.position = "relative";
        baseStyle.overflow = "hidden";
      }

      return baseStyle;
    };

    const isEditing = puck?.isEditing === true;
    const isClickable =
      !isEditing && settings.entireContainerClickable && Boolean(settings.containerUrl);
    const handleClick = () => {
      if (!isClickable) return;
      if (settings.openInNewWindow) {
        window.open(settings.containerUrl, "_blank");
      } else {
        window.location.href = settings.containerUrl;
      }
    };
    const contentMinEmptyHeight = sectionMinHeight != null ? sectionMinHeight : "80px";

    return (
      <Section
        sectionPaddingTop="0"
        sectionPaddingRight="0"
        sectionPaddingBottom="0"
        sectionPaddingLeft="0"
        sectionMinHeight=""
      >
        <div
          style={{
            ...getBackgroundStyle(),
            cursor: isClickable ? "pointer" : "default",
            position: "relative",
            width: "100%",
            alignItems: "stretch",
          }}
          onClick={handleClick}
        >
          {backdrop.backgroundType === "video" && backdrop.backgroundVideo ? (
            <video
              autoPlay
              loop
              muted={!backdrop.sound}
              playsInline
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
              }}
            >
              <source src={backdrop.backgroundVideo} type="video/mp4" />
            </video>
          ) : null}
          <Content
            disallow={["Hero"]}
            minEmptyHeight={contentMinEmptyHeight}
            style={{
              position: "relative",
              zIndex: 1,
              width: "100%",
              flex: 1,
              alignSelf: "stretch",
            }}
          />
        </div>
      </Section>
    );
  },
};

export const Container = withLayout(ContainerInternal);
