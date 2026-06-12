import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { Components } from "./types";
import { Section } from "./Section";
import { withLayout } from "./Layout";
import { createPuckColorField } from "./ui/puck-color-field";
import {
  SLIDER_ARROW_LEFT_PATH,
  SLIDER_ARROW_RIGHT_PATH,
  SLIDER_ARROW_VIEWBOX,
  clampSelectedDotWidthPercent,
  selectedDotWidthPx,
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

const sliderFields = {
  mode: {
    type: "radio" as const,
    label: "Mode",
    options: [
      { label: "Slide", value: "slide" },
      { label: "Loop", value: "loop" },
    ],
  },
  rewind: {
    type: "radio" as const,
    label: "Rewind",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  numberOfSlides: {
    type: "number" as const,
    label: "Number of slides",
    min: 1,
    max: 20,
  },
  slidesPerPage: {
    type: "number" as const,
    label: "Slides per page",
    min: 1,
    max: 12,
  },
  currentSlideIndex: {
    type: "number" as const,
    label: "Current screen (for editing)",
    min: 0,
    max: 19,
  },
  animation: {
    type: "select" as const,
    label: "Animation",
    options: animationOptions,
  },
  autoSlide: {
    type: "radio" as const,
    label: "Auto Slide",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  showEachSlideSeconds: {
    type: "number" as const,
    label: "Show each slide for (seconds)",
    min: 1,
    max: 60,
  },
  pauseAutoplayOnHover: {
    type: "radio" as const,
    label: "Pause autoplay on hover",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  controlsOverContent: {
    type: "radio" as const,
    label: "Controls over content",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  showArrows: {
    type: "radio" as const,
    label: "Show arrows",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  arrowColor: createPuckColorField("Arrow color", "#777777"),
  arrowHeight: {
    type: "number" as const,
    label: "Arrow height",
    min: 12,
    max: 80,
  },
  arrowBackground: {
    type: "radio" as const,
    label: "Arrow background",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  showDots: {
    type: "radio" as const,
    label: "Show dots",
    options: [
      { label: "true", value: true },
      { label: "false", value: false },
    ],
  },
  selectedDotColor: createPuckColorField("Selected dot color", "#777777"),
  unselectedDotColor: createPuckColorField("Unselected dot color", "#999999"),
  dotsSize: {
    type: "number" as const,
    label: "Dots size",
    min: 4,
    max: 28,
  },
  selectedDotWidth: {
    type: "number" as const,
    label: "Selected dot width (%)",
    min: 100,
    step: 50,
  },
  dotsLocation: {
    type: "radio" as const,
    label: "Dots location",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
  spaceBetweenDots: {
    type: "number" as const,
    label: "Space between dots",
    min: 0,
    max: 40,
  },
  items: {
    type: "array" as const,
    label: "Slots",
    arrayFields: {
      slot: {
        type: "slot" as const,
        label: "Slot",
      },
    },
  },
} as ComponentConfig<Components["Slider"]>["fields"];

const SliderInternal: ComponentConfig<Components["Slider"]> = {
  fields: sliderFields,
  resolveData: (data) => {
    const props = data.props || {};
    const screenCount = Math.max(1, Math.min(20, Number(props.numberOfSlides) || 1));
    const existing = Array.isArray(props.items) ? props.items : [];
    let changed = false;

    if (screenCount !== Number(props.numberOfSlides)) {
      changed = true;
    }

    let slidesPerPage = Number(props.slidesPerPage);
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
    if (!Number.isFinite(currentSlideIndex)) currentSlideIndex = 0;
    if (currentSlideIndex < 0) {
      currentSlideIndex = 0;
      changed = true;
    }
    if (currentSlideIndex > screenCount - 1) {
      currentSlideIndex = Math.max(0, screenCount - 1);
      changed = true;
    }

    const clampedDotWidth = clampSelectedDotWidthPercent(props.selectedDotWidth);
    if (clampedDotWidth !== props.selectedDotWidth) {
      changed = true;
    }

    if (!changed) {
      return {};
    }

    return {
      props: {
        ...props,
        numberOfSlides: screenCount,
        slidesPerPage: clampedSpp,
        items,
        currentSlideIndex,
        selectedDotWidth: clampedDotWidth,
      },
    };
  },
  resolveFields: (data) => {
    const fields = { ...sliderFields } as any;
    // 侧栏不展示：长度由 numberOfSlides × slidesPerPage 自动维护，内容在画布 slot 内编辑
    delete fields.items;
    if (data.props?.mode === "loop") {
      delete fields.rewind;
    }
    if (!data.props?.autoSlide) {
      delete fields.showEachSlideSeconds;
      delete fields.pauseAutoplayOnHover;
    }
    const screenCount = Math.max(1, Math.min(20, Number(data.props?.numberOfSlides) || 1));
    if (fields.currentSlideIndex) {
      fields.currentSlideIndex = {
        ...fields.currentSlideIndex,
        max: Math.max(0, screenCount - 1),
      };
    }
    return fields;
  },
  defaultProps: {
    mode: "slide",
    rewind: true,
    numberOfSlides: 1,
    slidesPerPage: 1,
    currentSlideIndex: 0,
    animation: "slide-medium",
    autoSlide: false,
    showEachSlideSeconds: 5,
    pauseAutoplayOnHover: false,
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
    items: [{ slot: [] }],
  },
  render: ({
    mode,
    rewind,
    numberOfSlides,
    slidesPerPage,
    currentSlideIndex,
    animation,
    autoSlide,
    showEachSlideSeconds,
    pauseAutoplayOnHover,
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
    puck,
  }) => {
    const rawItems = (items || []) as unknown as SliderItem[];
    const effectiveItems = rawItems;
    /** 可滑动屏数（与点数、切换步长一致） */
    const screenCount = Math.max(1, numberOfSlides || 1);
    /** 单屏并列 slot 数（横向 Grid 列数） */
    const safeSlidesPerPage = Math.max(1, Math.min(12, slidesPerPage || 1));
    const pageCount = screenCount;
    const [currentPage, setCurrentPage] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    const isEditing = puck?.isEditing === true;
    const maxScreenIndexForEdit = Math.max(0, screenCount - 1);
    const clampedScreenIndex = Math.max(
      0,
      Math.min(currentSlideIndex ?? 0, maxScreenIndexForEdit)
    );
    const activePage = isEditing ? clampedScreenIndex : currentPage;

    useEffect(() => {
      if (currentPage > pageCount - 1) {
        setCurrentPage(Math.max(0, pageCount - 1));
      }
    }, [currentPage, pageCount]);

    useEffect(() => {
      if (isEditing || !autoSlide || pageCount <= 1) return;
      if (pauseAutoplayOnHover && isHovering) return;
      const ms = Math.max(1, showEachSlideSeconds || 5) * 1000;
      const timer = setInterval(() => {
        setCurrentPage((prev) => {
          const next = prev + 1;
          if (next <= pageCount - 1) return next;
          if (mode === "loop") return 0;
          return rewind ? 0 : prev;
        });
      }, ms);
      return () => clearInterval(timer);
    }, [
      isEditing,
      autoSlide,
      pageCount,
      pauseAutoplayOnHover,
      isHovering,
      showEachSlideSeconds,
      mode,
      rewind,
    ]);

    const transitionDuration = animation === "slide-slow" ? "800ms" : animation === "slide-fast" ? "220ms" : "450ms";
    const isSlideAnimation =
      animation === "slide-slow" || animation === "slide-medium" || animation === "slide-fast";

    /** 每屏一行：第 p 屏对应扁平 items 中下标 [p*spp, (p+1)*spp) */
    const pages = useMemo(() => {
      const chunks: SliderItem[][] = [];
      for (let p = 0; p < screenCount; p++) {
        const row: SliderItem[] = [];
        for (let c = 0; c < safeSlidesPerPage; c++) {
          row.push(effectiveItems[p * safeSlidesPerPage + c]);
        }
        chunks.push(row);
      }
      return chunks;
    }, [effectiveItems, screenCount, safeSlidesPerPage]);

    const jumpTo = (index: number) => {
      const next = Math.max(0, Math.min(index, pageCount - 1));
      setCurrentPage(next);
    };

    const prev = () => {
      setCurrentPage((p) => {
        if (p > 0) return p - 1;
        return mode === "loop" || rewind ? pageCount - 1 : p;
      });
    };

    const next = () => {
      setCurrentPage((p) => {
        if (p < pageCount - 1) return p + 1;
        return mode === "loop" || rewind ? 0 : p;
      });
    };

    const dotsJustify =
      dotsLocation === "left" ? "flex-start" : dotsLocation === "right" ? "flex-end" : "center";

    const arrowButtonStyle = (side: "left" | "right"): CSSProperties => ({
      border: "none",
      cursor: isEditing ? "default" : "pointer",
      flexShrink: 0,
      width: arrowHeight + 8,
      height: arrowHeight + 8,
      borderRadius: 999,
      background: arrowBackground ? "rgba(0,0,0,0.35)" : "transparent",
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: isEditing ? "none" : "auto",
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

    if (effectiveItems.length === 0) {
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
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
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
              <button
                type="button"
                disabled={isEditing}
                aria-disabled={isEditing}
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                style={arrowButtonStyle("left")}
                aria-label="Previous slide"
              >
                <SliderArrowIcon side="left" color={arrowColor} size={arrowHeight} />
              </button>
            ) : null}

            <div
              style={{
                flex: controlsOverContent ? undefined : 1,
                minWidth: 0,
                width: controlsOverContent ? "100%" : undefined,
                overflow: "hidden",
                borderRadius: 8,
              }}
            >
            {isSlideAnimation ? (
              <div
                style={{
                  display: "flex",
                  width: `${pages.length * 100}%`,
                  transform: `translateX(-${(activePage * 100) / pages.length}%)`,
                  transition: isEditing ? "none" : `transform ${transitionDuration} ease`,
                }}
              >
                {pages.map((pageItems, pageIndex) => (
                  <div
                    key={`slider-page-${pageIndex}`}
                    style={{
                      width: `${100 / pages.length}%`,
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
              <div
                key={`non-slide-${activePage}-${animation}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${safeSlidesPerPage}, minmax(0, 1fr))`,
                  gap: 12,
                  opacity: 1,
                  transform:
                    animation.indexOf("left") >= 0
                      ? "translateX(-6px)"
                      : animation.indexOf("right") >= 0
                      ? "translateX(6px)"
                      : animation.indexOf("up") >= 0
                      ? "translateY(-6px)"
                      : animation.indexOf("down") >= 0
                      ? "translateY(6px)"
                      : animation.indexOf("zoom") >= 0
                      ? "scale(0.98)"
                      : "none",
                  transition: animation === "none" ? "none" : "all 320ms ease",
                }}
              >
                {(pages[activePage] || []).map((item, itemIndex) => {
                  const pageSlot = item?.slot;
                  return (
                    <div key={`slider-item-non-slide-${activePage}-${itemIndex}`}>
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
            )}
            </div>

            {showArrows ? (
              <button
                type="button"
                disabled={isEditing}
                aria-disabled={isEditing}
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                style={arrowButtonStyle("right")}
                aria-label="Next slide"
              >
                <SliderArrowIcon side="right" color={arrowColor} size={arrowHeight} />
              </button>
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
                  <button
                    key={`dot-${idx}`}
                    type="button"
                    disabled={isEditing}
                    aria-disabled={isEditing}
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpTo(idx);
                    }}
                    style={{
                      border: "none",
                      cursor: isEditing ? "default" : "pointer",
                      pointerEvents: isEditing ? "none" : "auto",
                      borderRadius: 999,
                      height: dotsSize,
                      width: active
                        ? selectedDotWidthPx(dotsSize, selectedDotWidth)
                        : dotsSize,
                      background: active ? selectedDotColor : unselectedDotColor,
                      transition: "all 220ms ease",
                    }}
                  />
                );
              })}
            </div>
          ) : null}

        </div>
      </Section>
    );
  },
};

export const Slider = withLayout(SliderInternal);

