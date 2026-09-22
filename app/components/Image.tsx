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
  imageHoverSrcField,
  imagePerformanceFieldGroup,
  imageSrcField,
  imageStyleFieldGroup,
  onOffOptions,
} from "./image-field-groups";
import { normalizeImageValue } from "./editor/media/types";
import {
  buildImageCssVariables,
  buildImageDimensionalStyle,
  buildImageFrameStyle,
  buildResponsiveSrcSet,
  flattenImageProps,
} from "./image-styles";
import "./image.css";

const imageFields = {
  src: imageSrcField,
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

    if (normalizeImageValue(props.src)) {
      fields.hoverSrc = imageHoverSrcField;
    }

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
    src: { url: "" },
    hoverSrc: null,
    alt: "",
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

    if (!flat.src) {
      return (
        <Section>
          <div
            className={`visbuild-image visbuild-image--empty${puck.isEditing ? " visbuild-image--editing" : ""}`}
            style={buildImageFrameStyle(flat.dimensions)}
          >
            <span className="visbuild-image__empty-label">Select an image</span>
          </div>
        </Section>
      );
    }
    const loadingAttr =
      flat.performance.loading === "auto"
        ? undefined
        : flat.performance.loading;
    const srcSet = flat.performance.responsiveImage
      ? buildResponsiveSrcSet(flat.src, flat.performance.imageQuality)
      : undefined;
    const hoverSrcSet =
      flat.performance.responsiveImage && flat.hoverSrc
        ? buildResponsiveSrcSet(flat.hoverSrc, flat.performance.imageQuality)
        : undefined;
    const resolvedHref = flat.linkHref?.trim() || "#";
    const dimensionalStyle = buildImageDimensionalStyle(flat.dimensions);

    const hasHoverImage = Boolean(flat.hoverSrc);
    const imgStack = (
      <>
        <img
          className={`visbuild-image__img visbuild-image__img--default${hasHoverImage ? " visbuild-image__img--stacked" : ""}`}
          src={flat.src}
          alt={flat.alt}
          loading={loadingAttr}
          srcSet={srcSet}
          sizes={srcSet ? "100vw" : undefined}
          style={dimensionalStyle}
        />
        {hasHoverImage ? (
          <img
            className="visbuild-image__img visbuild-image__img--hover visbuild-image__img--stacked"
            src={flat.hoverSrc}
            alt=""
            aria-hidden="true"
            loading={loadingAttr}
            srcSet={hoverSrcSet}
            sizes={hoverSrcSet ? "100vw" : undefined}
            style={dimensionalStyle}
          />
        ) : null}
      </>
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
          {imgStack}
        </a>
      ) : (
        imgStack
      );

    return (
      <Section>
        <div
          className={`visbuild-image${hasHoverImage ? " visbuild-image--has-hover" : ""}${puck.isEditing ? " visbuild-image--editing" : ""}`}
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
