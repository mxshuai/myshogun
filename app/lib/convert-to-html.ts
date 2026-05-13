import type { Data } from "@puckeditor/core";

import { iconFontSizeFromHeight, toFaIconClasses } from "~/components/icon-options";

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
  html += '  <div class="puck-page">\n';
  
  components.forEach((component) => {
    html += generateComponentHTML(component);
  });
  
  html += '  </div>\n';
  html += '</body>\n</html>';
  
  return html;
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
      return generateButton(props, spaces);
    case 'Card':
      return generateCard(props, layout, spaces);
    case 'CustomHtml':
      return generateCustomHtml(props, layout, spaces);
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
      return generateDivider(props, spaces);
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
  const level = props.level || 2;
  const sizeMap: Record<string, string> = {
    xxxl: '3.5rem',
    xxl: '3rem',
    xl: '2.5rem',
    l: '2rem',
    m: '1.5rem',
    s: '1.25rem',
    xs: '1rem',
  };
  
  const fontSize = sizeMap[props.size] || '1.5rem';
  const textAlign = props.align || 'left';
  const padding = layout.padding ? `padding-top: ${layout.padding}; padding-bottom: ${layout.padding};` : '';
  
  return `${spaces}<h${level} style="font-size: ${fontSize}; text-align: ${textAlign}; margin: 0; font-weight: 600; line-height: 1.2; ${padding}">
${spaces}  <span style="display: block; width: 100%;">${escapeHtml(props.text || 'Heading')}</span>
${spaces}</h${level}>\n`;
}

/**
 * 生成 Text HTML
 */
function generateText(props: any, layout: any, spaces: string): string {
  const sizeMap: Record<string, string> = {
    s: '16px',
    m: '20px',
  };
  
  const fontSize = sizeMap[props.size] || '20px';
  const textAlign = props.align || 'left';
  const color = props.color === 'muted' ? '#6c757d' : 'inherit';
  const maxWidth = props.maxWidth ? `max-width: ${props.maxWidth};` : '';
  const padding = layout.padding ? `padding-top: ${layout.padding}; padding-bottom: ${layout.padding};` : '';
  
  let justifyContent = 'flex-start';
  if (textAlign === 'center') justifyContent = 'center';
  else if (textAlign === 'right') justifyContent = 'flex-end';
  
  return `${spaces}<div style="display: flex; text-align: ${textAlign}; width: 100%; ${maxWidth} ${padding}">
${spaces}  <span style="color: ${color}; font-size: ${fontSize}; font-weight: 300; justify-content: ${justifyContent};">
${spaces}    ${escapeHtml(props.text || 'Text')}
${spaces}  </span>
${spaces}</div>\n`;
}

/**
 * 生成 Button HTML
 */
function generateButton(props: any, spaces: string): string {
  const variantStyles: Record<string, string> = {
    primary: 'background-color: #0070f3; color: #ffffff; border: none;',
    secondary: 'background-color: #6c757d; color: #ffffff; border: none;',
  };
  
  const style = variantStyles[props.variant] || variantStyles.primary;
  
  return `${spaces}<div>
${spaces}  <a href="${props.href || '#'}" style="display: inline-block; padding: 16px 32px; ${style} border-radius: 6px; text-decoration: none; font-weight: 500;">
${spaces}    ${escapeHtml(props.label || 'Button')}
${spaces}  </a>
${spaces}</div>\n`;
}

/**
 * 生成 Card HTML
 */
function generateCard(props: any, layout: any, spaces: string): string {
  const padding = layout.padding ? `padding-top: ${layout.padding}; padding-bottom: ${layout.padding};` : '';
  
  let html = `${spaces}<div style="border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff; ${padding}">\n`;
  
  if (props.imageUrl) {
    html += `${spaces}  <img src="${props.imageUrl}" alt="${escapeHtml(props.title)}" style="width: 100%; height: 200px; object-fit: cover;" />\n`;
  }
  
  html += `${spaces}  <div style="padding: 20px;">\n`;
  html += `${spaces}    <h3 style="margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 600; color: #333;">${escapeHtml(props.title)}</h3>\n`;
  html += `${spaces}    <p style="margin: 0; font-size: 0.95rem; line-height: 1.6; color: #666;">${escapeHtml(props.description)}</p>\n`;
  
  if (props.href) {
    html += `${spaces}    <a href="${props.href}" style="display: inline-block; margin-top: 12px; color: #0070f3; text-decoration: none; font-weight: 500;">Learn more →</a>\n`;
  }
  
  html += `${spaces}  </div>\n`;
  html += `${spaces}</div>\n`;
  
  return html;
}

/**
 * 生成 Custom HTML（按编辑内容原样输出，不做转义）
 */
function generateCustomHtml(props: any, layout: any, spaces: string): string {
  const padding = layout.padding
    ? `padding-top: ${layout.padding}; padding-bottom: ${layout.padding};`
    : "";
  const rawHtml = props.html ?? "";
  const rawCss = (props.css ?? "").trim();

  let block = `${spaces}<div class="puck-custom-html-root" style="${padding}">\n`;
  if (rawCss) {
    block += `${spaces}  <style>\n`;
    block += rawCss
      .split("\n")
      .map((line: string) => `${spaces}    ${line}`)
      .join("\n");
    block += `\n${spaces}  </style>\n`;
  }
  for (const line of rawHtml.split("\n")) {
    block += `${spaces}  ${line}\n`;
  }
  block += `${spaces}</div>\n`;
  return block;
}

