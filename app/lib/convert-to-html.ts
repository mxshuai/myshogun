import type { Data } from "@puckeditor/core";

import { effectiveSectionSides } from "~/components/Layout";
import { resolveBackgroundSizeCss } from "~/components/container-background-size";
import { iconFontSizeFromHeight, toFaIconClasses } from "~/components/icon-options";
import {
  BUTTON_EXPORT_CSS,
  flattenButtonProps,
  serializeButtonInlineStyle,
} from "~/components/button-styles";
import {
  buildResponsiveSrcSet,
  flattenImageProps,
  IMAGE_EXPORT_CSS,
  serializeImageDimensionalStyle,
  serializeImageWrapperStyle,
} from "~/components/image-styles";
import {
  columnsGridClassName,
  columnsGridStyle,
  COLUMNS_EXPORT_CSS,
} from "~/components/columns-styles";
import {
  clampActiveTabIndex,
  DEFAULT_ACTIVE_TAB_COLOR_GROUP,
  DEFAULT_TAB_COLOR_GROUP,
  serializeTabButtonStyle,
  TAB_BUTTON_BORDER_RADIUS,
  TAB_BUTTON_PADDING,
  TAB_CONTENT_PADDING,
  TABS_EXPORT_CSS,
} from "~/components/tabs-styles";
import {
  ACCORDION_CARET_FA_CLASS,
  ACCORDION_EXPORT_CSS,
  ACCORDION_PLUS_FA_CLASS,
} from "~/components/accordion-styles";
import { wrapLayoutLayers } from "~/lib/layout-html-wrappers";

/**
 * 将 Puck JSON 数据转换为 HTML 字符串（包含内联 CSS）
 */
export function convertToHTML(data: Data): string {
  const components = data.content || [];
  const cssContent = generateCSS();
  
  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '  <meta charset="UTF-8">\n';
  html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html +=
    '  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" crossorigin="anonymous" />\n';
  html += `  <title>${data.root?.props?.title || 'Page'}</title>\n`;
  html += '  <style>\n';
  html += cssContent.split('\n').map(line => '    ' + line).join('\n');
  html += '\n  </style>\n';
  html += '</head>\n<body>\n';
  html += '  <div class="visbuild-page">\n';
  
  components.forEach((component) => {
    html += generateComponentHTML(component);
  });
  
  html += '  </div>\n';
  html += '</body>\n</html>';
  
  return html;
}

/** 导出供 Shopify body 等片段 HTML 生成复用 */
export function generateComponentHTMLForExport(
  component: unknown,
  indent: number = 2
): string {
  return generateComponentHTML(component, indent);
}

/**
 * 生成单个组件的 HTML
 */
function generateComponentHTML(component: any, indent: number = 2): string {
  const spaces = ' '.repeat(indent);
  
  if (!component || !component.type) {
    return '';
  }
  
  const props = component.props || {};
  const layout = props.layout || {};
  
  switch (component.type) {
    case 'Heading':
      return generateHeading(props, layout, spaces);
    case 'Text':
      return generateText(props, layout, spaces);
    case 'Button':
      return generateButton(props, layout, spaces);
    case 'Card':
      return generateCard(props, layout, spaces);
    case 'CustomHtml':
      return generateCustomHtml(props, layout, spaces);
    case 'RawHTML':
      return generateRawHTML(props, layout, spaces);
    case 'Image':
      return generateImage(props, layout, spaces);
    case 'Video':
      return generateVideo(props, layout, spaces);
    case 'Columns':
    case 'Grid':
      return generateColumns(props, spaces, indent);
    case 'Flex':
      return generateFlex(props, spaces, indent);
    case 'Hero':
      return generateHero(props, spaces);
    case 'Icon':
      return generateIcon(props, layout, spaces);
    case 'Divider':
      return generateDivider(props, layout, spaces);
    case 'Table':
      return generateTable(props, spaces, indent);
    case 'Container':
      return generateContainer(props, spaces, indent);
    case 'Tabs':
      return generateTabs(props, spaces, indent);
    case 'Accordion':
      return generateAccordion(props, spaces, indent);
    case 'Slider':
      return generateSlider(props, spaces, indent);
    default:
      return `${spaces}<!-- Unknown component: ${component.type} -->\n`;
  }
}

/**
 * 生成 Heading HTML
 */
function generateHeading(props: any, layout: any, spaces: string): string {
  const level = Math.min(6, Math.max(1, Number(props.level) || 1));
  const sizeMap: Record<string, number> = {
    xxxl: 56,
    xxl: 48,
    xl: 40,
    l: 32,
    m: 24,
    s: 20,
    xs: 16,
  };
  const levelSizeMap: Record<number, number> = {
    1: 32,
    2: 24,
    3: 18.7,
    4: 16,
    5: 13.2,
    6: 12,
  };
  const fontSizePx =
    typeof props.fontSize === 'number' && Number.isFinite(props.fontSize)
      ? props.fontSize
      : props.size && sizeMap[props.size] != null
        ? sizeMap[props.size]
        : levelSizeMap[level] ?? 32;

  const textAlign = props.align || 'center';
  const fontFamily = props.font?.trim() ? props.font.trim() : '';
  const color = props.textColor?.trim() ? props.textColor.trim() : '';

  const styleParts = [
    `font-size: ${fontSizePx}px`,
    `text-align: ${textAlign}`,
    'margin: 0',
    'font-weight: 600',
    fontFamily ? `font-family: ${fontFamily}` : '',
    color ? `color: ${color}` : '',
    props.lineHeight != null && Number.isFinite(Number(props.lineHeight))
      ? `line-height: ${props.lineHeight}`
      : '',
    props.letterSpacing != null && Number.isFinite(Number(props.letterSpacing))
      ? `letter-spacing: ${props.letterSpacing}px`
      : '',
  ].filter(Boolean);

  const textHtml = escapeHtml(props.text || 'Heading');
  const spanInner = `<span style="display: block; width: 100%;">${textHtml}</span>`;

  let body = spanInner;
  if (props.addLink && props.linkHref?.trim()) {
    const href = escapeHtml(props.linkHref.trim());
    const target = props.openInNewWindow ? ' target="_blank" rel="noopener noreferrer"' : '';
    body = `<a href="${href}" style="color: inherit; text-decoration: none;"${target}>${spanInner}</a>`;
  }

  const inner = `<h${level} style="${styleParts.join('; ')};">
${body}
</h${level}>
`;
  return wrapLayoutLayers(layout, inner, spaces);
}

/**
 * 生成 Text HTML（富文本 html 字段，原样嵌入已消毒片段）
 */
function generateText(props: any, layout: any, spaces: string): string {
  const raw =
    typeof props.html === "string"
      ? props.html
      : "<p>Text</p>";
  const inner = `${spaces}  <div class="visbuild-text">${sanitizeRichTextHtml(raw)}</div>\n`;
  return wrapLayoutLayers(layout, inner, spaces, props.maxWidth);
}

/** 导出前移除 script/事件，保留富文本标签 */
function sanitizeRichTextHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

/**
 * 生成 Button HTML
 */
