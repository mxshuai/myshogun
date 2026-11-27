import type { CSSProperties } from "react";

import {
  IMAGE_MOUSE_HOVER_CSS,
  normalizeImageAnimations,
  type ImageAnimationsGroup,
} from "./image-animation-config";
import { normalizeImageValue } from "./editor/media/types";
import {
  resolveBorderCSSValue,
  resolveBorderRadiusPx,
  resolveBoxShadow,
} from "./button-styles";

export type ImageDimensionsGroup = {
  /** 原 Layout Dimensions：区块最小高度 */
  minHeight?: number;
  /** 原 Layout Dimensions：内容最大宽度 */
  maxWidth?: number;
  height?: number;
  imageFit: "natural" | "cover" | "contain" | "stretch";
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
  hoverSrc: string;
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
  animations: ImageAnimationsGroup;
};

const DEFAULT_DIMENSIONS: ImageDimensionsGroup = {
  minHeight: 0,
  maxWidth: 0,
  imageFit: "natural",
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

export const IMAGE_NATURAL_FIT_CLASS = "visbuild-image--natural-fit";

export function isNaturalImageLayout(
  dimensions: ImageDimensionsGroup,
): boolean {
  if (dimensions.imageFit !== "natural") return false;
  if (dimensions.aspectRatio !== "auto") return false;
  if (dimensions.height != null && dimensions.height > 0) return false;
  return true;
}

export function mapImageFit(
  fit: ImageDimensionsGroup["imageFit"],
): CSSProperties["objectFit"] | undefined {
  if (fit === "natural") return undefined;
  if (fit === "stretch") return "fill";
  return fit;
}

export function flattenImageProps(props: Record<string, unknown>): ImageRenderProps {
  const main = (props.main ?? {}) as Record<string, unknown>;
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

  const mainImage = normalizeImageValue(main.src);
  const hoverImage = normalizeImageValue(main.hoverSrc);

  return {
    src: mainImage?.url ?? "",
    hoverSrc: hoverImage?.url ?? "",
    alt: String(main.alt ?? ""),
    imageClickable: main.imageClickable === true,
    linkHref: typeof main.linkHref === "string" ? main.linkHref : "",
    openInNewWindow: main.openInNewWindow === true,
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
    animations: normalizeImageAnimations(
      props.animations as Partial<ImageAnimationsGroup> | undefined,
    ),
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

/** Image Dimensions 上的 Min Height / Max Width；未设置时沿用旧的 layout.dimensions */
export function resolveImageSectionDimensions(
  dimensions: ImageDimensionsGroup,
  layoutDimensions?: { minHeight?: number; maxWidth?: number },
): { minHeight?: number; maxWidth?: number } {
  const minHeight =
    dimensions.minHeight != null && dimensions.minHeight > 0
      ? dimensions.minHeight
      : layoutDimensions?.minHeight;
  const maxWidth =
    dimensions.maxWidth != null && dimensions.maxWidth > 0
      ? dimensions.maxWidth
      : layoutDimensions?.maxWidth;
  return {
    minHeight: minHeight != null && minHeight > 0 ? minHeight : undefined,
    maxWidth: maxWidth != null && maxWidth > 0 ? maxWidth : undefined,
  };
}

export function buildImageFrameStyle(dimensions: ImageDimensionsGroup): CSSProperties {
  const natural = isNaturalImageLayout(dimensions);
  const style: CSSProperties = {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  };

  if (natural) {
    style.display = "flex";
    style.flexDirection = "column";
    style.alignItems = "center";
  }

  if (dimensions.aspectRatio !== "auto") {
    style.aspectRatio = dimensions.aspectRatio;
  }
  if (dimensions.height != null && dimensions.height > 0) {
    style.height = `${dimensions.height}px`;
  }

  return style;
}

export function buildImageStackStyle(
  dimensions: ImageDimensionsGroup,
): CSSProperties | undefined {
  if (!isNaturalImageLayout(dimensions)) return undefined;
  return {
    position: "relative",
    maxWidth: "100%",
    display: "inline-block",
    lineHeight: 0,
  };
}

export function buildImageDimensionalStyle(
  dimensions: ImageDimensionsGroup,
): CSSProperties {
  const natural = isNaturalImageLayout(dimensions);
  const fixedFrame =
    dimensions.aspectRatio !== "auto" ||
    (dimensions.height != null && dimensions.height > 0);

  if (natural) {
    return {
      width: "auto",
      maxWidth: "100%",
      height: "auto",
      transform:
        dimensions.zoom > 0 ? `scale(${1 + dimensions.zoom / 100})` : undefined,
      transformOrigin: "center top",
    };
  }

  const objectFit = mapImageFit(dimensions.imageFit);
  return {
    width: "100%",
    height: fixedFrame ? "100%" : "auto",
    ...(objectFit != null ? { objectFit } : {}),
    objectPosition: dimensions.imagePosition,
    transform:
      dimensions.zoom > 0 ? `scale(${1 + dimensions.zoom / 100})` : undefined,
    transformOrigin: dimensions.imagePosition,
  };
}

function supportsResponsiveImageParams(src: string): boolean {
  if (src.startsWith("/dev-uploads/")) return false;
  try {
    const url = new URL(src);
    if (url.hostname.endsWith(".amazonaws.com")) return false;
    return (
      url.hostname === "cdn.shopify.com" ||
      url.hostname.endsWith(".shopifycdn.com")
    );
  } catch {
    return false;
  }
}

export function buildResponsiveSrcSet(
  src: string,
  quality: number
): string | undefined {
  if (!src.trim() || !supportsResponsiveImageParams(src)) return undefined;
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
.visbuild-image--natural-fit .visbuild-image__link {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
}
.visbuild-image:not(.visbuild-image--natural-fit) .visbuild-image__link {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  text-decoration: none;
  color: inherit;
}
.visbuild-image--natural-fit .visbuild-image__link {
  position: relative;
  text-decoration: none;
  color: inherit;
}
.visbuild-image__stack {
  position: relative;
  max-width: 100%;
  display: inline-block;
  line-height: 0;
}
.visbuild-image__img {
  display: block;
  max-width: 100%;
  height: auto;
  box-sizing: border-box;
  opacity: var(--img-opacity, 1);
  border: var(--img-border, none);
  border-radius: var(--img-radius, 0);
  box-shadow: var(--img-shadow, none);
  transition: opacity 0.2s ease, border 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.visbuild-image__img--hover {
  position: absolute;
  inset: 0;
  opacity: 0;
}
.visbuild-image:not(.visbuild-image--editing):hover .visbuild-image__img--default.visbuild-image__img--stacked {
  opacity: 0;
}
.visbuild-image:not(.visbuild-image--editing):hover .visbuild-image__img--hover {
  opacity: 1;
}
.visbuild-image:not(.visbuild-image--editing):not(.visbuild-image--has-hover):hover .visbuild-image__img {
  opacity: var(--img-hover-opacity, var(--img-opacity, 1));
  border: var(--img-hover-border, var(--img-border, none));
  border-radius: var(--img-hover-radius, var(--img-radius, 0));
  box-shadow: var(--img-hover-shadow, var(--img-shadow, none));
}
.visbuild-image--scroll-pending {
  opacity: 0;
}
${IMAGE_MOUSE_HOVER_CSS}`;