/**
 * 生成 Image HTML
 */
function generateImage(props: any, layout: any, spaces: string): string {
  const padding = layout.padding ? `padding-top: ${layout.padding}; padding-bottom: ${layout.padding};` : '';
  
  return `${spaces}<div style="${padding}">
${spaces}  <img src="${props.src}" alt="${escapeHtml(props.alt)}" style="width: ${props.width || '100%'}; height: ${props.height || 'auto'}; display: block; border-radius: 8px;" />
${spaces}</div>\n`;
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
  const padding = layout.padding ? `padding-top: ${layout.padding}; padding-bottom: ${layout.padding};` : '';
  const aspectRatio = props.aspectRatio || '16:9';
  const ratioPadding = aspectRatio === '4:3' ? '75%' : '56.25%';
  const embedUrl = buildVideoEmbedUrl(props);
  const videoUrl = props.videoUrl || '';
  const directVideoRegex = /\.(mp4|webm|ogg)(\?.*)?$/i;
  const isDirectVideo = directVideoRegex.test(videoUrl);
  const loading = props.loading === 'eager' || props.loading === 'lazy' ? props.loading : '';

  if (!props.videoUrl || (!embedUrl && !isDirectVideo)) {
    return `${spaces}<div style="${padding} border: 1px dashed #d0d0d0; border-radius: 8px; padding: 16px; color: #666; font-size: 14px;">
${spaces}  Youtube or Vimeo link
${spaces}</div>\n`;
  }

  if (isDirectVideo) {
    return `${spaces}<div style="${padding}">
${spaces}  <div style="position: relative; width: 100%; padding-top: ${ratioPadding}; background-color: #000; border-radius: 8px; overflow: hidden;">
${spaces}    <video src="${videoUrl}" controls ${props.autoplay ? 'autoplay' : ''} ${props.loop ? 'loop' : ''} ${props.muteAudio ? 'muted' : ''} playsinline style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;"></video>
${spaces}  </div>
${spaces}</div>\n`;
  }

  return `${spaces}<div style="${padding}">
${spaces}  <div style="position: relative; width: 100%; padding-top: ${ratioPadding};">
${spaces}    <iframe src="${embedUrl}" title="Video player" ${loading ? `loading="${loading}"` : ''} allow="${props.autoplay ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' : 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'}" allowfullscreen style="position: absolute; inset: 0; width: 100%; height: 100%; border: none; border-radius: 8px;"></iframe>
${spaces}  </div>
${spaces}</div>\n`;
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
  const padding = layout.padding
    ? `padding-top: ${layout.padding}; padding-bottom: ${layout.padding};`
    : "";
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

  let inner: string;
  if (props.addLink && props.linkHref?.trim()) {
    const href = escapeHtml(props.linkHref.trim());
    const target = props.openInNewWindow
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";
    const aLabel = aria ? ` aria-label="${escapeHtml(aria)}"` : "";
    inner = `<a href="${href}"${target}${aLabel} style="display: inline-flex; text-decoration: none; color: inherit;">${iconTag}</a>`;
  } else if (aria) {
    inner = `<span aria-label="${escapeHtml(aria)}">${iconTag}</span>`;
  } else {
    inner = iconTag;
  }

  return `${spaces}<div style="${padding}display: flex; justify-content: ${justify}; width: 100%;">
${spaces}  ${inner}
${spaces}</div>\n`;
}

function generateDivider(props: any, spaces: string): string {
  const thickness = props.thickness || 1;
  const color = props.color || '#e0e0e0';
  const style = props.style || 'solid';
  
  return `${spaces}<div style="padding: 16px 0;">
${spaces}  <hr style="border: none; border-top: ${thickness}px ${style} ${color}; margin: 0;" />
${spaces}</div>\n`;
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
  const backgroundRepeat = props.backgroundRepeat || 'no-repeat';
  const horizontalPosition = props.horizontalPosition || 'center';
  const horizontalPositionValue = props.horizontalPositionValue || 0;
  const verticalPosition = props.verticalPosition || 'center';
  const verticalPositionValue = props.verticalPositionValue || 0;
  const parallaxEffect = props.parallaxEffect || false;
  const content = props.content || [];
  
  const alignMap: Record<string, string> = {
    top: 'flex-start',
    middle: 'center',
    bottom: 'flex-end',
  };
  
  let backgroundStyle = 'min-height: 200px; display: flex; flex-direction: column; justify-content: ' + alignMap[verticalAlign] + '; padding: 40px 16px; position: relative;';
  
  if (backgroundType === 'image' && backgroundImage) {
    backgroundStyle += ` background-image: url('${backgroundImage}');`;
    
    // Background size
    if (backgroundSize === 'custom') {
      backgroundStyle += ' background-size: auto;';
    } else {
      backgroundStyle += ` background-size: ${backgroundSize};`;
    }
    
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
  return `/* Puck Page Styles */
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

.puck-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .puck-page {
    padding: 0 12px;
  }
}
`;
}