function generateButton(props: any, layout: any, spaces: string): string {
  const href = props.href?.trim() || "#";
  const target = props.openInSameTab ? "" : ' target="_blank" rel="noopener noreferrer"';
  const inlineStyle = serializeButtonInlineStyle(flattenButtonProps(props));
  const align = props.align || "center";
  const justify =
    align === "left"
      ? "flex-start"
      : align === "right"
        ? "flex-end"
        : "center";

  const inner = `${spaces}  <div style="display: flex; justify-content: ${justify}; width: 100%;">
${spaces}    <a class="visbuild-button" href="${escapeHtml(href)}" style="${inlineStyle}"${target}>
${spaces}      ${escapeHtml(props.label || "Text")}
${spaces}    </a>
${spaces}  </div>
`;

  return wrapLayoutLayers(layout, inner, spaces);
}

/**
 * 生成 Card HTML
 */
function generateCard(props: any, layout: any, spaces: string): string {
  let inner = `<div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
`;

  if (props.imageUrl) {
    inner += `<img src="${props.imageUrl}" alt="${escapeHtml(props.title)}" style="width: 100%; height: 200px; object-fit: cover;" />
`;
  }

  inner += `<div style="padding: 20px;">
<h3 style="margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 600; color: #333;">${escapeHtml(props.title)}</h3>
<p style="margin: 0; font-size: 0.95rem; line-height: 1.6; color: #666;">${escapeHtml(props.description)}</p>
`;

  if (props.href) {
    inner += `<a href="${props.href}" style="display: inline-block; margin-top: 12px; color: #0070f3; text-decoration: none; font-weight: 500;">Learn more →</a>
`;
  }

  inner += `</div>
</div>
`;

  return wrapLayoutLayers(layout, inner, spaces);
}

/**
 * 生成 Custom HTML（按编辑内容原样输出，不做转义）
 */
function generateCustomHtml(props: any, layout: any, spaces: string): string {
  const rawHtml = props.html ?? "";
  const rawCss = (props.css ?? "").trim();

  let inner = `<div class="visbuild-custom-html-root">
`;
  if (rawCss) {
    inner += `<style>
`;
    inner += rawCss + "\n";
    inner += `</style>
`;
  }
  inner += rawHtml + (rawHtml.endsWith("\n") ? "" : "\n");
  inner += `</div>
`;

  return wrapLayoutLayers(layout, inner, spaces);
}

/** 从 Shopify 导入的 HTML 原样输出 */
function generateRawHTML(props: any, layout: any, spaces: string): string {
  const rawHtml = props.html ?? "";
  const inner = `${rawHtml}${rawHtml.endsWith("\n") ? "" : "\n"}`;
  return wrapLayoutLayers(layout, inner, spaces);
}

/**
 * 生成 Image HTML
 */
function generateImage(props: any, layout: any, spaces: string): string {
  const flat = flattenImageProps(props);
  const wrapperStyle = serializeImageWrapperStyle(flat);
  const imgStyle = serializeImageDimensionalStyle(flat.dimensions);
  const loadingAttr =
    flat.performance.loading === "auto" ? "" : ` loading="${flat.performance.loading}"`;
  const srcSet = flat.performance.responsiveImage
    ? buildResponsiveSrcSet(flat.src, flat.performance.imageQuality)
    : undefined;
  const srcSetAttr = srcSet ? ` srcset="${escapeHtml(srcSet)}" sizes="100vw"` : "";
  const href = flat.linkHref?.trim() || "#";
  const targetAttr = flat.openInNewWindow
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";

  const imgTag = `<img class="visbuild-image__img" src="${escapeHtml(flat.src)}" alt="${escapeHtml(flat.alt)}"${loadingAttr}${srcSetAttr} style="${imgStyle}" />`;

  let core = "";
  if (flat.imageClickable && flat.linkHref?.trim()) {
    core += `${spaces}    <a class="visbuild-image__link" href="${escapeHtml(href)}"${targetAttr}>\n`;
    core += `${spaces}      ${imgTag}\n`;
    core += `${spaces}    </a>\n`;
  } else {
    core += `${spaces}    ${imgTag}\n`;
  }

  const inner = `${spaces}  <div class="visbuild-image" style="${wrapperStyle}">\n${core}${spaces}  </div>\n`;

  return wrapLayoutLayers(layout, inner, spaces);
}

function parseYouTubeId(url: string): string | null {
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/i;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

function parseVimeoId(url: string): string | null {
  const vimeoRegex = /(?:vimeo\.com\/)(\d+)/i;
  const match = url.match(vimeoRegex);
  return match ? match[1] : null;
}

function buildVideoEmbedUrl(props: any): string {
  const videoUrl = props.videoUrl || '';
  const loop = !!props.loop;
  const autoplay = !!props.autoplay;
  const muteAudio = !!props.muteAudio;
  const relatedVideosFromOtherChannels = props.relatedVideosFromOtherChannels !== false;

  const youtubeId = parseYouTubeId(videoUrl);
  if (youtubeId) {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: muteAudio ? '1' : '0',
      loop: loop ? '1' : '0',
      rel: relatedVideosFromOtherChannels ? '1' : '0',
      playsinline: '1',
    });
    if (loop) params.set('playlist', youtubeId);
    return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
  }

  const vimeoId = parseVimeoId(videoUrl);
  if (vimeoId) {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      muted: muteAudio ? '1' : '0',
      loop: loop ? '1' : '0',
    });
    return `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`;
  }

  return '';
}

function generateVideo(props: any, layout: any, spaces: string): string {
  const aspectRatio = props.aspectRatio || '16:9';
  const ratioPadding = aspectRatio === '4:3' ? '75%' : '56.25%';
  const embedUrl = buildVideoEmbedUrl(props);
  const videoUrl = props.videoUrl || '';
  const directVideoRegex = /\.(mp4|webm|ogg)(\?.*)?$/i;
  const isDirectVideo = directVideoRegex.test(videoUrl);
  const loading = props.loading === 'eager' || props.loading === 'lazy' ? props.loading : '';

  if (!props.videoUrl || (!embedUrl && !isDirectVideo)) {
    const inner = `<div style="border: 1px dashed #d0d0d0; border-radius: 8px; padding: 16px; color: #666; font-size: 14px;">
Youtube or Vimeo link
</div>
`;
    return wrapLayoutLayers(layout, inner, spaces);
  }

  if (isDirectVideo) {
    const inner = `<div>
<div style="position: relative; width: 100%; padding-top: ${ratioPadding}; background-color: #000; border-radius: 8px; overflow: hidden;">
<video src="${videoUrl}" controls ${props.autoplay ? 'autoplay' : ''} ${props.loop ? 'loop' : ''} ${props.muteAudio ? 'muted' : ''} playsinline style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;"></video>
</div>
</div>
`;
    return wrapLayoutLayers(layout, inner, spaces);
  }

  const inner = `<div>
<div style="position: relative; width: 100%; padding-top: ${ratioPadding};">
<iframe src="${embedUrl}" title="Video player" ${loading ? `loading="${loading}"` : ''} allow="${props.autoplay ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' : 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'}" allowfullscreen style="position: absolute; inset: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"></iframe>
</div>
</div>
`;

  return wrapLayoutLayers(layout, inner, spaces);
}

