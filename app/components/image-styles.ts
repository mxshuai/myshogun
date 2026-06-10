import type { CSSProperties } from "react";

import {
  resolveBorderCSSValue,
  resolveBorderRadiusPx,
  resolveBoxShadow,
} from "./button-styles";

export type ImageDimensionsGroup = {
  height?: number;
  imageFit: "cover" | "contain" | "stretch";
  imagePosition: string;
  zoom: number;
  aspectRatio: "auto" | "16/9" | "4/3" | "3/2" | "1/1";
};

export type ImagePerformanceGroup = {
  imageQuality: number;
  responsiveImage: boolean;
  loading: "eager" | "lazy" | "auto";
};

export type ImageStyleGroup = {
  opacity: number;
  borderColor: string;
  borderThickness?: number;
  borderRadius?: number;
  boxShadow: boolean;
  boxShadowColor?: string;
  boxShadowOffsetX?: number;
  boxShadowOffsetY?: number;
  boxShadowBlur?: number;
  boxShadowSpread?: number;
};

export type ImageRenderProps = {
  src: string;
  alt: string;
  imageClickable: boolean;
  linkHref?: string;
  openInNewWindow?: boolean;
  performance: ImagePerformanceGroup;
  dimensions: ImageDimensionsGroup;
  opacity: number;
  borderColor: string;
  borderThickness?: number;
  borderRadius?: number;
  boxShadow: boolean;
  boxShadowColor?: string;
  boxShadowOffsetX?: number;
  boxShadowOffsetY?: number;
  boxShadowBlur?: number;
  boxShadowSpread?: number;
  hoverOpacity: number;
  hoverBorderColor: string;
  hoverBorderThickness?: number;
  hoverBorderRadius?: number;
  hoverBoxShadow: boolean;
  hoverBoxShadowColor?: string;
  hoverBoxShadowOffsetX?: number;
  hoverBoxShadowOffsetY?: number;
  hoverBoxShadowBlur?: number;
  hoverBoxShadowSpread?: number;
};

const DEFAULT_DIMENSIONS: ImageDimensionsGroup = {
  imageFit: "cover",
  imagePosition: "center center",
  zoom: 0,
  aspectRatio: "auto",
};

const DEFAULT_PERFORMANCE: ImagePerformanceGroup = {
  imageQuality: 55,
  responsiveImage: true,
  loading: "auto",
};

const DEFAULT_STYLE: ImageStyleGroup = {
  opacity: 1,
  borderColor: "#000000",
  borderThickness: 0,
  borderRadius: 0,
  boxShadow: false,
  boxShadowOffsetX: 0,
  boxShadowOffsetY: 0,
  boxShadowBlur: 0,
  boxShadowSpread: 0,
};

function shadowFromStyle(
  enabled: boolean,
  color?: string,
  offsetX?: number,
  offsetY?: number,
  blur?: number,
  spread?: number
): string {
  return resolveBoxShadow({
    enabled,
    color,
    offsetX,
    offsetY,
    blur,
    spread,
  });
}

function styleFromGroup(
  group: Partial<ImageStyleGroup> | undefined,
  fallback: ImageStyleGroup
): ImageStyleGroup {
  return { ...fallback, ...group };
}

export function mapImageFit(fit: ImageDimensionsGroup["imageFit"]): CSSProperties["objectFit"] {
  if (fit === "stretch") return "fill";
  return fit;
}

export function flattenImageProps(props: Record<string, unknown>): ImageRenderProps {
  const dimensions = {
    ...DEFAULT_DIMENSIONS,
    ...(props.dimensions as Partial<ImageDimensionsGroup>),
  };
  const performance = {
    ...DEFAULT_PERFORMANCE,
    ...(props.performance as Partial<ImagePerformanceGroup>),
  };
  const defaultStyle = styleFromGroup(
    props.defaultStyle as Partial<ImageStyleGroup>,
    DEFAULT_STYLE
  );
  const hoverStyle = styleFromGroup(
    props.hoverStyle as Partial<ImageStyleGroup>,
    DEFAULT_STYLE
  );

  return {
    src: String(props.src ?? ""),
    alt: String(props.alt ?? ""),
    imageClickable: props.imageClickable === true,
    linkHref: typeof props.linkHref === "string" ? props.linkHref : "",
    openInNewWindow: props.openInNewWindow === true,
    performance,
    dimensions,
    opacity: defaultStyle.opacity,
    borderColor: defaultStyle.borderColor,
    borderThickness: defaultStyle.borderThickness,
    borderRadius: defaultStyle.borderRadius,
    boxShadow: defaultStyle.boxShadow,
    boxShadowColor: defaultStyle.boxShadowColor,
    boxShadowOffsetX: defaultStyle.boxShadowOffsetX,
    boxShadowOffsetY: defaultStyle.boxShadowOffsetY,
    boxShadowBlur: defaultStyle.boxShadowBlur,
    boxShadowSpread: defaultStyle.boxShadowSpread,
    hoverOpacity: hoverStyle.opacity,
    hoverBorderColor: hoverStyle.borderColor,
    hoverBorderThickness: hoverStyle.borderThickness,
    hoverBorderRadius: hoverStyle.borderRadius,
    hoverBoxShadow: hoverStyle.boxShadow,
    hoverBoxShadowColor: hoverStyle.boxShadowColor,
    hoverBoxShadowOffsetX: hoverStyle.boxShadowOffsetX,
    hoverBoxShadowOffsetY: hoverStyle.boxShadowOffsetY,
    hoverBoxShadowBlur: hoverStyle.boxShadowBlur,
    hoverBoxShadowSpread: hoverStyle.boxShadowSpread,
  };
}

