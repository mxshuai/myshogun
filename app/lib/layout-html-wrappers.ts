/**
 * 与画布 Layout + Section 一致的导出 HTML 包裹层（cell padding、Section 外边距/内边距、尺寸）
 */

export function normalizeExportSide(v: unknown): string {
  if (v == null) return "0";
  const s = String(v).trim();
  return s || "0";
}

export function layoutCellPaddingStyle(layout: Record<string, unknown>): string {
  const p = layout.padding as string | undefined;
  if (!p) return "";
  return `padding-top: ${p}; padding-bottom: ${p};`;
}

export function sectionOuterStyle(layout: Record<string, unknown>): string {
  const m = (layout.sectionMargin as Record<string, unknown>) || {};
  const pad = (layout.sectionPadding as Record<string, unknown>) || {};
  const dim = (layout.dimensions as { minHeight?: number }) || {};
  const parts: string[] = [
    `margin-top: ${normalizeExportSide(m.top)}`,
    `margin-right: ${normalizeExportSide(m.right)}`,
    `margin-bottom: ${normalizeExportSide(m.bottom)}`,
    `margin-left: ${normalizeExportSide(m.left)}`,
    `padding-top: ${normalizeExportSide(pad.top)}`,
    `padding-right: ${normalizeExportSide(pad.right)}`,
    `padding-bottom: ${normalizeExportSide(pad.bottom)}`,
    `padding-left: ${normalizeExportSide(pad.left)}`,
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

/**
 * 在组件内核外包三层：可选 cell 纵向 padding → Section 外层 → Section 内层（max-width）
 */
export function wrapLayoutLayers(
  layout: Record<string, unknown>,
  innerContent: string,
  spaces: string,
  propMaxWidth?: string
): string {
  const cell = layoutCellPaddingStyle(layout);
  const outer = sectionOuterStyle(layout);
  const inner = sectionInnerStyle(layout, propMaxWidth);
  const hasCell = Boolean(cell);

  let html = "";
  if (hasCell) {
    html += `${spaces}<div style="${cell}">\n`;
  }

  const o = hasCell ? `${spaces}  ` : spaces;
  html += `${o}<div style="${outer}">\n`;
  html += `${o}  <div style="${inner}">\n`;

  const baseLen = o.length + 4;
  const pad = " ".repeat(baseLen);
  for (const line of innerContent.split("\n")) {
    if (line.length === 0) {
      html += "\n";
      continue;
    }
    const trimmed = line.replace(/^\s+/, "");
    html += `${pad}${trimmed}\n`;
  }

  html += `${o}  </div>\n`;
  html += `${o}</div>\n`;

  if (hasCell) {
    html += `${spaces}</div>\n`;
  }

  return html;
}
