export const SLIDER_ARROW_VIEWBOX = "0 0 24 24";
export const SLIDER_ARROW_LEFT_PATH = "M15 18l-6-6 6-6";
export const SLIDER_ARROW_RIGHT_PATH = "M9 18l6-6-6-6";

export function serializeSliderArrowSvg(
  side: "left" | "right",
  color: string,
  size: number
): string {
  const path = side === "left" ? SLIDER_ARROW_LEFT_PATH : SLIDER_ARROW_RIGHT_PATH;
  return `<svg width="${size}" height="${size}" viewBox="${SLIDER_ARROW_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
}

/** Selected dot width is a % of dot size; min 100%, step 50%. */
export function clampSelectedDotWidthPercent(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 100;
  return Math.max(100, Math.round(n / 50) * 50);
}

export function selectedDotWidthPx(dotsSize: number, widthPercent: unknown): number {
  return dotsSize * (clampSelectedDotWidthPercent(widthPercent) / 100);
}
