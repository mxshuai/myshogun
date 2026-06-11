import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { resolveBackgroundSizeCss } from "./container-background-size";
import { Section } from "./Section";
import {
  defaultLayoutSpacing,
  effectiveSectionSides,
  type LayoutFieldProps,
  withLayout,
} from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";

const ContainerInternal: ComponentConfig<Components["Container"]> = {
  fields: {
    // Base fields that are always shown
    entireContainerClickable: {
      type: "radio",
      label: "Entire container clickable",
      options: [
        { label: "True", value: true },
        { label: "False", value: false },
      ],
    },
    verticalAlign: {
      type: "radio",
      label: "Vertically align content",
      options: [
        { label: "Top", value: "top" },
        { label: "Middle", value: "middle" },
        { label: "Bottom", value: "bottom" },
      ],
    },
    backgroundType: {
      type: "radio",
      label: "Background",
      options: [
        { label: "Color", value: "color" },
        { label: "Image", value: "image" },
        { label: "Video", value: "video" },
      ],
    },
    content: {
      type: "slot",
      label: "Content",
    },
  },
  defaultProps: {
    entireContainerClickable: false,
    containerUrl: "",
    openInNewWindow: false,
    verticalAlign: "middle",
    backgroundType: "image",
    backgroundImage: "",
    backgroundColor: "#ffffff",
    backgroundVideo: "",
    videoMuted: true,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    horizontalPosition: "center",
    horizontalPositionValue: 0,
    verticalPosition: "center",
    verticalPositionValue: 0,
    responsiveImage: true,
    loading: "auto",
    parallaxEffect: false,
    content: [],
    layout: {
      ...defaultLayoutSpacing,
      dimensions: {
        ...defaultLayoutSpacing.dimensions,
        minHeight: 50,
      },
    },
  },
  resolveFields: (data, params) => {
    const props = data?.props || {};
    
    const fields: any = {
      // Main Section - Always show these base fields
      entireContainerClickable: {
        type: "radio",
        label: "Entire container clickable",
        options: [
          { label: "True", value: true },
          { label: "False", value: false },
        ],
      },
    };

    // Condition: Show link fields immediately after Entire container clickable when it's true
    if (props.entireContainerClickable === true) {
      fields.containerUrl = {
        type: "text",
        label: "Container Url",
      };
      fields.openInNewWindow = {
        type: "radio",
        label: "Open in new window",
        options: [
          { label: "True", value: true },
          { label: "False", value: false },
        ],
      };
    }

    // Continue with other main fields
    fields.verticalAlign = {
      type: "radio",
      label: "Vertically align content",
      options: [
        { label: "Top", value: "top" },
        { label: "Middle", value: "middle" },
        { label: "Bottom", value: "bottom" },
      ],
    };

    // Background Section - Always show background type selector
    fields.backgroundType = {
      type: "radio",
      label: "Background",
      options: [
        { label: "Color", value: "color" },
        { label: "Image", value: "image" },
        { label: "Video", value: "video" },
      ],
    };

    // Condition: Show different fields based on Background type
    if (props.backgroundType === "color") {
      fields.backgroundColor = createPuckColorField(
        "Background color",
        "#ffffff"
      );
    } else if (props.backgroundType === "image") {
      fields.backgroundImage = {
        type: "text",
        label: "Background image",
      };
      fields.backgroundSize = {
        type: "radio",
        label: "Background size",
        options: [
          { label: "Cover", value: "cover" },
          { label: "Contain", value: "contain" },
          { label: "Custom", value: "custom" },
        ],
      };
      if (props.backgroundSize === "custom") {
        fields.backgroundWidth = {
          type: "number",
          label: "Background width",
          min: 0,
          step: 1,
        };
        fields.backgroundHeight = {
          type: "number",
          label: "Background height",
          min: 0,
          step: 1,
        };
      }
      fields.backgroundRepeat = {
        type: "radio",
        label: "Background repeat",
        options: [
          { label: "No Repeat", value: "no-repeat" },
          { label: "Repeat", value: "repeat" },
        ],
      };
      fields.horizontalPosition = {
        type: "radio",
        label: "Horizontal position",
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
          { label: "Custom", value: "custom" },
        ],
      };
      // Only show horizontal position value when Custom is selected
      if (props.horizontalPosition === "custom") {
        fields.horizontalPositionValue = {
          type: "number",
          label: "Horizontal position value (px)",
          min: 0,
        };
      }
      fields.verticalPosition = {
        type: "radio",
        label: "Vertical position",
        options: [
          { label: "Top", value: "top" },
          { label: "Center", value: "center" },
          { label: "Bottom", value: "bottom" },
          { label: "Custom", value: "custom" },
        ],
      };
      // Only show vertical position value when Custom is selected
      if (props.verticalPosition === "custom") {
        fields.verticalPositionValue = {
          type: "number",
          label: "Vertical position value (px)",
          min: 0,
        };
      }
      fields.responsiveImage = {
        type: "radio",
        label: "Responsive image",
        options: [
          { label: "True", value: true },
          { label: "False", value: false },
        ],
      };
      fields.loading = {
        type: "radio",
        label: "Loading",
        options: [
          { label: "Eager", value: "eager" },
          { label: "Lazy", value: "lazy" },
          { label: "Auto", value: "auto" },
        ],
      };
      fields.parallaxEffect = {
        type: "radio",
        label: "Parallax effect",
        options: [
          { label: "True", value: true },
          { label: "False", value: false },
        ],
      };
    } else if (props.backgroundType === "video") {
      fields.backgroundVideo = {
        type: "text",
        label: "Background video",
      };
      fields.videoMuted = {
        type: "radio",
        label: "Video muted",
        options: [
          { label: "True", value: true },
          { label: "False", value: false },
        ],
      };
    }

    // Content Slot - Always show
    fields.content = {
      type: "slot",
      label: "Content",
    };

    return fields;
  },
  render: ({
    entireContainerClickable,
    containerUrl,
    openInNewWindow,
    verticalAlign,
    backgroundType,
    backgroundImage,
    backgroundColor,
    backgroundVideo,
    videoMuted,
    backgroundSize,
    backgroundWidth,
    backgroundHeight,
    backgroundRepeat,
    horizontalPosition,
    horizontalPositionValue,
    verticalPosition,
    verticalPositionValue,
    responsiveImage,
    loading,
    parallaxEffect,
    content: Content,
    layout,
    puck,
  }) => {
    // 垂直对齐映射
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

    // 背景样式
    const getBackgroundStyle = () => {
      const baseStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        justifyContent: alignMap[verticalAlign],
        paddingTop: sectionPadding.top,
        paddingRight: sectionPadding.right,
        paddingBottom: sectionPadding.bottom,
        paddingLeft: sectionPadding.left,
        ...(sectionMinHeight ? { minHeight: sectionMinHeight } : {}),
      };

      if (backgroundType === "image" && backgroundImage) {
        baseStyle.backgroundImage = `url(${backgroundImage})`;
        
        baseStyle.backgroundSize = resolveBackgroundSizeCss(
          backgroundSize,
          backgroundWidth,
          backgroundHeight
        );
        
        // Background repeat
        baseStyle.backgroundRepeat = backgroundRepeat;
        
        // Background position
        const hPos = horizontalPosition === "custom" && horizontalPositionValue && horizontalPositionValue > 0 
          ? `${horizontalPositionValue}px` 
          : horizontalPosition;
        const vPos = verticalPosition === "custom" && verticalPositionValue && verticalPositionValue > 0 
          ? `${verticalPositionValue}px` 
          : verticalPosition;
        baseStyle.backgroundPosition = `${hPos} ${vPos}`;
        
        // Parallax effect
        if (parallaxEffect) {
          baseStyle.backgroundAttachment = "fixed";
        }
      } else if (backgroundType === "color") {
        baseStyle.backgroundColor = backgroundColor || "#ffffff";
      } else if (backgroundType === "video") {
        baseStyle.backgroundColor = "#000";
        baseStyle.position = "relative";
        baseStyle.overflow = "hidden";
      }

      return baseStyle;
    };

    const isEditing = puck?.isEditing === true;
    const isClickable =
      !isEditing && entireContainerClickable && Boolean(containerUrl);

    // 点击处理（编辑模式下不拦截，避免影响 slot 拖放）
    const handleClick = () => {
      if (!isClickable) return;
      if (openInNewWindow) {
        window.open(containerUrl, "_blank");
      } else {
        window.location.href = containerUrl;
      }
    };

    const contentMinEmptyHeight =
      sectionMinHeight != null ? sectionMinHeight : "80px";

    // 容器样式
    const containerStyle: React.CSSProperties = {
      cursor: isClickable ? "pointer" : "default",
      position: "relative",
      width: "100%",
      alignItems: "stretch",
    };

    return (
      <Section
        sectionPaddingTop="0"
        sectionPaddingRight="0"
        sectionPaddingBottom="0"
        sectionPaddingLeft="0"
        sectionMinHeight=""
      >
        <div
          style={{ ...getBackgroundStyle(), ...containerStyle }}
          onClick={handleClick}
        >
          {/* 视频背景 */}
          {backgroundType === "video" && backgroundVideo && (
            <video
              autoPlay
              loop
              muted={videoMuted}
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
              <source src={backgroundVideo} type="video/mp4" />
            </video>
          )}
          
          {/* 内容 slot：画布可拖入 Heading / Text / Button 等子组件 */}
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