export function buildImageCssVariables(props: ImageRenderProps): CSSProperties {
  const defaultRadius = resolveBorderRadiusPx(props.borderRadius, 0) ?? 0;
  const hoverRadius =
    resolveBorderRadiusPx(props.hoverBorderRadius, defaultRadius) ?? defaultRadius;

  return {
    "--img-opacity": String(props.opacity),
    "--img-border": resolveBorderCSSValue(props.borderThickness, props.borderColor),
    "--img-radius": `${defaultRadius}px`,
    "--img-shadow": shadowFromStyle(
      props.boxShadow,
      props.boxShadowColor,
      props.boxShadowOffsetX,
      props.boxShadowOffsetY,
      props.boxShadowBlur,
      props.boxShadowSpread
    ),
    "--img-hover-opacity": String(props.hoverOpacity),
    "--img-hover-border": resolveBorderCSSValue(
      props.hoverBorderThickness ?? props.borderThickness,
      props.hoverBorderColor ?? props.borderColor
    ),
    "--img-hover-radius": `${hoverRadius}px`,
    "--img-hover-shadow": shadowFromStyle(
      props.hoverBoxShadow,
      props.hoverBoxShadowColor,
      props.hoverBoxShadowOffsetX,
      props.hoverBoxShadowOffsetY,
      props.hoverBoxShadowBlur,
      props.hoverBoxShadowSpread
    ),
  } as CSSProperties;
}

export function buildImageFrameStyle(dimensions: ImageDimensionsGroup): CSSProperties {
  const style: CSSProperties = {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  };

  if (dimensions.aspectRatio !== "auto") {
    style.aspectRatio = dimensions.aspectRatio;
  }
  if (dimensions.height != null && dimensions.height > 0) {
    style.height = `${dimensions.height}px`;
  }

  return style;
}

export function buildImageDimensionalStyle(
  dimensions: ImageDimensionsGroup
): CSSProperties {
  const fixedFrame =
    dimensions.aspectRatio !== "auto" ||
    (dimensions.height != null && dimensions.height > 0);

  return {
    width: "100%",
    height: fixedFrame ? "100%" : "auto",
    objectFit: mapImageFit(dimensions.imageFit),
    objectPosition: dimensions.imagePosition,
    transform:
      dimensions.zoom > 0 ? `scale(${1 + dimensions.zoom / 100})` : undefined,
    transformOrigin: dimensions.imagePosition,
  };
}

export function buildResponsiveSrcSet(
  src: string,
  quality: number
): string | undefined {
  if (!src.trim()) return undefined;
  const widths = [400, 800, 1200, 1600];
  return widths
    .map((w) => {
      const separator = src.includes("?") ? "&" : "?";
      return `${src}${separator}width=${w}&quality=${quality} ${w}w`;
    })
    .join(", ");
}

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function serializeImageWrapperStyle(props: ImageRenderProps): string {
  const style = {
    ...buildImageCssVariables(props),
    ...buildImageFrameStyle(props.dimensions),
  };
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
    .join("; ");
}

export function serializeImageDimensionalStyle(
  dimensions: ImageDimensionsGroup
): string {
  const style = buildImageDimensionalStyle(dimensions);
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
    .join("; ");
}

export const IMAGE_EXPORT_CSS = `.visbuild-image__frame {
  width: 100%;
  overflow: hidden;
  position: relative;
}
.visbuild-image__link {
  display: block;
  text-decoration: none;
  color: inherit;
}
.visbuild-image__img {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  opacity: var(--img-opacity, 1);
  border: var(--img-border, none);
  border-radius: var(--img-radius, 0);
  box-shadow: var(--img-shadow, none);
  transition: opacity 0.2s ease, border 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.visbuild-image:hover .visbuild-image__img {
  opacity: var(--img-hover-opacity, var(--img-opacity, 1));
  border: var(--img-hover-border, var(--img-border, none));
  border-radius: var(--img-hover-radius, var(--img-radius, 0));
  box-shadow: var(--img-hover-shadow, var(--img-shadow, none));
}`;
