import type { ComponentConfig } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { defaultLayoutSpacing, withLayout } from "./Layout";
import {
  defaultImageDefaultStyle,
  defaultImageDimensions,
  defaultImageHoverStyle,
  defaultImagePerformance,
  imageDimensionsFieldGroup,
  imagePerformanceFieldGroup,
  imageStyleFieldGroup,
  onOffOptions,
} from "./image-field-groups";
import {
  buildImageCssVariables,
  buildImageDimensionalStyle,
  buildImageFrameStyle,
  buildResponsiveSrcSet,
  flattenImageProps,
} from "./image-styles";
import "./image.css";

const imageFields = {
  src: {
    type: "text",
    label: "SRC",
  },
  alt: {
    type: "text",
    label: "Alt",
  },
  imageClickable: {
    type: "radio",
    label: "Image is clickable",
    options: [...onOffOptions],
  },
  performance: imagePerformanceFieldGroup,
  dimensions: imageDimensionsFieldGroup,
  defaultStyle: imageStyleFieldGroup("Default style", false),
  hoverStyle: imageStyleFieldGroup("Hover style", false),
} as ComponentConfig<Components["Image"]>["fields"];

const ImageInternal: ComponentConfig<Components["Image"]> = {
  fields: imageFields,
  resolveFields: (data) => {
    const props = data.props || {};
    const fields: Record<string, unknown> = {
      src: imageFields!.src,
      alt: imageFields!.alt,
      imageClickable: imageFields!.imageClickable,
    };

    if (props.imageClickable === true) {
      fields.linkHref = {
        type: "text",
        label: "Image url",
        placeholder: "",
      };
      fields.openInNewWindow = {
        type: "radio",
        label: "Open in new window",
        options: [...onOffOptions],
      };
    }

    fields.performance = imageFields!.performance;
    fields.dimensions = imageFields!.dimensions;
    fields.defaultStyle = imageStyleFieldGroup(
      "Default style",
      props.defaultStyle?.boxShadow === true
    );
    fields.hoverStyle = imageStyleFieldGroup(
      "Hover style",
      props.hoverStyle?.boxShadow === true
    );

    return fields as NonNullable<ComponentConfig<Components["Image"]>["fields"]>;
  },
  defaultProps: {
    src: "https://via.placeholder.com/800x400",
    alt: "Example image",
    imageClickable: false,
    linkHref: "",
    openInNewWindow: false,
    performance: { ...defaultImagePerformance },
    dimensions: { ...defaultImageDimensions },
    defaultStyle: { ...defaultImageDefaultStyle },
    hoverStyle: { ...defaultImageHoverStyle },
    layout: {
      ...defaultLayoutSpacing,
    },
  },
  render: (props) => {
    const flat = flattenImageProps(props as Record<string, unknown>);
    const { puck } = props;
    const loadingAttr =
      flat.performance.loading === "auto"
        ? undefined
        : flat.performance.loading;
    const srcSet = flat.performance.responsiveImage
      ? buildResponsiveSrcSet(flat.src, flat.performance.imageQuality)
      : undefined;
    const resolvedHref = flat.linkHref?.trim() || "#";
    const dimensionalStyle = buildImageDimensionalStyle(flat.dimensions);

    const img = (
      <img
        className="visbuild-image__img"
        src={flat.src}
        alt={flat.alt}
        loading={loadingAttr}
        srcSet={srcSet}
        sizes={srcSet ? "100vw" : undefined}
        style={dimensionalStyle}
      />
    );

    const content =
      flat.imageClickable && flat.linkHref?.trim() ? (
        <a
          className="visbuild-image__link"
          href={puck.isEditing ? "#" : resolvedHref}
          target={flat.openInNewWindow ? "_blank" : undefined}
          rel={flat.openInNewWindow ? "noopener noreferrer" : undefined}
          onClick={puck.isEditing ? (e) => e.preventDefault() : undefined}
          tabIndex={puck.isEditing ? -1 : undefined}
        >
          {img}
        </a>
      ) : (
        img
      );

    return (
      <Section>
        <div
          className={`visbuild-image${puck.isEditing ? " visbuild-image--editing" : ""}`}
          style={{
            ...buildImageCssVariables(flat),
            ...buildImageFrameStyle(flat.dimensions),
          }}
        >
          {content}
        </div>
      </Section>
    );
  },
};

export const Image = withLayout(ImageInternal);