/**
 * 生成 Columns HTML（兼容旧 type Grid）
 */
function generateColumns(props: any, spaces: string, indent: number): string {
  const numColumns = props.numColumns ?? 2;
  const gap = props.gap ?? 30;
  const equalColumnHeights = props.equalColumnHeights === true;
  const stackOnSmallScreens = props.stackOnSmallScreens !== false;
  const stackingBehavior = props.stackingBehavior === "rightFirst"
    ? "rightFirst"
    : "leftFirst";
  const items = props.items || [];

  const className = columnsGridClassName({
    equalColumnHeights,
    stackOnSmallScreens,
    stackingBehavior,
  });
  const style = columnsGridStyle(numColumns, gap);
  const styleAttr = Object.entries(style)
    .map(([key, value]) => {
      const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${cssKey}: ${value}`;
    })
    .join("; ");

  let html = `${spaces}<div class="${className}" style="${styleAttr}">\n`;

  items.forEach((item: any) => {
    html += generateComponentHTML(item, indent + 2);
  });

  html += `${spaces}</div>\n`;

  return html;
}

/**
 * 生成 Flex HTML
 */
function generateFlex(props: any, spaces: string, indent: number): string {
  const justifyContentMap: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
  };
  
  const justifyContent = justifyContentMap[props.justifyContent] || 'flex-start';
  const direction = props.direction || 'row';
  const gap = props.gap || 16;
  const wrap = props.wrap || 'wrap';
  const items = props.items || [];
  
  let html = `${spaces}<div style="display: flex; justify-content: ${justifyContent}; flex-direction: ${direction}; gap: ${gap}px; flex-wrap: ${wrap}; padding: 16px 0;">\n`;
  
  items.forEach((item: any) => {
    html += generateComponentHTML(item, indent + 2);
  });
  
  html += `${spaces}</div>\n`;
  
  return html;
}

/**
 * 生成 Hero HTML
 */
function generateHero(props: any, spaces: string): string {
  const align = props.align || 'center';
  const backgroundImage = props.backgroundImage 
    ? `url(${props.backgroundImage})`
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  
  const alignItems = align === 'center' ? 'center' : 'flex-start';
  
  return `${spaces}<div style="padding: 80px 20px; background-image: ${backgroundImage}; background-size: cover; background-position: center; text-align: ${align}; color: #ffffff; min-height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: ${alignItems};">
${spaces}  <h1 style="font-size: 3rem; font-weight: 700; margin: 0 0 20px 0; line-height: 1.2;">${escapeHtml(props.title)}</h1>
${spaces}  <p style="font-size: 1.25rem; margin: 0 0 32px 0; line-height: 1.6; opacity: 0.95;">${escapeHtml(props.subtitle)}</p>
${spaces}  <a href="${props.buttonHref || '#'}" style="display: inline-block; padding: 16px 32px; background-color: #ffffff; color: #667eea; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 1.125rem;">${escapeHtml(props.buttonText)}</a>
${spaces}</div>\n`;
}

/**
 * 生成 Divider HTML
 */
function generateIcon(props: any, layout: any, spaces: string): string {
  const fontSize = iconFontSizeFromHeight(props.height);
  const align = props.align || "center";
  const color = props.color || "#333333";
  const iconId = props.iconId || "shg-fa-address-book-o";
  const fa = toFaIconClasses(iconId);
  const aria = props.ariaLabel?.trim();
  const justify =
    align === "left"
      ? "flex-start"
      : align === "right"
        ? "flex-end"
        : "center";

  const iconTag = `<i class="${fa}" style="font-size: ${escapeHtml(fontSize)}; line-height: 1; color: ${escapeHtml(color)};" aria-hidden="true"></i>`;

  let core: string;
  if (props.addLink && props.linkHref?.trim()) {
    const href = escapeHtml(props.linkHref.trim());
    const target = props.openInNewWindow
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";
    const aLabel = aria ? ` aria-label="${escapeHtml(aria)}"` : "";
    core = `<a href="${href}"${target}${aLabel} style="display: inline-flex; text-decoration: none; color: inherit;">${iconTag}</a>`;
  } else if (aria) {
    core = `<span aria-label="${escapeHtml(aria)}">${iconTag}</span>`;
  } else {
    core = iconTag;
  }

  const inner = `<div style="display: flex; justify-content: ${justify}; width: 100%;">
${core}
</div>
`;

  return wrapLayoutLayers(layout, inner, spaces);
}

function generateDivider(props: any, layout: any, spaces: string): string {
  const thickness = props.thickness ?? 2;
  const color = props.color || '#e0e0e0';
  const style = props.style || 'solid';

  const inner = `<hr style="border: none; border-top: ${thickness}px ${style} ${escapeHtml(color)}; margin: 0;" />
`;

  return wrapLayoutLayers(layout, inner, spaces);
}

/**
 * 生成 Table HTML
 */
function generateTable(props: any, spaces: string, indent: number): string {
  const columns = props.columns || [];
  const numberOfRows = props.numberOfRows || 1;
  const columnSpacing = props.columnSpacing ?? 10;
  const rowSpacing = props.rowSpacing ?? 10;
  const borderWidth = props.borderWidth ?? 1;
  const borderColor = props.borderColor || '#D5D6D7';
  const tableBorderRadius = props.tableBorderRadius ?? 0;
  const headerBackgroundColor = props.headerBackgroundColor || '#FFFFFF';
  const headerFont = props.headerFont || '';
  const headerSize = props.headerSize ?? 14;
  const headerTextColor = props.headerTextColor || '#22194D';
  const headerLineHeight = props.headerLineHeight;
  const headerLetterSpacing = props.headerLetterSpacing ?? 0;
  const headerTextAlignment = props.headerTextAlignment || 'left';
  const rowBackgroundColor = props.rowBackgroundColor || '#ffffff';

  const thPadding = `${columnSpacing}px`;
  const tdPadding = `${rowSpacing}px`;
  const headerLineHeightCss =
    headerLineHeight != null && Number.isFinite(Number(headerLineHeight))
      ? ` line-height: ${headerLineHeight}em;`
      : '';
  const headerFontCss = headerFont.trim()
    ? ` font-family: ${escapeHtml(headerFont)};`
    : '';
  const headerLetterSpacingCss =
    headerLetterSpacing != null
      ? ` letter-spacing: ${headerLetterSpacing}px;`
      : '';

  const cellBorder =
    borderWidth > 0
      ? `${borderWidth}px solid ${escapeHtml(borderColor)}`
      : 'none';

  let html = `${spaces}<div style="overflow-x: auto;">\n`;
  html += `${spaces}  <div style="overflow: hidden; border-radius: ${tableBorderRadius}px;">\n`;
  html += `${spaces}    <table style="width: 100%; border-collapse: collapse;">\n`;

  html += `${spaces}      <thead>\n`;
  html += `${spaces}        <tr>\n`;
  columns.forEach((column: any) => {
    html += `${spaces}          <th style="padding: ${thPadding}; background-color: ${escapeHtml(headerBackgroundColor)}; font-size: ${headerSize}px; font-weight: bold; color: ${escapeHtml(headerTextColor)}; text-align: ${headerTextAlignment};${headerLineHeightCss}${headerFontCss}${headerLetterSpacingCss} border: ${cellBorder};">${escapeHtml(column.name || 'Column')}</th>\n`;
  });
  html += `${spaces}        </tr>\n`;
  html += `${spaces}      </thead>\n`;

  html += `${spaces}      <tbody>\n`;
  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
    html += `${spaces}        <tr>\n`;
    columns.forEach((column: any) => {
      const cellContent = column.content || [];
      html += `${spaces}          <td style="padding: ${tdPadding}; background-color: ${escapeHtml(rowBackgroundColor)}; border: ${cellBorder}; vertical-align: top;">\n`;

      if (cellContent.length > 0) {
        cellContent.forEach((item: any) => {
          html += generateComponentHTML(item, indent + 12);
        });
      } else {
        html += `${spaces}            <span>Empty Cell</span>\n`;
      }

      html += `${spaces}          </td>\n`;
    });
    html += `${spaces}        </tr>\n`;
  }
  html += `${spaces}      </tbody>\n`;

  html += `${spaces}    </table>\n`;
  html += `${spaces}  </div>\n`;
  html += `${spaces}</div>\n`;
  
  return html;
}

/**
 * 生成 Container HTML
 */
function generateContainer(props: any, spaces: string, indent: number): string {
  const entireContainerClickable = props.entireContainerClickable || false;
  const containerUrl = props.containerUrl || '';
  const openInNewWindow = props.openInNewWindow || false;
  const verticalAlign = props.verticalAlign || 'middle';
  const backgroundType = props.backgroundType || 'image';
  const backgroundImage = props.backgroundImage || '';
  const backgroundColor = props.backgroundColor || '#ffffff';
  const backgroundVideo = props.backgroundVideo || '';
  const videoMuted = props.videoMuted !== false;
  const backgroundSize = props.backgroundSize || 'cover';
  const backgroundWidth = props.backgroundWidth;
  const backgroundHeight = props.backgroundHeight;
  const backgroundRepeat = props.backgroundRepeat || 'no-repeat';
  const horizontalPosition = props.horizontalPosition || 'center';
  const horizontalPositionValue = props.horizontalPositionValue || 0;
  const verticalPosition = props.verticalPosition || 'center';
  const verticalPositionValue = props.verticalPositionValue || 0;
  const parallaxEffect = props.parallaxEffect || false;
  const content = props.content || [];
  const layout = props.layout || {};
  const sectionPadding = effectiveSectionSides(layout).padding;
  const layoutMinHeight = (layout.dimensions as { minHeight?: number } | undefined)
    ?.minHeight;
  
  const alignMap: Record<string, string> = {
    top: 'flex-start',
    middle: 'center',
    bottom: 'flex-end',
  };
  
  let backgroundStyle =
    'display: flex; flex-direction: column; justify-content: ' +
    alignMap[verticalAlign] +
    '; position: relative;' +
    ` padding-top: ${sectionPadding.top};` +
    ` padding-right: ${sectionPadding.right};` +
    ` padding-bottom: ${sectionPadding.bottom};` +
    ` padding-left: ${sectionPadding.left};`;

  if (layoutMinHeight != null && Number(layoutMinHeight) > 0) {
    backgroundStyle += ` min-height: ${layoutMinHeight}px;`;
  }
  
  if (backgroundType === 'image' && backgroundImage) {
    backgroundStyle += ` background-image: url('${backgroundImage}');`;
    
    backgroundStyle += ` background-size: ${resolveBackgroundSizeCss(
      backgroundSize,
      backgroundWidth,
      backgroundHeight
    )};`;
    
    // Background repeat
    backgroundStyle += ` background-repeat: ${backgroundRepeat};`;
    
    // Background position
    const hPos = horizontalPosition === 'custom' && horizontalPositionValue && horizontalPositionValue > 0 
      ? `${horizontalPositionValue}px` 
      : horizontalPosition;
    const vPos = verticalPosition === 'custom' && verticalPositionValue && verticalPositionValue > 0 
      ? `${verticalPositionValue}px` 
      : verticalPosition;
    backgroundStyle += ` background-position: ${hPos} ${vPos};`;
    
    // Parallax effect
    if (parallaxEffect) {
      backgroundStyle += ' background-attachment: fixed;';
    }
  } else if (backgroundType === 'color') {
    backgroundStyle += ` background-color: ${backgroundColor};`;
  } else if (backgroundType === 'video') {
    backgroundStyle += ' background-color: #000; overflow: hidden;';
  }
  
  // 判断是否包裹在链接中
  const isClickable = entireContainerClickable && containerUrl;
  const targetAttr = openInNewWindow ? ' target="_blank"' : '';
  
  let html = '';
  
  if (isClickable) {
    backgroundStyle += ' cursor: pointer;';
    html += `${spaces}<a href="${containerUrl}"${targetAttr} style="display: block; text-decoration: none; color: inherit;">\n`;
  }
  
  html += `${spaces}${isClickable ? '  ' : ''}<div style="${backgroundStyle}">\n`;
  
  // 视频背景
  if (backgroundType === 'video' && backgroundVideo) {
    html += `${spaces}${isClickable ? '    ' : '  '}<video autoplay loop muted="${videoMuted}" playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;">\n`;
    html += `${spaces}${isClickable ? '      ' : '    '}<source src="${backgroundVideo}" type="video/mp4" />\n`;
    html += `${spaces}${isClickable ? '    ' : '  '}</video>\n`;
  }
  
  // 内容层
  html += `${spaces}${isClickable ? '    ' : '  '}<div style="position: relative; z-index: 1;">\n`;
  
  if (content.length > 0) {
    content.forEach((item: any) => {
      html += generateComponentHTML(item, indent + (isClickable ? 6 : 4));
    });
  }
  
  html += `${spaces}${isClickable ? '    ' : '  '}</div>\n`;
  html += `${spaces}${isClickable ? '  ' : ''}</div>\n`;
  
  if (isClickable) {
    html += `${spaces}</a>\n`;
  }
  
  return html;
}

/**
 * 生成 Tabs HTML
 */
function generateTabs(props: any, spaces: string, indent: number): string {
  const tabs = props.tabs || [];
  const theme = props.theme || "stretch";
  const borderColor = props.borderColor || "#dddddd";
  const borderThickness = props.borderThickness ?? 1;
  const font = props.font || "";
  const fontSize = props.fontSize ?? 16;
  const defaultColor = {
    backgroundColor:
      props.defaultColor?.backgroundColor ??
      DEFAULT_TAB_COLOR_GROUP.backgroundColor,
    textColor:
      props.defaultColor?.textColor ?? DEFAULT_TAB_COLOR_GROUP.textColor,
  };
  const activeColors = {
    backgroundColor:
      props.activeColors?.backgroundColor ??
      DEFAULT_ACTIVE_TAB_COLOR_GROUP.backgroundColor,
    textColor:
      props.activeColors?.textColor ??
      DEFAULT_ACTIVE_TAB_COLOR_GROUP.textColor,
  };
  const initialActiveIndex =
    clampActiveTabIndex(props.activeTabIndex, tabs.length) - 1;

  if (tabs.length === 0) {
    return `${spaces}<!-- No tabs defined -->\n`;
  }

  const tabsId = `tabs-${Math.random().toString(36).substr(2, 9)}`;
  const tabBarStyle =
    "display: flex; gap: 4px; align-items: flex-end; position: relative; width: 100%;";
  const trailColor = borderColor;

  let html = `${spaces}<div id="${tabsId}" style="width: 100%;">\n`;
  html += `${spaces}  <div class="visbuild-tabs-bar" style="${tabBarStyle}">\n`;

  tabs.forEach((tab: any, index: number) => {
    const isActive = index === initialActiveIndex;
    const tabStyle = serializeTabButtonStyle({
      theme,
      isActive,
      borderColor,
      borderThickness,
      font,
      fontSize,
      defaultColor,
      activeColors,
    });
    html += `${spaces}    <div data-tab-index="${index}" style="${tabStyle}" onclick="switchTab('${tabsId}', ${index})">\n`;
    html += `${spaces}      ${escapeHtml(tab.title || `Tab ${index + 1}`)}\n`;
    html += `${spaces}    </div>\n`;
  });

  html += `${spaces}    <div class="visbuild-tabs-trail-left" aria-hidden="true" style="position: absolute; bottom: 0; left: 0; width: 0; height: ${borderThickness}px; background-color: ${escapeHtml(trailColor)}; pointer-events: none;"></div>\n`;
  html += `${spaces}    <div class="visbuild-tabs-trail-right" aria-hidden="true" style="position: absolute; bottom: 0; left: 0; width: 0; height: ${borderThickness}px; background-color: ${escapeHtml(trailColor)}; pointer-events: none;"></div>\n`;
  html += `${spaces}  </div>\n`;

  const contentBorderTop =
    theme === "sloped"
      ? `${borderThickness}px solid ${escapeHtml(borderColor)}`
      : "none";
  html += `${spaces}  <div style="border-top: ${contentBorderTop}; padding: ${TAB_CONTENT_PADDING}; background-color: ${escapeHtml(activeColors.backgroundColor)}; border-radius: 0 0 8px 8px;">\n`;

  tabs.forEach((tab: any, index: number) => {
    const isInitial = index === initialActiveIndex;
    const display = isInitial ? "block" : "none";
    const panelClass = isInitial
      ? "visbuild-tabs-content-panel visbuild-tabs-content-panel--active"
      : "visbuild-tabs-content-panel";
    html += `${spaces}    <div data-tab-content="${index}" class="${panelClass}" style="display: ${display};">\n`;

    if (tab.content && tab.content.length > 0) {
      tab.content.forEach((item: any) => {
        html += generateComponentHTML(item, indent + 6);
      });
    } else {
      html += `${spaces}      <!-- Empty tab content -->\n`;
    }

    html += `${spaces}    </div>\n`;
  });

  html += `${spaces}  </div>\n`;
  html += `${spaces}</div>\n`;

  const fontFamily = font.trim() ? escapeHtml(font) : "inherit";
  html += `${spaces}<script>
`;
  html += `${spaces}(function() {
`;
  html += `${spaces}  var theme = ${JSON.stringify(theme)};
`;
  html += `${spaces}  var borderColor = ${JSON.stringify(borderColor)};
`;
  html += `${spaces}  var borderThickness = ${borderThickness};
`;
  html += `${spaces}  var defaultBg = ${JSON.stringify(defaultColor.backgroundColor)};
`;
  html += `${spaces}  var defaultText = ${JSON.stringify(defaultColor.textColor)};
`;
  html += `${spaces}  var activeBg = ${JSON.stringify(activeColors.backgroundColor)};
`;
  html += `${spaces}  var activeText = ${JSON.stringify(activeColors.textColor)};
`;
  html += `${spaces}  var tabPadding = ${JSON.stringify(TAB_BUTTON_PADDING)};
`;
  html += `${spaces}  var tabRadius = ${JSON.stringify(TAB_BUTTON_BORDER_RADIUS)};
`;
  html += `${spaces}  function applyTabStyle(tab, isActive) {
`;
  html += `${spaces}    tab.style.padding = tabPadding;
`;
  html += `${spaces}    tab.style.borderRadius = tabRadius;
`;
  html += `${spaces}    tab.style.fontFamily = ${JSON.stringify(fontFamily)};
`;
  html += `${spaces}    tab.style.fontSize = '${fontSize}px';
`;
  html += `${spaces}    tab.style.fontWeight = '400';
`;
  html += `${spaces}    tab.style.cursor = 'pointer';
`;
  html += `${spaces}    tab.style.transition = 'all 0.2s ease';
`;
  html += `${spaces}    tab.style.zIndex = isActive ? '1' : '0';
`;
  html += `${spaces}    if (theme === 'sloped') {
`;
  html += `${spaces}      tab.style.borderBottom = borderThickness + 'px solid ' + (isActive ? activeText : borderColor);
`;
  html += `${spaces}      tab.style.borderTop = 'none';
`;
  html += `${spaces}      tab.style.borderLeft = 'none';
`;
  html += `${spaces}      tab.style.borderRight = 'none';
`;
  html += `${spaces}      tab.style.background = 'transparent';
`;
  html += `${spaces}      tab.style.color = isActive ? activeText : defaultText;
`;
  html += `${spaces}      tab.style.marginBottom = '0';
`;
  html += `${spaces}    } else {
`;
  html += `${spaces}      var sideColor = borderColor;
`;
  html += `${spaces}      var side = borderThickness > 0 ? (borderThickness + 'px solid ' + sideColor) : 'none';
`;
  html += `${spaces}      tab.style.borderTop = side;
`;
  html += `${spaces}      tab.style.borderLeft = side;
`;
  html += `${spaces}      tab.style.borderRight = side;
`;
  html += `${spaces}      tab.style.borderBottom = 'none';
`;
  html += `${spaces}      tab.style.background = isActive ? activeBg : defaultBg;
`;
  html += `${spaces}      tab.style.color = isActive ? activeText : defaultText;
`;
  html += `${spaces}      tab.style.marginBottom = '0';
`;
  html += `${spaces}      tab.style.boxSizing = 'border-box';
`;
  html += `${spaces}      if (theme === 'stretch') {
`;
  html += `${spaces}        tab.style.flex = '1';
`;
  html += `${spaces}        tab.style.textAlign = 'center';
`;
  html += `${spaces}      }
`;
  html += `${spaces}    }
`;
  html += `${spaces}  }
`;
  html += `${spaces}  function updateTabsTrail(container, activeIndex) {
`;
  html += `${spaces}    var bar = container.querySelector('.visbuild-tabs-bar');
`;
  html += `${spaces}    var trailLeft = container.querySelector('.visbuild-tabs-trail-left');
`;
  html += `${spaces}    var trailRight = container.querySelector('.visbuild-tabs-trail-right');
`;
  html += `${spaces}    if (!bar || !trailLeft || !trailRight || theme === 'sloped' || borderThickness <= 0) return;
`;
  html += `${spaces}    var tabs = bar.querySelectorAll('[data-tab-index]');
`;
  html += `${spaces}    var activeTab = tabs[activeIndex];
`;
  html += `${spaces}    if (!activeTab) return;
`;
  html += `${spaces}    var barRect = bar.getBoundingClientRect();
`;
  html += `${spaces}    var activeRect = activeTab.getBoundingClientRect();
`;
  html += `${spaces}    var activeLeft = Math.max(0, activeRect.left - barRect.left);
`;
  html += `${spaces}    var activeRight = Math.max(0, activeRect.right - barRect.left);
`;
  html += `${spaces}    trailLeft.style.width = activeIndex > 0 ? activeLeft + 'px' : '0';
`;
  html += `${spaces}    trailLeft.style.height = borderThickness + 'px';
`;
  html += `${spaces}    trailLeft.style.backgroundColor = borderColor;
`;
  html += `${spaces}    trailRight.style.left = activeRight + 'px';
`;
  html += `${spaces}    trailRight.style.width = activeIndex < tabs.length - 1 ? Math.max(0, barRect.width - activeRight) + 'px' : '0';
`;
  html += `${spaces}    trailRight.style.height = borderThickness + 'px';
`;
  html += `${spaces}    trailRight.style.backgroundColor = borderColor;
`;
  html += `${spaces}  }
`;
  html += `${spaces}  function switchTab(tabsId, tabIndex) {
`;
  html += `${spaces}    var container = document.getElementById(tabsId);
`;
  html += `${spaces}    if (!container) return;
`;
  html += `${spaces}    container.querySelectorAll('[data-tab-index]').forEach(function(tab, idx) {
`;
  html += `${spaces}      applyTabStyle(tab, idx === tabIndex);
`;
  html += `${spaces}    });
`;
  html += `${spaces}    container.querySelectorAll('[data-tab-content]').forEach(function(content, idx) {
`;
  html += `${spaces}      if (idx === tabIndex) {
`;
  html += `${spaces}        content.style.display = 'block';
`;
  html += `${spaces}        content.classList.remove('visbuild-tabs-content-panel--active');
`;
  html += `${spaces}        void content.offsetWidth;
`;
  html += `${spaces}        content.classList.add('visbuild-tabs-content-panel--active');
`;
  html += `${spaces}      } else {
`;
  html += `${spaces}        content.style.display = 'none';
`;
  html += `${spaces}        content.classList.remove('visbuild-tabs-content-panel--active');
`;
  html += `${spaces}      }
`;
  html += `${spaces}    });
`;
  html += `${spaces}    updateTabsTrail(container, tabIndex);
`;
  html += `${spaces}  }
`;
  html += `${spaces}  var initialContainer = document.getElementById(${JSON.stringify(tabsId)});
`;
  html += `${spaces}  if (initialContainer) {
`;
  html += `${spaces}    updateTabsTrail(initialContainer, ${initialActiveIndex});
`;
  html += `${spaces}  }
`;
  html += `${spaces}  window.switchTab = switchTab;
`;
  html += `${spaces}})();
`;
  html += `${spaces}</script>\n`;

  return html;
}

/**
 * 生成 Accordion HTML
 */
function generateAccordion(props: any, spaces: string, indent: number): string {
  const items = props.items || [];
  const onlyOneOpen = props.onlyOneOpen !== false; // 默认 true
  const openIcon = props.openIcon || "none";

  const paneHeaderText = props.paneHeaderText || {};
  const accordionColors = props.colors || {};
  const headerFont = paneHeaderText.headerFont || "";
  const headerSize = paneHeaderText.headerSize ?? 16;
  const headerTextAlignment = paneHeaderText.headerTextAlignment || "left";
  const headingPadding = paneHeaderText.headingPadding ?? 10;
  const headerBackgroundColor =
    accordionColors.headerBackgroundColor || "#f5f5f5";
  const headerTextColor = accordionColors.headerTextColor || "#8FCEE7";
  const innerBackgroundColor =
    accordionColors.innerBackgroundColor || "#ffffff";
  const borderColor = accordionColors.borderColor || "#dddddd";

  if (!items || items.length === 0) {
    return `${spaces}<!-- No accordion panes defined -->\n`;
  }

  // 初始化展开状态：如果只允许一个展开，则保留第一个 open=true 的面板；没有 open=true 则默认第一个展开
  let openMap = items.map((it: any) => Boolean(it?.open));
  if (onlyOneOpen) {
    const firstOpenIndex = openMap.findIndex(Boolean);
    const initIndex = firstOpenIndex >= 0 ? firstOpenIndex : 0;
    openMap = openMap.map((_: any, idx: number) => idx === initIndex);
  }

  const accordionId = `accordion-${Math.random().toString(36).substr(2, 9)}`;

  let html = `${spaces}<div id="${accordionId}" style="width: 100%;">\n`;
  html += `${spaces}  <div style="border: 1px solid ${borderColor}; border-radius: 6px; overflow: hidden; background: transparent;">\n`;

  items.forEach((item: any, index: number) => {
    const title = item?.title?.trim()
      ? item.title
      : `Accordion ${index + 1}`;
    const isOpen = Boolean(openMap[index]);

    const headerStyle =
      `display: flex; align-items: center; justify-content: space-between; gap: 8px; ` +
      `padding: ${headingPadding}px; background-color: ${headerBackgroundColor}; color: ${headerTextColor}; ` +
      `font-family: ${headerFont || "inherit"}; font-size: ${headerSize}px; font-weight: 600; ` +
      `text-align: ${headerTextAlignment}; cursor: pointer; user-select: none; ` +
      `border-bottom: ${index === items.length - 1 ? "none" : `1px solid ${borderColor}`};`;

    html += `${spaces}    <div data-acc-header="${index}" style="${headerStyle}">\n`;
    html += `${spaces}      <div style="flex: 1; text-align: ${headerTextAlignment};">${escapeHtml(title)}</div>\n`;

    if (openIcon !== "none") {
      const iconOpenClass = isOpen ? " visbuild-accordion-icon--open" : "";
      if (openIcon === "chevron") {
        html += `${spaces}      <span data-acc-icon="${index}" class="visbuild-accordion-icon visbuild-accordion-icon--caret${iconOpenClass}" aria-hidden="true"><i class="${ACCORDION_CARET_FA_CLASS}"></i></span>\n`;
      } else {
        html += `${spaces}      <span data-acc-icon="${index}" class="visbuild-accordion-icon visbuild-accordion-icon--plus${iconOpenClass}" aria-hidden="true"><i class="${ACCORDION_PLUS_FA_CLASS}"></i></span>\n`;
      }
    }

    html += `${spaces}    </div>\n`;

    const contentOpenClass = isOpen
      ? " visbuild-accordion-content-panel--open"
      : "";
    const contentPadding = isOpen ? `0 ${headingPadding}px` : "0";
    html += `${spaces}    <div data-acc-content="${index}" class="visbuild-accordion-content-panel${contentOpenClass}" style="background-color: ${innerBackgroundColor}; padding: ${contentPadding}; border-bottom: ${index === items.length - 1 ? "none" : `1px solid ${borderColor}`};">\n`;
    html += `${spaces}      <div class="visbuild-accordion-content-inner">\n`;
    const content = item?.content || [];
    if (content.length > 0) {
      content.forEach((child: any) => {
        html += generateComponentHTML(child, indent + 8);
      });
    } else {
      html += `${spaces}        <!-- Empty accordion content -->\n`;
    }
    html += `${spaces}      </div>\n`;
    html += `${spaces}    </div>\n`;
  });

  html += `${spaces}  </div>\n`;
  html += `${spaces}</div>\n`;

  // 交互脚本（仅用于预览/导出页面的基本展开收起）
  html += `${spaces}<script>\n`;
  html += `${spaces}(function() {\n`;
  html += `${spaces}  var root = document.getElementById('${accordionId}');\n`;
  html += `${spaces}  if (!root) return;\n`;
  html += `${spaces}  var onlyOneOpen = ${onlyOneOpen ? "true" : "false"};\n`;
  html += `${spaces}  var openIcon = '${openIcon}';\n`;
  html += `${spaces}  var openMap = ${JSON.stringify(openMap)};\n`;

  html += `${spaces}  function replayContentFade(inner) {\n`;
  html += `${spaces}    if (!inner) return;\n`;
  html += `${spaces}    inner.style.animation = 'none';\n`;
  html += `${spaces}    void inner.offsetHeight;\n`;
  html += `${spaces}    inner.style.animation = '';\n`;
  html += `${spaces}  }\n`;

  html += `${spaces}  function apply() {\n`;
  html += `${spaces}    var contents = root.querySelectorAll('[data-acc-content]');\n`;
  html += `${spaces}    contents.forEach(function(el) {\n`;
  html += `${spaces}      var idx = Number(el.getAttribute('data-acc-content'));\n`;
  html += `${spaces}      var open = Boolean(openMap[idx]);\n`;
  html += `${spaces}      el.classList.toggle('visbuild-accordion-content-panel--open', open);\n`;
  html += `${spaces}      el.style.padding = open ? '0 ${headingPadding}px' : '0';\n`;
  html += `${spaces}      if (open) {\n`;
  html += `${spaces}        replayContentFade(el.querySelector('.visbuild-accordion-content-inner'));\n`;
  html += `${spaces}      }\n`;
  html += `${spaces}    });\n`;

  if (openIcon !== "none") {
    html += `${spaces}    var icons = root.querySelectorAll('[data-acc-icon]');\n`;
    html += `${spaces}    icons.forEach(function(icon) {\n`;
    html += `${spaces}      var idx = Number(icon.getAttribute('data-acc-icon'));\n`;
    html += `${spaces}      icon.classList.toggle('visbuild-accordion-icon--open', Boolean(openMap[idx]));\n`;
    html += `${spaces}    });\n`;
  }

  html += `${spaces}  }\n`;

  html += `${spaces}  var headers = root.querySelectorAll('[data-acc-header]');\n`;
  html += `${spaces}  headers.forEach(function(header) {\n`;
  html += `${spaces}    header.addEventListener('click', function() {\n`;
  html += `${spaces}      var idx = Number(header.getAttribute('data-acc-header'));\n`;
  html += `${spaces}      if (onlyOneOpen) {\n`;
  html += `${spaces}        if (openMap[idx]) {\n`;
  html += `${spaces}          openMap = openMap.map(function() { return false; });\n`;
  html += `${spaces}        } else {\n`;
  html += `${spaces}          openMap = openMap.map(function(_, i) { return i === idx; });\n`;
  html += `${spaces}        }\n`;
  html += `${spaces}      } else {\n`;
  html += `${spaces}        openMap[idx] = !openMap[idx];\n`;
  html += `${spaces}      }\n`;
  html += `${spaces}      apply();\n`;
  html += `${spaces}    });\n`;
  html += `${spaces}  });\n`;
  html += `${spaces}  apply();\n`;
  html += `${spaces}})();\n`;
  html += `${spaces}</script>\n`;

  return html;
}

function generateSlider(props: any, spaces: string, indent: number): string {
  const items = props.items || [];
  const screenCount = Math.max(1, Math.min(20, Number(props.numberOfSlides) || 1));
  const slidesPerPage = Math.max(1, Math.min(12, Math.max(1, Number(props.slidesPerPage) || 1)));
  const pageCount = screenCount;
  const showDots = props.showDots !== false;
  const dotsLocation = props.dotsLocation || 'center';
  const selectedDotColor = props.selectedDotColor || '#777777';
  const unselectedDotColor = props.unselectedDotColor || '#999999';
  const mode = props.mode || 'slide';
  const rewind = props.rewind !== false;
  const autoSlide = props.autoSlide !== false;
  const showEachSlideSeconds = Math.max(1, props.showEachSlideSeconds || 5);
  const pauseAutoplayOnHover = props.pauseAutoplayOnHover === true;
  const showArrows = props.showArrows !== false;
  const arrowColor = props.arrowColor || '#777777';
  const arrowHeight = props.arrowHeight || 35;
  const arrowBackground = props.arrowBackground === true;
  const controlsOverContent = props.controlsOverContent === true;
  const dotsSize = props.dotsSize || 14;
  const selectedDotWidth = Math.min(80, props.selectedDotWidth || 40);
  const spaceBetweenDots = props.spaceBetweenDots || 8;

  if (items.length === 0) {
    return `${spaces}<!-- No slides defined -->\n`;
  }

  const pages: any[][] = [];
  for (let p = 0; p < screenCount; p++) {
    const row: any[] = [];
    for (let c = 0; c < slidesPerPage; c++) {
      row.push(items[p * slidesPerPage + c]);
    }
    pages.push(row);
  }
  const dotsJustify = dotsLocation === 'left' ? 'flex-start' : dotsLocation === 'right' ? 'flex-end' : 'center';
  const sliderId = `slider-${Math.random().toString(36).slice(2, 10)}`;

  let html = `${spaces}<div id="${sliderId}" style="width: 100%; position: relative;">\n`;
  if (showArrows) {
    html += `${spaces}  <button type="button" data-slider-prev style="${controlsOverContent ? 'position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;' : ''} left: 8px; border: none; cursor: pointer; width: ${arrowHeight + 8}px; height: ${arrowHeight + 8}px; border-radius: 999px; background: ${arrowBackground ? 'rgba(0,0,0,0.35)' : 'transparent'}; color: ${arrowColor}; font-size: ${arrowHeight}px; line-height: 1;">&lt;</button>\n`;
  }

  html += `${spaces}  <div style="overflow: hidden; border-radius: 8px;">\n`;
  html += `${spaces}    <div data-slider-track style="display: flex; width: ${pages.length * 100}%; transform: translateX(0%); transition: transform 450ms ease;">\n`;
  pages.forEach((pageItems: any[], pageIndex: number) => {
    html += `${spaces}      <div style="width: ${100 / pages.length}%; display: grid; grid-template-columns: repeat(${slidesPerPage}, minmax(0, 1fr)); gap: 12px;">\n`;
    pageItems.forEach((item: any, itemIndex: number) => {
      const content = item?.slot ?? [];
      html += `${spaces}        <div data-slider-item="${pageIndex}-${itemIndex}">\n`;
      content.forEach((child: any) => {
        html += generateComponentHTML(child, indent + 10);
      });
      html += `${spaces}        </div>\n`;
    });
    html += `${spaces}      </div>\n`;
  });
  html += `${spaces}    </div>\n`;
  html += `${spaces}  </div>\n`;

  if (showArrows) {
    html += `${spaces}  <button type="button" data-slider-next style="${controlsOverContent ? 'position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;' : ''} right: 8px; border: none; cursor: pointer; width: ${arrowHeight + 8}px; height: ${arrowHeight + 8}px; border-radius: 999px; background: ${arrowBackground ? 'rgba(0,0,0,0.35)' : 'transparent'}; color: ${arrowColor}; font-size: ${arrowHeight}px; line-height: 1;">&gt;</button>\n`;
  }

  if (showDots) {
    html += `${spaces}  <div data-slider-dots style="display: flex; justify-content: ${dotsJustify}; align-items: center; gap: ${spaceBetweenDots}px; margin-top: 12px;">\n`;
    for (let i = 0; i < pageCount; i++) {
      const active = i === 0;
      html += `${spaces}    <button type="button" data-slider-dot="${i}" style="border: none; cursor: pointer; border-radius: 999px; height: ${dotsSize}px; width: ${active ? selectedDotWidth : dotsSize}px; background: ${active ? selectedDotColor : unselectedDotColor}; transition: all 220ms ease;"></button>\n`;
    }
    html += `${spaces}  </div>\n`;
  }

  html += `${spaces}  <script>\n`;
  html += `${spaces}  (function() {\n`;
  html += `${spaces}    var root = document.getElementById('${sliderId}');\n`;
  html += `${spaces}    if (!root) return;\n`;
  html += `${spaces}    var track = root.querySelector('[data-slider-track]');\n`;
  html += `${spaces}    if (!track) return;\n`;
  html += `${spaces}    var pageCount = ${pageCount};\n`;
  html += `${spaces}    var currentPage = 0;\n`;
  html += `${spaces}    var mode = '${mode}';\n`;
  html += `${spaces}    var rewind = ${rewind ? 'true' : 'false'};\n`;
  html += `${spaces}    var autoSlide = ${autoSlide ? 'true' : 'false'};\n`;
  html += `${spaces}    var pauseAutoplayOnHover = ${pauseAutoplayOnHover ? 'true' : 'false'};\n`;
  html += `${spaces}    var intervalMs = ${showEachSlideSeconds} * 1000;\n`;
  html += `${spaces}    var timer = null;\n`;
  html += `${spaces}    var dots = root.querySelectorAll('[data-slider-dot]');\n`;
  html += `${spaces}\n`;
  html += `${spaces}    function render() {\n`;
  html += `${spaces}      track.style.transform = 'translateX(-' + ((currentPage * 100) / pageCount) + '%)';\n`;
  html += `${spaces}      if (dots && dots.length) {\n`;
  html += `${spaces}        dots.forEach(function(dot, idx) {\n`;
  html += `${spaces}          var active = idx === currentPage;\n`;
  html += `${spaces}          dot.style.width = active ? '${selectedDotWidth}px' : '${dotsSize}px';\n`;
  html += `${spaces}          dot.style.background = active ? '${selectedDotColor}' : '${unselectedDotColor}';\n`;
  html += `${spaces}        });\n`;
  html += `${spaces}      }\n`;
  html += `${spaces}    }\n`;
  html += `${spaces}\n`;
  html += `${spaces}    function prev() {\n`;
  html += `${spaces}      if (currentPage > 0) currentPage -= 1;\n`;
  html += `${spaces}      else if (mode === 'loop' || rewind) currentPage = pageCount - 1;\n`;
  html += `${spaces}      render();\n`;
  html += `${spaces}    }\n`;
  html += `${spaces}\n`;
  html += `${spaces}    function next() {\n`;
  html += `${spaces}      if (currentPage < pageCount - 1) currentPage += 1;\n`;
  html += `${spaces}      else if (mode === 'loop' || rewind) currentPage = 0;\n`;
  html += `${spaces}      render();\n`;
  html += `${spaces}    }\n`;
  html += `${spaces}\n`;
  html += `${spaces}    var prevBtn = root.querySelector('[data-slider-prev]');\n`;
  html += `${spaces}    var nextBtn = root.querySelector('[data-slider-next]');\n`;
  html += `${spaces}    if (prevBtn) prevBtn.addEventListener('click', prev);\n`;
  html += `${spaces}    if (nextBtn) nextBtn.addEventListener('click', next);\n`;
  html += `${spaces}\n`;
  html += `${spaces}    if (dots && dots.length) {\n`;
  html += `${spaces}      dots.forEach(function(dot, idx) {\n`;
  html += `${spaces}        dot.addEventListener('click', function() {\n`;
  html += `${spaces}          currentPage = idx;\n`;
  html += `${spaces}          render();\n`;
  html += `${spaces}        });\n`;
  html += `${spaces}      });\n`;
  html += `${spaces}    }\n`;
  html += `${spaces}\n`;
  html += `${spaces}    function startAuto() {\n`;
  html += `${spaces}      if (!autoSlide || pageCount <= 1) return;\n`;
  html += `${spaces}      stopAuto();\n`;
  html += `${spaces}      timer = setInterval(next, intervalMs);\n`;
  html += `${spaces}    }\n`;
  html += `${spaces}\n`;
  html += `${spaces}    function stopAuto() {\n`;
  html += `${spaces}      if (!timer) return;\n`;
  html += `${spaces}      clearInterval(timer);\n`;
  html += `${spaces}      timer = null;\n`;
  html += `${spaces}    }\n`;
  html += `${spaces}\n`;
  html += `${spaces}    if (pauseAutoplayOnHover) {\n`;
  html += `${spaces}      root.addEventListener('mouseenter', stopAuto);\n`;
  html += `${spaces}      root.addEventListener('mouseleave', startAuto);\n`;
  html += `${spaces}    }\n`;
  html += `${spaces}\n`;
  html += `${spaces}    render();\n`;
  html += `${spaces}    startAuto();\n`;
  html += `${spaces}  })();\n`;
  html += `${spaces}  </script>\n`;

  html += `${spaces}</div>\n`;
  return html;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 生成 CSS 文件内容
 */
export function generateCSS(): string {
  return `/* Visbuild Page Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

.visbuild-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
}

.visbuild-text { width: 100%; line-height: 1.5; word-break: break-word; }
.visbuild-text p { margin: 0 0 0.75em; }
.visbuild-text p:last-child { margin-bottom: 0; }
.visbuild-text ul.visbuild-list-dash { list-style-type: "– "; padding-left: 1.25em; }
.visbuild-text img { max-width: 100%; height: auto; }
.visbuild-text a { color: #2563eb; text-decoration: underline; }
.visbuild-text a.visbuild-link-no-underline { text-decoration: none; }

${BUTTON_EXPORT_CSS}

${IMAGE_EXPORT_CSS}

${COLUMNS_EXPORT_CSS}

${TABS_EXPORT_CSS}

${ACCORDION_EXPORT_CSS}

/* Responsive adjustments */
@media (max-width: 768px) {
  .visbuild-page {
    padding: 0 12px;
  }
}
`;
}
