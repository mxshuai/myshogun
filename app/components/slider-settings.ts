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
    mode: (main.mode ?? source.mode ?? "slide") as SliderMainSettings["mode"],
    rewind: (main.rewind ?? source.rewind) !== false,
    numberOfSlides: Number(main.numberOfSlides ?? source.numberOfSlides) || 1,
    slidesPerPage: Number(main.slidesPerPage ?? source.slidesPerPage) || 1,
    animation: main.animation ?? source.animation ?? "slide-medium",
    autoSlide: (main.autoSlide ?? source.autoSlide) === true,
    showEachSlideSeconds:
      Number(main.showEachSlideSeconds ?? source.showEachSlideSeconds) || 5,
    pauseAutoplayOnHover:
      (main.pauseAutoplayOnHover ?? source.pauseAutoplayOnHover) === true,
    controlsOverContent:
      (controls.controlsOverContent ?? source.controlsOverContent) === true,
    showArrows: (controls.showArrows ?? source.showArrows) !== false,
    arrowColor: controls.arrowColor ?? source.arrowColor ?? "#777777",
    arrowHeight: Number(controls.arrowHeight ?? source.arrowHeight) || 35,
    arrowBackground: (controls.arrowBackground ?? source.arrowBackground) === true,
    showDots: (controls.showDots ?? source.showDots) !== false,
    selectedDotColor: controls.selectedDotColor ?? source.selectedDotColor ?? "#777777",
    unselectedDotColor:
      controls.unselectedDotColor ?? source.unselectedDotColor ?? "#999999",
    dotsSize: Number(controls.dotsSize ?? source.dotsSize) || 14,
    selectedDotWidth: controls.selectedDotWidth ?? source.selectedDotWidth ?? 100,
    dotsLocation: (controls.dotsLocation ??
      source.dotsLocation ??
      "center") as SliderControlsSettings["dotsLocation"],
    spaceBetweenDots: Number(controls.spaceBetweenDots ?? source.spaceBetweenDots) || 8,
    currentSlideIndex: Number(source.currentSlideIndex) || 1,
    items: Array.isArray(source.items) ? source.items : [],
  };
}
