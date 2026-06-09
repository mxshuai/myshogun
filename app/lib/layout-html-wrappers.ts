/**
 * 与画布 Layout + Section 一致的导出 HTML 包裹层（Section 外边距/内边距、尺寸）
 */

import {
  effectiveSectionSides,
  type LayoutFieldProps,
} from "~/components/Layout";

export function normalizeExportSide(v: unknown): string {
  if (v == null) return "0";
  const s = String(v).trim();
  return s || "0";
}

export function sectionOuterStyle(layout: Record<string, unknown>): string {
  const { margin, padding } = effectiveSectionSides(
    layout as LayoutFieldProps
  );
  const dim = (layout.dimensions as { minHeight?: number }) || {};
  const parts: string[] = [
    `margin-top: ${margin.top}`,
    `margin-right: ${margin.right}`,
    `margin-bottom: ${margin.bottom}`,
    `margin-left: ${margin.left}`,
    `padding-top: ${padding.top}`,
    `padding-right: ${padding.right}`,
    `padding-bottom: ${padding.bottom}`,
    `padding-left: ${padding.left}`,
  ];
  const mh = dim.minHeight;
  if (mh != null && Number(mh) > 0) {
    parts.push(`min-height: ${mh}px`);
  }
  return parts.join("; ");
}

/** 与 Section 内层一致：默认 1280px，可被组件 props（如 Text.maxWidth）覆盖 */
export function sectionInnerMaxWidthCss(
  layout: Record<string, unknown>,
  propMaxWidth?: string
): string {
  const raw = propMaxWidth?.trim();
  if (raw) {
    if (/%|px|rem|em|ch|vw|vh|vmin|vmax/.test(raw)) return raw;
    if (/^\d+$/.test(raw)) return `${raw}px`;
    return raw;
  }
  const dim = layout.dimensions as { maxWidth?: number } | undefined;
  const w = dim?.maxWidth;
  if (w != null && Number(w) > 0) return `${w}px`;
  return "1280px";
}

export function sectionInnerStyle(
  layout: Record<string, unknown>,
  propMaxWidth?: string
): string {
  const mw = sectionInnerMaxWidthCss(layout, propMaxWidth);
  return `max-width: ${mw}; margin: 0 auto; width: 100%;`;
}

/** 在组件内核外包两层：Section 外层 → Section 内层（max-width） */
export function wrapLayoutLayers(
  layout: Record<string, unknown>,
  innerContent: string,
  spaces: string,
  propMaxWidth?: string
): string {
  const outer = sectionOuterStyle(layout);
  const inner = sectionInnerStyle(layout, propMaxWidth);

  let html = `${spaces}<div style="${outer}">\n`;
  html += `${spaces}  <div style="${inner}">\n`;

  const pad = `${spaces}    `;
  for (const line of innerContent.split("\n")) {
    if (line.length === 0) {
      html += "\n";
      continue;
    }
    const trimmed = line.replace(/^\s+/, "");
    html += `${pad}${trimmed}\n`;
  }

  html += `${spaces}  </div>\n`;
  html += `${spaces}</div>\n`;

  return html;
}
