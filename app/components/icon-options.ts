/** 图标 ID（与设计稿一致使用 shg-fa-*）与展示名称；渲染时映射为 Font Awesome 4 类名 */
export type IconOption = {
  value: string;
  label: string;
};

export const ICON_OPTIONS: IconOption[] = [
  { value: "shg-fa-address-book-o", label: "Address Book" },
  { value: "shg-fa-home", label: "Home" },
  { value: "shg-fa-user", label: "User" },
  { value: "shg-fa-users", label: "Users" },
  { value: "shg-fa-envelope-o", label: "Envelope" },
  { value: "shg-fa-phone", label: "Phone" },
  { value: "shg-fa-search", label: "Search" },
  { value: "shg-fa-heart-o", label: "Heart" },
  { value: "shg-fa-star-o", label: "Star" },
  { value: "shg-fa-shopping-cart", label: "Shopping Cart" },
  { value: "shg-fa-cog", label: "Settings" },
  { value: "shg-fa-bell-o", label: "Bell" },
  { value: "shg-fa-calendar", label: "Calendar" },
  { value: "shg-fa-camera", label: "Camera" },
  { value: "shg-fa-image", label: "Image" },
  { value: "shg-fa-file-o", label: "File" },
  { value: "shg-fa-folder-o", label: "Folder" },
  { value: "shg-fa-download", label: "Download" },
  { value: "shg-fa-upload", label: "Upload" },
  { value: "shg-fa-share", label: "Share" },
  { value: "shg-fa-link", label: "Link" },
  { value: "shg-fa-external-link", label: "External Link" },
  { value: "shg-fa-map-marker", label: "Map Marker" },
  { value: "shg-fa-globe", label: "Globe" },
  { value: "shg-fa-check", label: "Check" },
  { value: "shg-fa-times", label: "Close" },
  { value: "shg-fa-plus", label: "Plus" },
  { value: "shg-fa-minus", label: "Minus" },
  { value: "shg-fa-arrow-right", label: "Arrow Right" },
  { value: "shg-fa-arrow-left", label: "Arrow Left" },
  { value: "shg-fa-chevron-right", label: "Chevron Right" },
  { value: "shg-fa-chevron-left", label: "Chevron Left" },
  { value: "shg-fa-info-circle", label: "Info" },
  { value: "shg-fa-question-circle-o", label: "Question" },
  { value: "shg-fa-lock", label: "Lock" },
  { value: "shg-fa-unlock-alt", label: "Unlock" },
];

/** Height 文本输入：纯数字默认按 px，否则按原样（如 4rem、32px） */
export function iconFontSizeFromHeight(
  height: string | undefined | number
): string {
  if (height === undefined || height === null) return "64px";
  let raw = String(height).trim();
  if (!raw) return "64px";
  if (raw.includes(";")) raw = raw.split(";")[0]!.trim();
  if (!raw) return "64px";
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
  return raw;
}

export function toFaIconClasses(iconId: string): string {
  const raw = iconId.trim();
  if (raw.startsWith("shg-fa-")) {
    return `fa fa-${raw.slice(7)}`;
  }
  if (raw.startsWith("fa fa-")) {
    return raw;
  }
  if (raw.startsWith("fa-")) {
    return `fa ${raw}`;
  }
  return `fa fa-${raw}`;
}
