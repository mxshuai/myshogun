/** Paragraph style 的标题用原生 h1–h6，样式写在标签上，压过浏览器默认和页面重置 */
export const TEXT_HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export type TextHeadingLevel = (typeof TEXT_HEADING_LEVELS)[number];

/** 旧数据里的 div class，只用于读回编辑器 */
export function textHeadingClass(level: number): string {
  return `visbuild-text-h${level}`;
}

const TEXT_HEADING_DECLARATIONS: Record<
  TextHeadingLevel,
  Record<string, string>
> = {
  1: {
    display: "block",
    "font-size": "2em",
    "font-weight": "700",
    margin: "0.67em 0",
    padding: "0",
  },
  2: {
    display: "block",
    "font-size": "1.5em",
    "font-weight": "700",
    margin: "0.83em 0",
    padding: "0",
  },
  3: {
    display: "block",
    "font-size": "1.17em",
    "font-weight": "700",
    margin: "1em 0",
    padding: "0",
  },
  4: {
    display: "block",
    "font-size": "1em",
    "font-weight": "700",
    margin: "1.33em 0",
    padding: "0",
  },
  5: {
    display: "block",
    "font-size": "0.83em",
    "font-weight": "700",
    margin: "1.67em 0",
    padding: "0",
  },
  6: {
    display: "block",
    "font-size": "0.67em",
    "font-weight": "700",
    margin: "2.33em 0",
    padding: "0",
  },
};

function headingLevel(level: number): TextHeadingLevel {
  if (level >= 1 && level <= 6) return level as TextHeadingLevel;
  return 1;
}

/** 写在 h 标签 style 上的标题外观 */
export function textHeadingInlineStyle(level: number): string {
  return Object.entries(TEXT_HEADING_DECLARATIONS[headingLevel(level)])
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

function parseStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

function serializeStyle(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

/** 标题外观以这里为准，保留 text-align 等其它行内样式 */
function mergeHeadingStyle(existing: string, level: number): string {
  const base = TEXT_HEADING_DECLARATIONS[headingLevel(level)];
  const extras: Record<string, string> = {};
  for (const [key, value] of Object.entries(parseStyle(existing))) {
    if (!(key in base)) extras[key] = value;
  }
  return serializeStyle({ ...base, ...extras });
}

function withHeadingStyle(attrs: string, level: number): string {
  const styleMatch = attrs.match(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i);
  const existing = styleMatch?.[2] ?? "";
  const styleValue = mergeHeadingStyle(existing, level).replace(/"/g, "&quot;");
  if (styleMatch) {
    return attrs.replace(styleMatch[0], ` style="${styleValue}"`);
  }
  return `${attrs} style="${styleValue}"`;
}

function stripHeadingClass(attrs: string, level: number): string {
  const className = textHeadingClass(level);
  return attrs.replace(
    /\sclass\s*=\s*(["'])([\s\S]*?)\1/i,
    (_match, quote: string, classes: string) => {
      const next = classes
        .split(/\s+/)
        .filter((part) => part && part !== className)
        .join(" ");
      if (!next) return "";
      return ` class=${quote}${next}${quote}`;
    },
  );
}

function convertLegacyHeadingDivs(html: string): string {
  return html.replace(
    /<div\b([^>]*?)>([\s\S]*?)<\/div>/gi,
    (match, attrs: string, inner: string) => {
      const classMatch = attrs.match(/\bclass\s*=\s*(["'])([\s\S]*?)\1/i);
      const levelMatch = classMatch?.[2].match(/\bvisbuild-text-h([1-6])\b/);
      if (!levelMatch) return match;
      const level = Number(levelMatch[1]);
      const nextAttrs = withHeadingStyle(stripHeadingClass(attrs, level), level);
      return `<h${level}${nextAttrs}>${inner}</h${level}>`;
    },
  );
}

/**
 * 旧的 div.visbuild-text-h* 改回 h 标签，并给 h1–h6 写上标题行内样式。
 * 画布静态预览和导出都走这里。
 */
export function replaceTextHeadingTags(html: string): string {
  const withNativeTags = convertLegacyHeadingDivs(html);
  return withNativeTags.replace(
    /<h([1-6])\b([^>]*)>/gi,
    (_match, level: string, attrs: string) =>
      `<h${level}${withHeadingStyle(attrs, Number(level))}>`,
  );
}

/**
 * Text 正文样式的唯一来源。画布由 Text 注入，导出由 generateCSS 拼入。
 * 标题外观在 h 标签的 style 上，不放在这里。
 */
export const TEXT_CONTENT_CSS = [
  ".visbuild-text { width: 100%; line-height: 1.5; word-break: break-word; }",
  ".visbuild-text p { margin: 0 0 0.75em; }",
  ".visbuild-text p:last-child { margin-bottom: 0; }",
  ".visbuild-text ul, .visbuild-text ol { margin: 1em 0; padding: 0 0 0 40px; }",
  ".visbuild-text ul ul, .visbuild-text ol ol, .visbuild-text ul ol, .visbuild-text ol ul { margin: 0; }",
  ".visbuild-text ul { list-style-type: disc; }",
  ".visbuild-text ol { list-style-type: decimal; }",
  ".visbuild-text li { display: list-item; }",
  '.visbuild-text ul.visbuild-list-dash { list-style-type: "– "; padding-left: 1.25em; }',
  ".visbuild-text img { max-width: 100%; height: auto; }",
  ".visbuild-text a { color: #2563eb; text-decoration: underline; cursor: pointer; }",
  ".visbuild-text a.visbuild-link-no-underline { text-decoration: none !important; }",
].join("\n");
