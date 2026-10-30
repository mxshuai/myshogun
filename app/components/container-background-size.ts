/** Custom 模式下根据可选宽高解析 CSS background-size */
export function resolveBackgroundSizeCss(
  backgroundSize: string,
  backgroundWidth?: number,
  backgroundHeight?: number
): string {
  if (backgroundSize !== "custom") {
    return backgroundSize;
  }

  const w =
    backgroundWidth != null &&
    Number.isFinite(backgroundWidth) &&
    backgroundWidth > 0
      ? `${backgroundWidth}px`
      : null;
  const h =
    backgroundHeight != null &&
    Number.isFinite(backgroundHeight) &&
    backgroundHeight > 0
      ? `${backgroundHeight}px`
      : null;

  if (w && h) return `${w} ${h}`;
  if (w) return w;
  if (h) return `auto ${h}`;
  return "auto";
}
