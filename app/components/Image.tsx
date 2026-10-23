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
  resolveImageSectionDimensions,
} from "./image-styles";
import "./image.css";

const imageMainFields = {
  src: imageSrcField,
  alt: {
    type: "text" as const,
    label: "Alt",
  },
  imageClickable: {
    type: "radio" as const,
    label: "Image is clickable",
    options: [...onOffOptions],
    switch: true,
  },
};

function resolveImageMainField(props: Components["Image"] | undefined) {
  const main = props?.main;
  const objectFields: Record<string, unknown> = { ...imageMainFields };

  if (normalizeImageValue(main?.src)) {
    objectFields.hoverSrc = imageHoverSrcField;
  }

  if (main?.imageClickable === true) {
    objectFields.linkHref = {
      type: "text",
      label: "Link",
      placeholder: "",
    };
    objectFields.openInNewWindow = {
      type: "radio",
      label: "Open in new window",
      options: [...onOffOptions],
      switch: true,
    };
  }

  return {
    type: "object" as const,
    label: "Main",
    defaultOpen: true,
    objectFields,
  };
}

const imageFields = {
  main: resolveImageMainField(undefined),
  performance: imagePerformanceFieldGroup,
  dimensions: imageDimensionsFieldGroup,
  defaultStyle: imageStyleFieldGroup("Default style", false),
  hoverStyle: imageStyleFieldGroup("Hover style", false),
} as ComponentConfig<Components["Image"]>["fields"];

const ImageInternal: ComponentConfig<Components["Image"]> = {
  fields: imageFields,
  resolveData: (data) => {
    const props = data.props;
    const layoutDimensions = props?.layout?.dimensions;
    const minHeight = layoutDimensions?.minHeight;
    const maxWidth = layoutDimensions?.maxWidth;
    const hasLayoutMin = minHeight != null && minHeight > 0;
    const hasLayoutMax = maxWidth != null && maxWidth > 0;
    if (!hasLayoutMin && !hasLayoutMax) return {};

    const dimensions = { ...(props.dimensions ?? defaultImageDimensions) };
    if ((dimensions.minHeight == null || dimensions.minHeight <= 0) && hasLayoutMin) {
      dimensions.minHeight = minHeight;
    }
    if ((dimensions.maxWidth == null || dimensions.maxWidth <= 0) && hasLayoutMax) {
      dimensions.maxWidth = maxWidth;
    }

    return {
      props: {
        ...props,
        dimensions,
        layout: {
          ...props.layout,
          dimensions: { minHeight: 0, maxWidth: 0 },
        },
      },
    };
  },
  resolveFields: (data) => {
    const props = data.props || {};
    return {
      main: resolveImageMainField(props),
      performance: imageFields!.performance,
      dimensions: imageFields!.dimensions,
      defaultStyle: imageStyleFieldGroup(
        "Default style",
        props.defaultStyle?.boxShadow === true
      ),
      hoverStyle: imageStyleFieldGroup(
        "Hover style",
        props.hoverStyle?.boxShadow === true
      ),
    } as NonNullable<ComponentConfig<Components["Image"]>["fields"]>;
  },
  defaultProps: {
    main: {
      src: { url: "" },
      hoverSrc: null,
      alt: "",
      imageClickable: false,
      linkHref: "",
      openInNewWindow: false,
    },
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
    const sectionSize = resolveImageSectionDimensions(
      flat.dimensions,
      props.layout?.dimensions,
    );
    const sectionMinHeight = sectionSize.minHeight
      ? `${sectionSize.minHeight}px`
      : "";
    const sectionMaxWidth = sectionSize.maxWidth
      ? `${sectionSize.maxWidth}px`
      : "";

    if (!flat.src) {
      return (
        <Section sectionMinHeight={sectionMinHeight} maxWidth={sectionMaxWidth}>
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
      <Section sectionMinHeight={sectionMinHeight} maxWidth={sectionMaxWidth}>
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

export const Image = withLayout(ImageInternal, { showDimensions: false });
