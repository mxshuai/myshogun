import type { CSSProperties } from "react";

/** 与 .visbuild-page 正文一致，避免 Shopify 标题字体变量渗进来 */
export const HERO_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const lockedType: CSSProperties = {
  fontFamily: HERO_FONT_FAMILY,
  fontStyle: "normal",
  letterSpacing: "normal",
  textTransform: "none",
  maxWidth: "none",
};

export function heroShellStyle(
  align: "left" | "center",
  backgroundImage: string,
): CSSProperties {
  return {
    padding: "80px 20px",
    backgroundImage: backgroundImage
      ? `url(${backgroundImage})`
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    textAlign: align,
    color: "#ffffff",
    fontFamily: HERO_FONT_FAMILY,
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: align === "center" ? "center" : "flex-start",
    width: "100%",
    boxSizing: "border-box",
  };
}

export const heroTitleStyle: CSSProperties = {
  ...lockedType,
  fontSize: "3rem",
  fontWeight: 700,
  color: "#ffffff",
  margin: "0 0 20px 0",
  lineHeight: 1.2,
};

export const heroSubtitleStyle: CSSProperties = {
  ...lockedType,
  fontSize: "1.25rem",
  fontWeight: 400,
  color: "#ffffff",
  margin: "0 0 32px 0",
  lineHeight: 1.6,
  opacity: 0.95,
};

export const heroButtonStyle: CSSProperties = {
  ...lockedType,
  display: "inline-block",
  padding: "16px 32px",
  backgroundColor: "#ffffff",
  color: "#667eea",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "1.125rem",
  lineHeight: 1.2,
  border: "none",
  boxShadow: "none",
  transition: "transform 0.2s ease",
};

function cssText(style: CSSProperties): string {
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== "")
    .map(([key, value]) => {
      const prop = key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
      return `${prop}: ${value}`;
    })
    .join("; ");
}

export function heroShellCss(align: string, backgroundImage: string): string {
  const resolved = align === "left" ? "left" : "center";
  return cssText(heroShellStyle(resolved, backgroundImage));
}

export function heroTitleCss(): string {
  return cssText(heroTitleStyle);
}

export function heroSubtitleCss(): string {
  return cssText(heroSubtitleStyle);
}

export function heroButtonCss(): string {
  return cssText(heroButtonStyle);
}

/**
 * 主题常用 h1/p/a 和 a:hover 选择器，行内样式盖不住伪类，
 * 也不能压过带 !important 的标题色。只锁 Hero 自己。
 */
export const HERO_EXPORT_CSS = `.visbuild-page .visbuild-hero h1,
.visbuild-page .visbuild-hero p {
  color: #ffffff !important;
  font-family: ${HERO_FONT_FAMILY} !important;
  font-style: normal !important;
  letter-spacing: normal !important;
  text-transform: none !important;
  max-width: none !important;
}
.visbuild-page .visbuild-hero h1 {
  font-size: 3rem !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
  margin: 0 0 20px 0 !important;
}
.visbuild-page .visbuild-hero p {
  font-size: 1.25rem !important;
  font-weight: 400 !important;
  line-height: 1.6 !important;
  margin: 0 0 32px 0 !important;
  opacity: 0.95 !important;
}
.visbuild-page .visbuild-hero a,
.visbuild-page .visbuild-hero a:hover,
.visbuild-page .visbuild-hero a:focus,
.visbuild-page .visbuild-hero a:visited {
  display: inline-block !important;
  color: #667eea !important;
  background-color: #ffffff !important;
  text-decoration: none !important;
  border: none !important;
  box-shadow: none !important;
  font-family: ${HERO_FONT_FAMILY} !important;
  letter-spacing: normal !important;
  text-transform: none !important;
}`;
