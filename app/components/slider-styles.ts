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

export function isSliderSlideAnimation(animation: string): boolean {
  return animation === "slide-slow" || animation === "slide-medium" || animation === "slide-fast";
}

export function sliderSlideTransitionMs(animation: string): number {
  if (animation === "slide-slow") return 800;
  if (animation === "slide-fast") return 220;
  return 450;
}

/** Loop + slide：首尾克隆，保证 wrap 时滑动方向与箭头一致 */
export function useLoopDirectionalTrack(
  mode: string,
  animation: string,
  pageCount: number,
  isEditing: boolean
): boolean {
  return mode === "loop" && pageCount > 1 && isSliderSlideAnimation(animation) && !isEditing;
}

export function buildLoopExtendedPages<T>(pages: T[]): T[] {
  if (pages.length <= 1) return pages;
  return [pages[pages.length - 1], ...pages, pages[0]];
}

export function sliderTrackTranslateX(trackIndex: number, slideCount: number): string {
  return `translateX(-${(trackIndex * 100) / slideCount}%)`;
}

export type LoopNavState = { currentPage: number; trackIndex: number };

/** 逻辑页 k 对应轨道下标 k+1（首尾克隆区除外） */
export function loopTrackIndexForPage(page: number): number {
  return page + 1;
}

export function loopNextNavState(currentPage: number, pageCount: number): LoopNavState {
  if (currentPage < pageCount - 1) {
    const page = currentPage + 1;
    return { currentPage: page, trackIndex: loopTrackIndexForPage(page) };
  }
  return { currentPage: 0, trackIndex: pageCount + 1 };
}

export function loopPrevNavState(currentPage: number, pageCount: number): LoopNavState {
  if (currentPage > 0) {
    const page = currentPage - 1;
    return { currentPage: page, trackIndex: loopTrackIndexForPage(page) };
  }
  return { currentPage: pageCount - 1, trackIndex: 0 };
}

export function loopJumpNavState(page: number, pageCount: number): LoopNavState {
  const clamped = Math.max(0, Math.min(page, pageCount - 1));
  return { currentPage: clamped, trackIndex: loopTrackIndexForPage(clamped) };
}

export function loopNavAfterForwardWrap(): LoopNavState {
  return { currentPage: 0, trackIndex: loopTrackIndexForPage(0) };
}

export function loopNavAfterBackwardWrap(currentPage: number, pageCount: number): LoopNavState {
  return { currentPage, trackIndex: loopTrackIndexForPage(currentPage) };
}
