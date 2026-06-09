import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { resolveBackgroundSizeCss } from "./container-background-size";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";

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
    backgroundColor: "#f5f5f5",
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
      sectionPadding: {
        top: "40px",
        right: "0",
        bottom: "40px",
        left: "0",
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
      fields.backgroundColor = {
        type: "text",
        label: "Background color",
      };
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
  }) => {
    // 垂直对齐映射
    const alignMap: Record<string, string> = {
      top: "flex-start",
      middle: "center",
      bottom: "flex-end",
    };

    // 背景样式
    const getBackgroundStyle = () => {
      const baseStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        justifyContent: alignMap[verticalAlign],
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
        baseStyle.backgroundColor = backgroundColor || "#f5f5f5";
      } else if (backgroundType === "video") {
        baseStyle.backgroundColor = "#000";
        baseStyle.position = "relative";
        baseStyle.overflow = "hidden";
      }

      return baseStyle;
    };

    // 点击处理
    const handleClick = () => {
      if (entireContainerClickable && containerUrl) {
        if (openInNewWindow) {
          window.open(containerUrl, "_blank");
        } else {
          window.location.href = containerUrl;
        }
      }
    };

    // 容器样式
    const containerStyle: React.CSSProperties = {
      cursor: entireContainerClickable && containerUrl ? "pointer" : "default",
      position: "relative",
    };

    return (
      <Section>
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
          
          {/* 内容层 */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <Content disallow={["Hero"]} />
          </div>
        </div>
      </Section>
    );
  },
};

export const Container = withLayout(ContainerInternal);
