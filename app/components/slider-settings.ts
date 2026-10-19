export type SliderMainSettings = {
  mode: "slide" | "loop";
  rewind: boolean;
  numberOfSlides: number;
  slidesPerPage: number;
  animation: string;
  autoSlide: boolean;
  showEachSlideSeconds: number;
  pauseAutoplayOnHover: boolean;
};

export type SliderControlsSettings = {
  controlsOverContent: boolean;
  showArrows: boolean;
  arrowColor: string;
  arrowHeight: number;
  arrowBackground: boolean;
  showDots: boolean;
  selectedDotColor: string;
  unselectedDotColor: string;
  dotsSize: number;
  selectedDotWidth: number;
  dotsLocation: "left" | "center" | "right";
  spaceBetweenDots: number;
};

export function readSliderProps(props: Record<string, any> | undefined) {
  const source = props ?? {};
  const main = source.main ?? {};
  const controls = source.controls ?? {};
  return {
    mode: (main.mode ?? "slide") as SliderMainSettings["mode"],
    rewind: main.rewind !== false,
    numberOfSlides: Number(main.numberOfSlides) || 1,
    slidesPerPage: Number(main.slidesPerPage) || 1,
    animation: main.animation ?? "slide-medium",
    autoSlide: main.autoSlide === true,
    showEachSlideSeconds: Number(main.showEachSlideSeconds) || 5,
    pauseAutoplayOnHover: main.pauseAutoplayOnHover === true,
    controlsOverContent: controls.controlsOverContent === true,
    showArrows: controls.showArrows !== false,
    arrowColor: controls.arrowColor ?? "#777777",
    arrowHeight: Number(controls.arrowHeight) || 35,
    arrowBackground: controls.arrowBackground === true,
    showDots: controls.showDots !== false,
    selectedDotColor: controls.selectedDotColor ?? "#777777",
    unselectedDotColor: controls.unselectedDotColor ?? "#999999",
    dotsSize: Number(controls.dotsSize) || 14,
    selectedDotWidth: controls.selectedDotWidth ?? 100,
    dotsLocation: (controls.dotsLocation ??
      "center") as SliderControlsSettings["dotsLocation"],
    spaceBetweenDots: Number(controls.spaceBetweenDots) || 8,
    currentSlideIndex: Number(source.currentSlideIndex) || 1,
    items: Array.isArray(source.items) ? source.items : [],
  };
}
