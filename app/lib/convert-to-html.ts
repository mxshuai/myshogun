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
    case 'Grid':
      return generateGrid(props, spaces, indent);
    case 'Flex':
      return generateFlex(props, spaces, indent);
    case 'Hero':
      return generateHero(props, spaces);
    case 'Icon':
      return generateIcon(props, layout, spaces);
    case 'Divider':
      return generateDivider(props, layout, spaces);
    case 'Spacer':
      return generateSpacer(props, spaces);
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
 * 生成 Grid HTML
 */
function generateGrid(props: any, spaces: string, indent: number): string {
  const numColumns = props.numColumns || 3;
  const gap = props.gap || 24;
  const items = props.items || [];
  
  let html = `${spaces}<div style="display: grid; grid-template-columns: repeat(${numColumns}, 1fr); gap: ${gap}px; padding: 16px 0;">\n`;
  
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
 * 生成 Spacer HTML
 */
function generateSpacer(props: any, spaces: string): string {
  const height = props.height || 32;
  
  return `${spaces}<div style="height: ${height}px;"></div>\n`;
}

/**
 * 生成 Table HTML
 */
function generateTable(props: any, spaces: string, indent: number): string {
  const columns = props.columns || [];
  const numberOfRows = props.numberOfRows || 1;
  const columnSpacing = props.columnSpacing || 10;
  const rowSpacing = props.rowSpacing || 10;
  const borderWidth = props.borderWidth || 1;
  const borderColor = props.borderColor || '#e0e0e0';
  const tableBorderRadius = props.tableBorderRadius || 4;
  const headerBackgroundColor = props.headerBackgroundColor || '#f5f5f5';
  const headerSize = props.headerSize || 14;
  const headerTextColor = props.headerTextColor || '#000000';
  const headerTextAlignment = props.headerTextAlignment || 'left';
  const rowBackgroundColor = props.rowBackgroundColor || '#ffffff';
  
  let html = `${spaces}<div style="overflow-x: auto;">\n`;
  html += `${spaces}  <table style="width: 100%; border-collapse: separate; border-spacing: ${columnSpacing}px ${rowSpacing}px; border-radius: ${tableBorderRadius}px; overflow: hidden; border: ${borderWidth}px solid ${borderColor};">\n`;
  
  // Header
  html += `${spaces}    <thead>\n`;
  html += `${spaces}      <tr>\n`;
  columns.forEach((column: any) => {
    html += `${spaces}        <th style="padding: 12px 8px; background-color: ${headerBackgroundColor}; font-size: ${headerSize}px; font-weight: bold; color: ${headerTextColor}; text-align: ${headerTextAlignment}; border-bottom: ${borderWidth}px solid ${borderColor};">${escapeHtml(column.name || 'Column')}</th>\n`;
  });
  html += `${spaces}      </tr>\n`;
  html += `${spaces}    </thead>\n`;
  
  // Body
  html += `${spaces}    <tbody>\n`;
  for (let rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
    html += `${spaces}      <tr>\n`;
    columns.forEach((column: any, colIndex: number) => {
      const cellContent = column.content || [];
      html += `${spaces}        <td style="padding: 12px 8px; background-color: ${rowBackgroundColor}; border-bottom: ${borderWidth}px solid ${borderColor}; vertical-align: top;">\n`;
      
      if (cellContent.length > 0) {
        cellContent.forEach((item: any) => {
          html += generateComponentHTML(item, indent + 10);
        });
      } else {
        html += `${spaces}          <span>Empty Cell</span>\n`;
      }
      
      html += `${spaces}        </td>\n`;
    });
    html += `${spaces}      </tr>\n`;
  }
  html += `${spaces}    </tbody>\n`;
  
  html += `${spaces}  </table>\n`;
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
  const backgroundColor = props.backgroundColor || '#f5f5f5';
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
  const theme = props.theme || 'rectangular';
  const borderColor = props.borderColor || '#e0e0e0';
  const borderThickness = props.borderThickness || 1;
  const font = props.font || '';
  const fontSize = props.fontSize || 16;
  
  if (tabs.length === 0) {
    return `${spaces}<!-- No tabs defined -->\n`;
  }
  
  // 生成唯一ID用于JS交互
  const tabsId = `tabs-${Math.random().toString(36).substr(2, 9)}`;
  
  let html = `${spaces}<div id="${tabsId}" style="width: 100%;">\n`;
  
  // Tab标题栏 - Stretch主题需要flex布局
  const tabBarStyle = theme === 'stretch' 
    ? 'display: flex; gap: 4px; border-bottom: ${borderThickness}px solid ${borderColor};'
    : 'display: flex; gap: 4px; border-bottom: ${borderThickness}px solid ${borderColor};';
  
  html += `${spaces}  <div style="${tabBarStyle}">\n`;
  
  tabs.forEach((tab: any, index: number) => {
    const isActive = index === 0; // 默认显示第一个tab
    
    let tabStyle = '';
    
    if (theme === 'sloped') {
      // Sloped主题：只有下边框，背景透明，移除transform和boxShadow
      const borderBottomColor = isActive ? '#0070f3' : borderColor;
      const textColor = isActive ? '#0070f3' : '#999999';
      tabStyle = `padding: 12px 24px; border-bottom: ${borderThickness}px solid ${borderBottomColor}; border-top: none; border-left: none; border-right: none; font-family: ${font || 'inherit'}; font-size: ${fontSize}px; font-weight: ${isActive ? 600 : 400}; background: transparent; color: ${textColor}; border-radius: 8px 8px 0 0; position: relative; z-index: ${isActive ? 1 : 0}; cursor: pointer; transition: all 0.2s ease;`;
      // 移除transform和boxShadow效果
    } else if (theme === 'stretch') {
      // Stretch主题：平均分配宽度，基于Rectangular
      const borderRadius = isActive ? '8px 8px 0 0' : '4px 4px 0 0';
      const background = isActive ? '#ffffff' : '#f5f5f5';
      const color = isActive ? '#0070f3' : '#666666';
      tabStyle = `flex: 1; text-align: center; padding: 12px 24px; border: ${borderThickness}px solid ${borderColor}; border-bottom: none; font-family: ${font || 'inherit'}; font-size: ${fontSize}px; font-weight: ${isActive ? 600 : 400}; background: ${background}; color: ${color}; border-radius: ${borderRadius}; position: relative; margin-bottom: -1px; z-index: ${isActive ? 1 : 0}; cursor: pointer; transition: all 0.2s ease;`;
    } else {
      // Rectangular主题
      const borderRadius = isActive ? '8px 8px 0 0' : '4px 4px 0 0';
      const background = isActive ? '#ffffff' : '#f5f5f5';
      const color = isActive ? '#0070f3' : '#666666';
      tabStyle = `padding: 12px 24px; border: ${borderThickness}px solid ${borderColor}; border-bottom: none; font-family: ${font || 'inherit'}; font-size: ${fontSize}px; font-weight: ${isActive ? 600 : 400}; background: ${background}; color: ${color}; border-radius: ${borderRadius}; position: relative; margin-bottom: -1px; z-index: ${isActive ? 1 : 0}; cursor: pointer; transition: all 0.2s ease;`;
    }
    
    // 添加data-index和onclick事件
    html += `${spaces}    <div data-tab-index="${index}" style="${tabStyle}" onclick="switchTab('${tabsId}', ${index})">\n`;
    html += `${spaces}      ${escapeHtml(tab.title || `Tab ${index + 1}`)}\n`;
    html += `${spaces}    </div>\n`;
  });
  
  html += `${spaces}  </div>\n`;
  
  // Tab内容区域 - 所有tab内容都渲染，但只显示第一个
  const contentBorderTop = theme === 'sloped' ? `${borderThickness}px solid #e0e0e0` : 'none';
  html += `${spaces}  <div style="border-top: ${contentBorderTop}; border-bottom: none; border-left: none; border-right: none; padding: 24px; background-color: #ffffff; border-radius: 0 0 8px 8px;">\n`;
  
  tabs.forEach((tab: any, index: number) => {
    const display = index === 0 ? 'block' : 'none';
    html += `${spaces}    <div data-tab-content="${index}" style="display: ${display};">\n`;
    
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
  
  // 添加JavaScript代码
  html += `${spaces}<script>
`;
  html += `${spaces}(function() {
`;
  html += `${spaces}  function switchTab(tabsId, tabIndex) {
`;
  html += `${spaces}    var container = document.getElementById(tabsId);
`;
  html += `${spaces}    if (!container) return;
`;
  html += `${spaces}    
`;
  html += `${spaces}    // 更新tab标题样式
`;
  html += `${spaces}    var tabHeaders = container.querySelectorAll('[data-tab-index]');
`;
  html += `${spaces}    tabHeaders.forEach(function(tab, idx) {
`;
  html += `${spaces}      var isActive = idx === tabIndex;
`;
  
  // 根据主题应用不同的样式
  if (theme === 'sloped') {
    html += `${spaces}      var borderBottomColor = isActive ? '#0070f3' : '${borderColor}';
`;
    html += `${spaces}      var textColor = isActive ? '#0070f3' : '#999999';
`;
    html += `${spaces}      tab.style.borderBottom = '${borderThickness}px solid ' + borderBottomColor;
`;
    html += `${spaces}      tab.style.borderTop = 'none';
`;
    html += `${spaces}      tab.style.borderLeft = 'none';
`;
    html += `${spaces}      tab.style.borderRight = 'none';
`;
    html += `${spaces}      tab.style.background = 'transparent';
`;
    html += `${spaces}      tab.style.color = textColor;
`;
    // 移除transform和boxShadow效果
  } else if (theme === 'stretch') {
    html += `${spaces}      tab.style.flex = '1';
`;
    html += `${spaces}      tab.style.textAlign = 'center';
`;
    html += `${spaces}      tab.style.background = isActive ? '#ffffff' : '#f5f5f5';
`;
    html += `${spaces}      tab.style.color = isActive ? '#0070f3' : '#666666';
`;
    html += `${spaces}      tab.style.fontWeight = isActive ? '600' : '400';
`;
    html += `${spaces}      tab.style.zIndex = isActive ? '1' : '0';
`;
  } else {
    // Rectangular
    html += `${spaces}      tab.style.background = isActive ? '#ffffff' : '#f5f5f5';
`;
    html += `${spaces}      tab.style.color = isActive ? '#0070f3' : '#666666';
`;
    html += `${spaces}      tab.style.fontWeight = isActive ? '600' : '400';
`;
    html += `${spaces}      tab.style.zIndex = isActive ? '1' : '0';
`;
  }
  
  html += `${spaces}    });
`;
  html += `${spaces}    
`;
  html += `${spaces}    // 更新tab内容显示
`;
  html += `${spaces}    var tabContents = container.querySelectorAll('[data-tab-content]');
`;
  html += `${spaces}    tabContents.forEach(function(content, idx) {
`;
  html += `${spaces}      content.style.display = idx === tabIndex ? 'block' : 'none';
`;
  html += `${spaces}    });
`;
  html += `${spaces}  }
`;
  html += `${spaces}  
`;
  html += `${spaces}  // 暴露到全局作用域
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
  const openIcon = props.openIcon || "chevron";

  const headerFont = props.headerFont || "";
  const headerSize = props.headerSize ?? 16;
  const headerTextAlignment = props.headerTextAlignment || "left";
  const headingPadding = props.headingPadding ?? 10;
  const headerBackgroundColor = props.headerBackgroundColor || "#f5f5f5";
  const headerTextColor = props.headerTextColor || "#000000";
  const innerBackgroundColor = props.innerBackgroundColor || "#ffffff";
  const borderColor = props.borderColor || "#dddddd";

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
    const title = item?.title?.trim() ? item.title : `Pane ${index + 1}`;
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
      if (openIcon === "chevron") {
        const rotate = isOpen ? 90 : 0;
        html += `${spaces}      <span data-acc-icon="${index}" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 8px; transform: rotate(${rotate}deg); transition: transform 0.2s ease; user-select: none;" aria-hidden="true">></span>\n`;
      } else {
        html += `${spaces}      <span data-acc-icon="${index}" style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 8px; user-select: none; font-weight: 700;" aria-hidden="true">${isOpen ? "-" : "+"}</span>\n`;
      }
    }

    html += `${spaces}    </div>\n`;

    const contentDisplay = isOpen ? "block" : "none";
    html += `${spaces}    <div data-acc-content="${index}" style="background-color: ${innerBackgroundColor}; padding: ${headingPadding}px; border-bottom: ${index === items.length - 1 ? "none" : `1px solid ${borderColor}`}; display: ${contentDisplay};">\n`;
    const content = item?.content || [];
    if (content.length > 0) {
      content.forEach((child: any) => {
        html += generateComponentHTML(child, indent + 6);
      });
    } else {
      html += `${spaces}      <!-- Empty accordion content -->\n`;
    }
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

  html += `${spaces}  function apply() {\n`;
  html += `${spaces}    var contents = root.querySelectorAll('[data-acc-content]');\n`;
  html += `${spaces}    contents.forEach(function(el) {\n`;
  html += `${spaces}      var idx = Number(el.getAttribute('data-acc-content'));\n`;
  html += `${spaces}      el.style.display = openMap[idx] ? 'block' : 'none';\n`;
  html += `${spaces}    });\n`;

  if (openIcon === "chevron") {
    html += `${spaces}    var icons = root.querySelectorAll('[data-acc-icon]');\n`;
    html += `${spaces}    icons.forEach(function(icon) {\n`;
    html += `${spaces}      var idx = Number(icon.getAttribute('data-acc-icon'));\n`;
    html += `${spaces}      icon.style.transform = 'rotate(' + (openMap[idx] ? 90 : 0) + 'deg)';\n`;
    html += `${spaces}    });\n`;
  } else if (openIcon === "plus") {
    html += `${spaces}    var icons2 = root.querySelectorAll('[data-acc-icon]');\n`;
    html += `${spaces}    icons2.forEach(function(icon) {\n`;
    html += `${spaces}      var idx = Number(icon.getAttribute('data-acc-icon'));\n`;
    html += `${spaces}      icon.textContent = openMap[idx] ? '-' : '+';\n`;
    html += `${spaces}    });\n`;
  }

  html += `${spaces}  }\n`;

  html += `${spaces}  var headers = root.querySelectorAll('[data-acc-header]');\n`;
  html += `${spaces}  headers.forEach(function(header) {\n`;
  html += `${spaces}    header.addEventListener('click', function() {\n`;
  html += `${spaces}      var idx = Number(header.getAttribute('data-acc-header'));\n`;
  html += `${spaces}      if (onlyOneOpen) {\n`;
  html += `${spaces}        openMap = openMap.map(function(_, i) { return i === idx; });\n`;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .visbuild-page {
    padding: 0 12px;
  }
}
`;
}
