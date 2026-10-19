import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type TransitionEvent } from "react";
import type { CSSProperties } from "react";
import type { ComponentConfig, Slot } from "@puckeditor/core";
import { registerOverlayPortal, useGetPuck } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import { onOffOptions } from "./button-field-groups";
import { readSliderProps } from "./slider-settings";
import {
  SLIDER_ARROW_LEFT_PATH,
  SLIDER_ARROW_RIGHT_PATH,
  SLIDER_ARROW_VIEWBOX,
  clampSelectedDotWidthPercent,
  selectedDotWidthPx,
  buildLoopExtendedPages,
  isSliderSlideAnimation,
  sliderSlideTransitionMs,
  sliderTrackTranslateX,
  useLoopDirectionalTrack,
  loopNextNavState,
  loopPrevNavState,
  loopJumpNavState,
  loopNavAfterForwardWrap,
  loopNavAfterBackwardWrap,
  loopTrackIndexForPage,
  type LoopNavState,
} from "./slider-styles";

function SliderArrowIcon({
  side,
  color,
  size,
}: {
  side: "left" | "right";
  color: string;
  size: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={SLIDER_ARROW_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d={side === "left" ? SLIDER_ARROW_LEFT_PATH : SLIDER_ARROW_RIGHT_PATH}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SliderItem = {
  slot: Slot;
};

type SliderNavState = LoopNavState;

type SliderNavAction =
  | { type: "reset"; useLoopTrack: boolean }
  | { type: "next"; useLoopTrack: boolean; pageCount: number; mode: string; rewind: boolean }
  | { type: "prev"; useLoopTrack: boolean; pageCount: number; mode: string; rewind: boolean }
  | { type: "jump"; index: number; useLoopTrack: boolean; pageCount: number }
  | { type: "loop_wrap_forward" }
  | { type: "loop_wrap_backward"; pageCount: number }
  | { type: "clamp"; pageCount: number };

function sliderNavReducer(state: SliderNavState, action: SliderNavAction): SliderNavState {
  switch (action.type) {
    case "reset":
      return { currentPage: 0, trackIndex: action.useLoopTrack ? 1 : 0 };
    case "next":
      if (action.useLoopTrack) {
        return loopNextNavState(state.currentPage, action.pageCount);
      }
      if (state.currentPage < action.pageCount - 1) {
        const page = state.currentPage + 1;
        return { currentPage: page, trackIndex: page };
      }
      if (action.mode === "loop" || action.rewind) {
        return { currentPage: 0, trackIndex: 0 };
      }
      return state;
    case "prev":
      if (action.useLoopTrack) {
        return loopPrevNavState(state.currentPage, action.pageCount);
      }
      if (state.currentPage > 0) {
        const page = state.currentPage - 1;
        return { currentPage: page, trackIndex: page };
      }
      if (action.mode === "loop" || action.rewind) {
        const page = action.pageCount - 1;
        return { currentPage: page, trackIndex: page };
      }
      return state;
    case "jump": {
      const page = Math.max(0, Math.min(action.index, action.pageCount - 1));
      if (action.useLoopTrack) {
        return loopJumpNavState(page, action.pageCount);
      }
      return { currentPage: page, trackIndex: page };
    }
    case "loop_wrap_forward":
      return loopNavAfterForwardWrap();
    case "loop_wrap_backward":
      return loopNavAfterBackwardWrap(state.currentPage, action.pageCount);
    case "clamp": {
      const page = Math.max(0, Math.min(state.currentPage, action.pageCount - 1));
      if (page === state.currentPage && state.trackIndex === loopTrackIndexForPage(page)) {
        return state;
      }
      return { currentPage: page, trackIndex: loopTrackIndexForPage(page) };
    }
    default:
      return state;
  }
}

const animationOptions = [
  { label: "No Animation", value: "none" },
  { label: "Slide - Slow", value: "slide-slow" },
  { label: "Slide - Medium", value: "slide-medium" },
  { label: "Slide - Fast", value: "slide-fast" },
  { label: "Fade In", value: "fade-in" },
  { label: "Fade In Down", value: "fade-in-down" },
  { label: "Fade In Left", value: "fade-in-left" },
  { label: "Fade In Right", value: "fade-in-right" },
  { label: "Fade In Up", value: "fade-in-up" },
  { label: "Fade Out", value: "fade-out" },
  { label: "Fade Out Down", value: "fade-out-down" },
  { label: "Fade Out Left", value: "fade-out-left" },
  { label: "Fade Out Right", value: "fade-out-right" },
  { label: "Fade Out Up", value: "fade-out-up" },
  { label: "Zoom In", value: "zoom-in" },
  { label: "Zoom In Down", value: "zoom-in-down" },
  { label: "Zoom In Left", value: "zoom-in-left" },
  { label: "Zoom In Right", value: "zoom-in-right" },
  { label: "Zoom In Up", value: "zoom-in-up" },
];

function nonSlideActiveTransform(animation: string): string {
  if (animation.indexOf("left") >= 0) return "translateX(-6px)";
  if (animation.indexOf("right") >= 0) return "translateX(6px)";
  if (animation.indexOf("up") >= 0) return "translateY(-6px)";
  if (animation.indexOf("down") >= 0) return "translateY(6px)";
  if (animation.indexOf("zoom") >= 0) return "scale(0.98)";
  return "none";
}

const nonSlideTransition = "opacity 320ms ease, transform 320ms ease";

function clampScreenIndex(
  currentSlideIndex: number | undefined,
  screenCount: number,
): number {
  return Math.max(
    0,
    Math.min((currentSlideIndex ?? 1) - 1, Math.max(0, screenCount - 1)),
  );
}

function nextScreenPage(
  current: number,
  pageCount: number,
  mode: string,
  rewind: boolean,
): number {
  if (pageCount <= 1) return 0;
  if (current < pageCount - 1) return current + 1;
  if (mode === "loop" || rewind) return 0;
  return current;
}

function prevScreenPage(
  current: number,
  pageCount: number,
  mode: string,
  rewind: boolean,
): number {
  if (pageCount <= 1) return 0;
  if (current > 0) return current - 1;
  if (mode === "loop" || rewind) return pageCount - 1;
  return current;
}

function SliderOverlayButton({
  isEditing,
  style,
  onClick,
  ...rest
}: {
  isEditing: boolean;
  style?: CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style" | "onClick">) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    return registerOverlayPortal(ref.current);
  }, [isEditing]);

  return (
    <button
      ref={ref}
      type="button"
      style={{ ...style, cursor: "pointer", pointerEvents: "auto" }}
      onClick={onClick}
      {...rest}
    />
  );
}

type SliderViewProps = ReturnType<typeof readSliderProps> & {
  id?: string;
  isEditing: boolean;
  activePage: number;
  visualTrackIndex: number;
  transitionEnabled: boolean;
  onTrackTransitionEnd: (e: TransitionEvent<HTMLDivElement>) => void;
  onPrev: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  onJumpTo: (index: number, e: React.MouseEvent) => void;
  onHoverChange: (hovering: boolean) => void;
};

const inlineNumber = (
  label: string,
  options: { min?: number; max?: number; step?: number },
) => ({
  type: "number" as const,
  label,
  inline: true,
  ...options,
});

const switchField = (label: string) => ({
  type: "radio" as const,
  label,
  options: [...onOffOptions],
  switch: true,
});

const mainObjectFields = {
  mode: {
    type: "radio" as const,
    label: "Mode",
    options: [
      { label: "Slide", value: "slide" },
      { label: "Loop", value: "loop" },
    ],
  },
  rewind: switchField("Rewind"),
  numberOfSlides: inlineNumber("Number of slides", { min: 1, max: 20 }),
  slidesPerPage: inlineNumber("Slides per page", { min: 1, max: 12 }),
  animation: {
    type: "select" as const,
    label: "Animation",
    options: animationOptions,
  },
  autoSlide: switchField("Auto Slide"),
  showEachSlideSeconds: inlineNumber("Show each slide for (seconds)", { min: 1, max: 60 }),
  pauseAutoplayOnHover: switchField("Pause autoplay on hover"),
};

const controlsObjectFields = {
  controlsOverContent: switchField("Controls over content"),
  showArrows: switchField("Show arrows"),
  arrowColor: createPuckColorField("Arrow color", "#777777"),
  arrowHeight: inlineNumber("Arrow height", { min: 12, max: 80 }),
  arrowBackground: switchField("Arrow background"),
  showDots: switchField("Show dots"),
  selectedDotColor: createPuckColorField("Selected dot color", "#777777"),
  unselectedDotColor: createPuckColorField("Unselected dot color", "#999999"),
  dotsSize: inlineNumber("Dots size", { min: 4, max: 28 }),
  selectedDotWidth: inlineNumber("Selected dot width", { min: 100, step: 50 }),
  dotsLocation: {
    type: "radio" as const,
    label: "Dots location",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
  spaceBetweenDots: inlineNumber("Space between dots", { min: 0, max: 40 }),
};

const sliderFields = {
  main: {
    type: "object" as const,
    label: "Main",
    defaultOpen: true,
    objectFields: mainObjectFields,
  },
  controls: {
    type: "object" as const,
    label: "Controls",
    objectFields: controlsObjectFields,
  },
  items: {
    type: "array" as const,
    label: "Slots",
    arrayFields: {
      slot: {
        type: "slot" as const,
        label: "Slot",
        disallow: ["Hero"],
      },
    },
  },
} as ComponentConfig<Components["Slider"]>["fields"];

const SliderInternal: ComponentConfig<Components["Slider"]> = {
  fields: sliderFields,
  resolveData: (data) => {
    const props = data.props || {};
    const flat = readSliderProps(props);
    const screenCount = Math.max(1, Math.min(20, flat.numberOfSlides));
    const existing = Array.isArray(props.items) ? props.items : [];
    let changed = false;

    if (screenCount !== flat.numberOfSlides) {
      changed = true;
    }

    let slidesPerPage = flat.slidesPerPage;
    if (!Number.isFinite(slidesPerPage)) slidesPerPage = 1;
    const clampedSpp = Math.max(1, Math.min(12, slidesPerPage));
    if (clampedSpp !== slidesPerPage) {
      changed = true;
    }

    const totalSlots = screenCount * clampedSpp;

    const normalizeRow = (row: any): { slot: Slot } => ({
      slot: row?.slot ?? [],
    });

    const needsSlotShape = existing.some(
      (row: any) => !row || typeof row !== "object" || row.slot === undefined
    );

    let items: { slot: Slot }[] = existing as { slot: Slot }[];
    if (needsSlotShape) {
      items = existing.map(normalizeRow);
      changed = true;
    }

    if (items.length < totalSlots) {
      items = [...items];
      while (items.length < totalSlots) {
        items.push({ slot: [] });
        changed = true;
      }
    } else if (items.length > totalSlots) {
      items = items.slice(0, totalSlots);
      changed = true;
    }

    let currentSlideIndex = Number(props.currentSlideIndex);
    if (!Number.isFinite(currentSlideIndex)) currentSlideIndex = 1;
    if (currentSlideIndex < 1) {
      currentSlideIndex = 1;
      changed = true;
    }
    if (currentSlideIndex > screenCount) {
      currentSlideIndex = Math.max(1, screenCount);
      changed = true;
    }

    const clampedDotWidth = clampSelectedDotWidthPercent(flat.selectedDotWidth);
    if (clampedDotWidth !== flat.selectedDotWidth) {
      changed = true;
    }

    const needsNest = !props.main || !props.controls;
    if (!changed && !needsNest) {
      return {};
    }

    return {
      props: {
        ...props,
        items,
        currentSlideIndex,
        main: {
          mode: flat.mode,
          rewind: flat.rewind,
          numberOfSlides: screenCount,
          slidesPerPage: clampedSpp,
          animation: flat.animation,
          autoSlide: flat.autoSlide,
          showEachSlideSeconds: flat.showEachSlideSeconds,
          pauseAutoplayOnHover: flat.pauseAutoplayOnHover,
        },
        controls: {
          controlsOverContent: flat.controlsOverContent,
          showArrows: flat.showArrows,
          arrowColor: flat.arrowColor,
          arrowHeight: flat.arrowHeight,
          arrowBackground: flat.arrowBackground,
          showDots: flat.showDots,
          selectedDotColor: flat.selectedDotColor,
          unselectedDotColor: flat.unselectedDotColor,
          dotsSize: flat.dotsSize,
          selectedDotWidth: clampedDotWidth,
          dotsLocation: flat.dotsLocation,
          spaceBetweenDots: flat.spaceBetweenDots,
        },
        mode: undefined,
        rewind: undefined,
        numberOfSlides: undefined,
        slidesPerPage: undefined,
        animation: undefined,
        autoSlide: undefined,
        showEachSlideSeconds: undefined,
        pauseAutoplayOnHover: undefined,
        controlsOverContent: undefined,
        showArrows: undefined,
        arrowColor: undefined,
        arrowHeight: undefined,
        arrowBackground: undefined,
        showDots: undefined,
        selectedDotColor: undefined,
        unselectedDotColor: undefined,
        dotsSize: undefined,
        selectedDotWidth: undefined,
        dotsLocation: undefined,
        spaceBetweenDots: undefined,
      },
    };
  },
  resolveFields: (data) => {
    const flat = readSliderProps(data.props);
    const mainFields: Record<string, unknown> = { ...mainObjectFields };
    if (flat.mode === "loop") {
      delete mainFields.rewind;
    }
    if (!flat.autoSlide) {
      delete mainFields.showEachSlideSeconds;
      delete mainFields.pauseAutoplayOnHover;
    }
    return {
      main: {
        type: "object" as const,
        label: "Main",
        defaultOpen: true,
        objectFields: mainFields,
      },
      controls: {
        type: "object" as const,
        label: "Controls",
        objectFields: controlsObjectFields,
      },
    } as any;
  },
  defaultProps: {
    currentSlideIndex: 1,
    items: [{ slot: [] }],
    main: {
      mode: "slide",
      rewind: true,
      numberOfSlides: 1,
      slidesPerPage: 1,
      animation: "slide-medium",
      autoSlide: false,
      showEachSlideSeconds: 5,
      pauseAutoplayOnHover: false,
    },
    controls: {
      controlsOverContent: false,
      showArrows: true,
      arrowColor: "#777777",
      arrowHeight: 35,
      arrowBackground: false,
      showDots: true,
      selectedDotColor: "#777777",
      unselectedDotColor: "#999999",
      dotsSize: 14,
      selectedDotWidth: 100,
      dotsLocation: "center",
      spaceBetweenDots: 8,
    },
  },
  render: (allProps) => {
    const sliderProps = { ...readSliderProps(allProps), id: allProps.id };
    if (allProps.puck?.isEditing) {
      return <SliderEditor {...sliderProps} />;
    }
    return <SliderPreview {...sliderProps} />;
  },
};

function SliderView({
  mode,
  rewind,
  numberOfSlides,
  slidesPerPage,
  animation,
  controlsOverContent,
  showArrows,
  arrowColor,
  arrowHeight,
  arrowBackground,
  showDots,
  selectedDotColor,
  unselectedDotColor,
  dotsSize,
  selectedDotWidth,
  dotsLocation,
  spaceBetweenDots,
  items,
  isEditing,
  activePage,
  visualTrackIndex,
  transitionEnabled,
  onTrackTransitionEnd,
  onPrev,
  onNext,
  onJumpTo,
  onHoverChange,
}: SliderViewProps) {
  const rawItems = (items || []) as unknown as SliderItem[];
  const screenCount = Math.max(1, numberOfSlides || 1);
  const safeSlidesPerPage = Math.max(1, Math.min(12, slidesPerPage || 1));
  const pageCount = screenCount;
  const [maxPageHeight, setMaxPageHeight] = useState(0);
  const pageMeasureRefs = useRef<(HTMLDivElement | null)[]>([]);

  const useLoopTrack = useLoopDirectionalTrack(mode, animation, pageCount, isEditing);
  const transitionDuration = `${sliderSlideTransitionMs(animation)}ms`;
  const isSlideAnimation = isSliderSlideAnimation(animation);

  const pages = useMemo(() => {
    const chunks: SliderItem[][] = [];
    for (let p = 0; p < screenCount; p++) {
      const row: SliderItem[] = [];
      for (let c = 0; c < safeSlidesPerPage; c++) {
        row.push(rawItems[p * safeSlidesPerPage + c]);
      }
      chunks.push(row);
    }
    return chunks;
  }, [rawItems, screenCount, safeSlidesPerPage]);

  const trackSlides = useMemo(
    () => (useLoopTrack ? buildLoopExtendedPages(pages) : pages),
    [pages, useLoopTrack],
  );
  const trackSlideCount = trackSlides.length;

  const measurePageIndices = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i),
    [pageCount],
  );

  useEffect(() => {
    if (isSlideAnimation) {
      setMaxPageHeight(0);
      return;
    }

    pageMeasureRefs.current.length = pageCount;

    const measure = () => {
      let max = 0;
      for (const i of measurePageIndices) {
        const el = pageMeasureRefs.current[i];
        if (el) max = Math.max(max, el.getBoundingClientRect().height);
      }
      setMaxPageHeight((prev) => (prev === max ? prev : max));
    };

    const observer = new ResizeObserver(measure);
    for (const i of measurePageIndices) {
      const el = pageMeasureRefs.current[i];
      if (el) observer.observe(el);
    }
    measure();
    return () => observer.disconnect();
  }, [isSlideAnimation, measurePageIndices, pages, pageCount, rawItems]);

  const viewportStyle: CSSProperties = {
    flex: controlsOverContent ? undefined : 1,
    minWidth: 0,
    width: controlsOverContent ? "100%" : undefined,
    overflow: "hidden",
    borderRadius: 8,
    ...(!isSlideAnimation && maxPageHeight > 0 ? { minHeight: maxPageHeight } : {}),
  };

  const dotsJustify =
    dotsLocation === "left" ? "flex-start" : dotsLocation === "right" ? "flex-end" : "center";

  const arrowButtonStyle = (side: "left" | "right"): CSSProperties => ({
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    width: arrowHeight + 8,
    height: arrowHeight + 8,
    borderRadius: 999,
    background: arrowBackground ? "rgba(0,0,0,0.35)" : "transparent",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    ...(controlsOverContent
      ? {
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 2,
          ...(side === "left" ? { left: 8 } : { right: 8 }),
        }
      : {}),
  });

  const dotButtonStyle = (active: boolean): CSSProperties => ({
    border: "none",
    cursor: "pointer",
    pointerEvents: "auto",
    borderRadius: 999,
    height: dotsSize,
    width: active ? selectedDotWidthPx(dotsSize, selectedDotWidth) : dotsSize,
    background: active ? selectedDotColor : unselectedDotColor,
    transition: "all 220ms ease",
  });

  if (rawItems.length === 0) {
    return (
      <Section>
        <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
          Add at least one slot (check slides × slides per page).
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
      >
        <div
          style={
            controlsOverContent
              ? { position: "relative", width: "100%" }
              : {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                }
          }
        >
          {showArrows ? (
            <SliderOverlayButton
              isEditing={isEditing}
              onClick={onPrev}
              style={arrowButtonStyle("left")}
              aria-label="Previous slide"
            >
              <SliderArrowIcon side="left" color={arrowColor} size={arrowHeight} />
            </SliderOverlayButton>
          ) : null}

          <div style={viewportStyle}>
            {isSlideAnimation ? (
              <div
                onTransitionEnd={onTrackTransitionEnd}
                style={{
                  display: "flex",
                  width: `${trackSlideCount * 100}%`,
                  transform: sliderTrackTranslateX(visualTrackIndex, trackSlideCount),
                  transition:
                    isEditing || !transitionEnabled
                      ? "none"
                      : `transform ${transitionDuration} ease`,
                }}
              >
                {trackSlides.map((pageItems, pageIndex) => (
                  <div
                    key={`slider-page-${pageIndex}`}
                    style={{
                      width: `${100 / trackSlideCount}%`,
                      display: "grid",
                      gridTemplateColumns: `repeat(${safeSlidesPerPage}, minmax(0, 1fr))`,
                      gap: 12,
                      alignItems: "stretch",
                    }}
                  >
                    {pageItems.map((item, itemIndex) => {
                      const pageSlot = item?.slot;
                      return (
                        <div key={`slider-item-${pageIndex}-${itemIndex}`}>
                          {pageSlot
                            ? (() => {
                                const SlideContent = pageSlot as any;
                                return <SlideContent disallow={["Hero"]} />;
                              })()
                            : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", width: "100%" }}>
                {pages.map((pageItems, pageIndex) => {
                  const isActive = pageIndex === activePage;
                  return (
                    <div
                      key={`non-slide-page-${pageIndex}`}
                      ref={(el) => {
                        pageMeasureRefs.current[pageIndex] = el;
                      }}
                      style={{
                        gridArea: "1 / 1",
                        display: "grid",
                        gridTemplateColumns: `repeat(${safeSlidesPerPage}, minmax(0, 1fr))`,
                        gap: 12,
                        opacity: isActive ? 1 : 0,
                        pointerEvents: isActive ? "auto" : "none",
                        zIndex: isActive ? 1 : 0,
                        transform: isActive
                          ? nonSlideActiveTransform(animation)
                          : "none",
                        transition: animation === "none" ? "none" : nonSlideTransition,
                      }}
                    >
                      {pageItems.map((item, itemIndex) => {
                        const pageSlot = item?.slot;
                        return (
                          <div key={`slider-item-non-slide-${pageIndex}-${itemIndex}`}>
                            {pageSlot
                              ? (() => {
                                  const SlideContent = pageSlot as any;
                                  return <SlideContent disallow={["Hero"]} />;
                                })()
                              : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {showArrows ? (
            <SliderOverlayButton
              isEditing={isEditing}
              onClick={onNext}
              style={arrowButtonStyle("right")}
              aria-label="Next slide"
            >
              <SliderArrowIcon side="right" color={arrowColor} size={arrowHeight} />
            </SliderOverlayButton>
          ) : null}
        </div>

        {showDots ? (
          <div
            style={{
              display: "flex",
              justifyContent: dotsJustify,
              alignItems: "center",
              gap: `${spaceBetweenDots}px`,
              marginTop: 12,
            }}
          >
            {Array.from({ length: pageCount }).map((_, idx) => {
              const active = idx === activePage;
              return (
                <SliderOverlayButton
                  key={`dot-${idx}`}
                  isEditing={isEditing}
                  onClick={(e) => onJumpTo(idx, e)}
                  style={dotButtonStyle(active)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={active ? "true" : undefined}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

type SliderRuntimeProps = ReturnType<typeof readSliderProps> & {
  id?: string;
};

/** Only mounted inside <Puck> editor — may call useGetPuck. */
function SliderEditor(props: SliderRuntimeProps) {
  const getPuck = useGetPuck();
  const screenCount = Math.max(1, props.numberOfSlides || 1);
  const pageCount = screenCount;
  const activePage = clampScreenIndex(props.currentSlideIndex, screenCount);

  const dispatchSlideIndex = (nextPage: number) => {
    if (!props.id) return;
    const nextSlideIndex = nextPage + 1;
    const currentSlideIndex =
      clampScreenIndex(props.currentSlideIndex, screenCount) + 1;
    if (nextSlideIndex === currentSlideIndex) return;

    const puckApi = getPuck();
    const item = puckApi.getItemById(props.id);
    const selector = puckApi.getSelectorForId(props.id);
    if (!item || !selector) return;

    puckApi.dispatch({
      type: "replace",
      data: {
        ...item,
        props: {
          ...item.props,
          currentSlideIndex: nextSlideIndex,
        },
      },
      destinationIndex: selector.index,
      destinationZone: selector.zone,
    });
  };

  const onPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatchSlideIndex(
      prevScreenPage(activePage, pageCount, props.mode, props.rewind),
    );
  };

  const onNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatchSlideIndex(
      nextScreenPage(activePage, pageCount, props.mode, props.rewind),
    );
  };

  const onJumpTo = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatchSlideIndex(Math.max(0, Math.min(index, pageCount - 1)));
  };

  return (
    <SliderView
      {...props}
      isEditing
      activePage={activePage}
      visualTrackIndex={activePage}
      transitionEnabled
      onTrackTransitionEnd={() => {}}
      onPrev={onPrev}
      onNext={onNext}
      onJumpTo={onJumpTo}
      onHoverChange={() => {}}
    />
  );
}

function SliderPreview(props: SliderRuntimeProps) {
  const screenCount = Math.max(1, props.numberOfSlides || 1);
  const pageCount = screenCount;
  const [nav, dispatchNav] = useReducer(sliderNavReducer, {
    currentPage: 0,
    trackIndex: 1,
  });
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [isHovering, setIsHovering] = useState(false);

  const useLoopTrack = useLoopDirectionalTrack(
    props.mode,
    props.animation,
    pageCount,
    false,
  );
  const currentPage = nav.currentPage;
  const trackIndex = nav.trackIndex;
  const activePage = currentPage;
  const visualTrackIndex = useLoopTrack ? trackIndex : activePage;

  useEffect(() => {
    dispatchNav({ type: "reset", useLoopTrack });
    setTransitionEnabled(true);
  }, [pageCount, props.mode, props.animation, useLoopTrack]);

  useEffect(() => {
    dispatchNav({ type: "clamp", pageCount });
  }, [pageCount]);

  const goNext = useCallback(() => {
    dispatchNav({
      type: "next",
      useLoopTrack,
      pageCount,
      mode: props.mode,
      rewind: props.rewind,
    });
  }, [useLoopTrack, pageCount, props.mode, props.rewind]);

  const goPrev = useCallback(() => {
    dispatchNav({
      type: "prev",
      useLoopTrack,
      pageCount,
      mode: props.mode,
      rewind: props.rewind,
    });
  }, [useLoopTrack, pageCount, props.mode, props.rewind]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  useEffect(() => {
    if (!props.autoSlide || pageCount <= 1) return;
    if (props.pauseAutoplayOnHover && isHovering) return;
    const ms = Math.max(1, props.showEachSlideSeconds || 5) * 1000;
    const timer = setInterval(() => {
      goNextRef.current();
    }, ms);
    return () => clearInterval(timer);
  }, [
    props.autoSlide,
    pageCount,
    props.pauseAutoplayOnHover,
    isHovering,
    props.showEachSlideSeconds,
    useLoopTrack,
    props.mode,
    props.rewind,
  ]);

  const handleTrackTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (!useLoopTrack || !transitionEnabled) return;
    if (trackIndex === pageCount + 1) {
      setTransitionEnabled(false);
      dispatchNav({ type: "loop_wrap_forward" });
    } else if (trackIndex === 0) {
      setTransitionEnabled(false);
      dispatchNav({ type: "loop_wrap_backward", pageCount });
    }
  };

  useEffect(() => {
    if (transitionEnabled) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionEnabled(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [transitionEnabled]);

  const onPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    goPrev();
  };

  const onNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    goNext();
  };

  const onJumpTo = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatchNav({ type: "jump", index, useLoopTrack, pageCount });
  };

  return (
    <SliderView
      {...props}
      isEditing={false}
      activePage={activePage}
      visualTrackIndex={visualTrackIndex}
      transitionEnabled={transitionEnabled}
      onTrackTransitionEnd={handleTrackTransitionEnd}
      onPrev={onPrev}
      onNext={onNext}
      onJumpTo={onJumpTo}
      onHoverChange={setIsHovering}
    />
  );
}

export const Slider = withLayout(SliderInternal);

