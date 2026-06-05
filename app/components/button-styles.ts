import type { CSSProperties } from "react";

export type ButtonShadowConfig = {
  enabled: boolean;
  color?: string;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  spread?: number;
};

export function resolveBorder(
  thickness?: number,
  color?: string
): Pick<CSSProperties, "border"> {
  if (thickness == null || !Number.isFinite(thickness) || thickness <= 0) {
    return { border: "none" };
  }
  return {
    border: `${thickness}px solid ${color?.trim() || "transparent"}`,
  };
}

export function resolveBorderCSSValue(
  thickness?: number,
  color?: string
): string {
  if (thickness == null || !Number.isFinite(thickness) || thickness <= 0) {
    return "none";
  }
  return `${thickness}px solid ${color?.trim() || "transparent"}`;
}

export function resolveBorderRadiusPx(
  radius?: number,
  fallback?: number
): number | undefined {
  if (radius != null && Number.isFinite(radius)) return radius;
  if (fallback != null && Number.isFinite(fallback)) return fallback;
  return undefined;
}

export function resolveBoxShadow(config: ButtonShadowConfig): string {
  if (!config.enabled) return "none";
  const x = config.offsetX ?? 0;
  const y = config.offsetY ?? 0;
  const blur = config.blur ?? 0;
  const spread = config.spread ?? 0;
  const color = config.color?.trim() || "rgba(0, 0, 0, 0.25)";
  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

export type ButtonStyleProps = {
  textColor: string;
  backgroundColor: string;
  borderThickness?: number;
  borderRadius?: number;
  borderColor?: string;
  boxShadow: boolean;
  boxShadowColor?: string;
  boxShadowOffsetX?: number;
  boxShadowOffsetY?: number;
  boxShadowBlur?: number;
  boxShadowSpread?: number;
};

export type ButtonRenderProps = ButtonStyleProps & {
  hoverTextColor: string;
  hoverBackgroundColor: string;
  hoverBorderThickness?: number;
  hoverBorderRadius?: number;
  hoverBorderColor?: string;
  hoverBoxShadow: boolean;
  hoverBoxShadowColor?: string;
  hoverBoxShadowOffsetX?: number;
  hoverBoxShadowOffsetY?: number;
  hoverBoxShadowBlur?: number;
  hoverBoxShadowSpread?: number;
  activeTextColor: string;
  activeBackgroundColor: string;
  activeBorderThickness?: number;
  activeBorderRadius?: number;
  activeBorderColor?: string;
  activeBoxShadow: boolean;
  activeBoxShadowColor?: string;
  activeBoxShadowOffsetX?: number;
  activeBoxShadowOffsetY?: number;
  activeBoxShadowBlur?: number;
  activeBoxShadowSpread?: number;
  font: string;
  fontSize: number;
  lineHeight?: number;
  letterSpacing?: number;
  fullWidth: boolean;
  maxWidth?: number;
  minHeight?: number;
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

export function buildButtonCssVariables(
  props: ButtonRenderProps
): CSSProperties {
  const defaultRadius = resolveBorderRadiusPx(props.borderRadius, 2) ?? 2;
  const hoverRadius =
    resolveBorderRadiusPx(props.hoverBorderRadius, defaultRadius) ??
    defaultRadius;
  const activeRadius =
    resolveBorderRadiusPx(props.activeBorderRadius, defaultRadius) ??
    defaultRadius;

  return {
    "--btn-color": props.textColor,
    "--btn-bg": props.backgroundColor,
    "--btn-border": resolveBorderCSSValue(
      props.borderThickness,
      props.borderColor
    ),
    "--btn-radius": `${defaultRadius}px`,
    "--btn-shadow": shadowFromStyle(
      props.boxShadow,
      props.boxShadowColor,
      props.boxShadowOffsetX,
      props.boxShadowOffsetY,
      props.boxShadowBlur,
      props.boxShadowSpread
    ),
    "--btn-hover-color": props.hoverTextColor,
    "--btn-hover-bg": props.hoverBackgroundColor,
    "--btn-hover-border": resolveBorderCSSValue(
      props.hoverBorderThickness ?? props.borderThickness,
      props.hoverBorderColor ?? props.borderColor
    ),
    "--btn-hover-radius": `${hoverRadius}px`,
    "--btn-hover-shadow": shadowFromStyle(
      props.hoverBoxShadow,
      props.hoverBoxShadowColor,
      props.hoverBoxShadowOffsetX,
      props.hoverBoxShadowOffsetY,
      props.hoverBoxShadowBlur,
      props.hoverBoxShadowSpread
    ),
    "--btn-active-color": props.activeTextColor,
    "--btn-active-bg": props.activeBackgroundColor,
    "--btn-active-border": resolveBorderCSSValue(
      props.activeBorderThickness ?? props.borderThickness,
      props.activeBorderColor ?? props.borderColor
    ),
    "--btn-active-radius": `${activeRadius}px`,
    "--btn-active-shadow": shadowFromStyle(
      props.activeBoxShadow,
      props.activeBoxShadowColor,
      props.activeBoxShadowOffsetX,
      props.activeBoxShadowOffsetY,
      props.activeBoxShadowBlur,
      props.activeBoxShadowSpread
    ),
  } as CSSProperties;
}

export function buildButtonLinkStyle(
  props: ButtonRenderProps
): CSSProperties {
  return {
    ...buildButtonCssVariables(props),
    display: props.fullWidth ? "block" : "inline-block",
    width: props.fullWidth ? "100%" : undefined,
    maxWidth:
      props.maxWidth != null && Number.isFinite(props.maxWidth) && props.maxWidth > 0
        ? `${props.maxWidth}px`
        : undefined,
    minHeight:
      props.minHeight != null &&
      Number.isFinite(props.minHeight) &&
      props.minHeight > 0
        ? `${props.minHeight}px`
        : undefined,
    fontFamily: props.font?.trim() ? props.font : "inherit",
    fontSize: `${props.fontSize}px`,
    fontWeight: 500,
    ...(props.lineHeight != null && Number.isFinite(props.lineHeight)
      ? { lineHeight: props.lineHeight }
      : {}),
    ...(props.letterSpacing != null && Number.isFinite(props.letterSpacing)
      ? { letterSpacing: `${props.letterSpacing}px` }
      : {}),
    padding: "10px 20px",
    textDecoration: "none",
    textAlign: "center",
    boxSizing: "border-box",
    transition: "color 0.2s ease, background-color 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
  };
}

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function serializeButtonInlineStyle(props: ButtonRenderProps): string {
  const style = buildButtonLinkStyle(props);
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
    .join("; ");
}

export const BUTTON_EXPORT_CSS = `.visbuild-button {
  color: var(--btn-color);
  background-color: var(--btn-bg);
  border: var(--btn-border);
  border-radius: var(--btn-radius, 2px);
  box-shadow: var(--btn-shadow, none);
}
.visbuild-button:hover,
.visbuild-button:focus-visible {
  color: var(--btn-hover-color);
  background-color: var(--btn-hover-bg);
  border: var(--btn-hover-border);
  border-radius: var(--btn-hover-radius, var(--btn-radius, 2px));
  box-shadow: var(--btn-hover-shadow, none);
}
.visbuild-button:active {
  color: var(--btn-active-color);
  background-color: var(--btn-active-bg);
  border: var(--btn-active-border);
  border-radius: var(--btn-active-radius, var(--btn-radius, 2px));
  box-shadow: var(--btn-active-shadow, none);
}`;
