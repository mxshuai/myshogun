export type ImageAnimationDelay = "none" | "1s" | "2s" | "3s" | "4s" | "5s";
export type ImageAnimationDuration =
  | "default"
  | "faster"
  | "fast"
  | "slow"
  | "slower";
export type ImageAnimationIteration = "once" | "infinite" | "2" | "3";

export type ImageAnimationAdvanced = {
  delay: ImageAnimationDelay;
  duration: ImageAnimationDuration;
  iterationCount: ImageAnimationIteration;
  triggerOnce: boolean;
};

export type ImageAnimationSlot = {
  animation: string;
  advanced?: ImageAnimationAdvanced;
};

export type ImageAnimationsGroup = {
  scrollInViewAnimation: string;
  scrollInViewAdvanced?: ImageAnimationAdvanced;
  mouseOverAnimation: string;
  mouseOverAdvanced?: ImageAnimationAdvanced;
};

export const defaultImageAnimationAdvanced: ImageAnimationAdvanced = {
  delay: "none",
  duration: "default",
  iterationCount: "once",
  triggerOnce: false,
};

export const defaultImageAnimations: ImageAnimationsGroup = {
  scrollInViewAnimation: "none",
  mouseOverAnimation: "none",
};

export function scrollInViewSlot(
  group: ImageAnimationsGroup,
): ImageAnimationSlot {
  return normalizeAnimationSlot({
    animation: group.scrollInViewAnimation,
    advanced: group.scrollInViewAdvanced,
  });
}

export function mouseOverSlot(group: ImageAnimationsGroup): ImageAnimationSlot {
  return normalizeAnimationSlot({
    animation: group.mouseOverAnimation,
    advanced: group.mouseOverAdvanced,
  });
}

export const scrollInViewAnimationOptions = [
  { label: "No Animation", value: "none" },
  { label: "Fade In", value: "fadeIn" },
  { label: "Fade In Down", value: "fadeInDown" },
  { label: "Fade In Left", value: "fadeInLeft" },
  { label: "Fade In Right", value: "fadeInRight" },
  { label: "Fade In Up", value: "fadeInUp" },
  { label: "Fade Out", value: "fadeOut" },
  { label: "Fade Out Down", value: "fadeOutDown" },
  { label: "Fade Out Left", value: "fadeOutLeft" },
  { label: "Fade Out Right", value: "fadeOutRight" },
  { label: "Fade Out Up", value: "fadeOutUp" },
  { label: "Zoom In", value: "zoomIn" },
  { label: "Zoom In Down", value: "zoomInDown" },
  { label: "Zoom In Left", value: "zoomInLeft" },
  { label: "Zoom In Right", value: "zoomInRight" },
  { label: "Zoom In Up", value: "zoomInUp" },
  { label: "Zoom Out", value: "zoomOut" },
  { label: "Zoom Out Down", value: "zoomOutDown" },
  { label: "Zoom Out Left", value: "zoomOutLeft" },
  { label: "Zoom Out Right", value: "zoomOutRight" },
  { label: "Zoom Out Up", value: "zoomOutUp" },
] as const;

export const mouseOverAnimationOptions = [
  { label: "No Animation", value: "none" },
  { label: "Bounce", value: "bounce" },
  { label: "Flash", value: "flash" },
  { label: "Pulse", value: "pulse" },
  { label: "Rubber Band", value: "rubberBand" },
  { label: "Head Shake", value: "headShake" },
  { label: "Swing", value: "swing" },
  { label: "Tada", value: "tada" },
  { label: "Wobble", value: "wobble" },
  { label: "Jello", value: "jello" },
  { label: "Heart Beat", value: "heartBeat" },
] as const;

export const imageAnimationDelayOptions = [
  { label: "None", value: "none" },
  { label: "1 second", value: "1s" },
  { label: "2 seconds", value: "2s" },
  { label: "3 seconds", value: "3s" },
  { label: "4 seconds", value: "4s" },
  { label: "5 seconds", value: "5s" },
] as const;

export const imageAnimationDurationOptions = [
  { label: "Default (1 second)", value: "default" },
  { label: "Faster", value: "faster" },
  { label: "Fast", value: "fast" },
  { label: "Slow", value: "slow" },
  { label: "Slower", value: "slower" },
] as const;

export const imageAnimationIterationOptions = [
  { label: "Once", value: "once" },
  { label: "Infinite", value: "infinite" },
  { label: "Twice", value: "2" },
  { label: "3 times", value: "3" },
] as const;

const ENTRANCE_PREFIXES = ["fadeIn", "zoomIn"] as const;

export function isEntranceAnimation(animation: string): boolean {
  if (animation === "none") return false;
  return ENTRANCE_PREFIXES.some((p) => animation.startsWith(p));
}

function animateNameClass(animation: string): string {
  return `animate__${animation}`;
}

function modifierClasses(advanced?: ImageAnimationAdvanced): string[] {
  const adv = { ...defaultImageAnimationAdvanced, ...advanced };
  const classes: string[] = [];
  if (adv.delay !== "none") {
    classes.push(`animate__delay-${adv.delay}`);
  }
  if (adv.duration !== "default") {
    classes.push(`animate__${adv.duration}`);
  }
  if (adv.iterationCount === "infinite") {
    classes.push("animate__infinite");
  } else if (adv.iterationCount === "2" || adv.iterationCount === "3") {
    classes.push(`animate__repeat-${adv.iterationCount}`);
  }
  return classes;
}

export function buildAnimateClasses(
  animation: string,
  advanced?: ImageAnimationAdvanced,
): string[] {
  if (!animation || animation === "none") return [];
  return [
    "animate__animated",
    animateNameClass(animation),
    ...modifierClasses(advanced),
  ];
}

export function normalizeAnimationSlot(
  slot: Partial<ImageAnimationSlot> | undefined,
): ImageAnimationSlot {
  const animation =
    typeof slot?.animation === "string" && slot.animation.trim()
      ? slot.animation
      : "none";
  if (animation === "none") {
    return { animation: "none" };
  }
  return {
    animation,
    advanced: {
      ...defaultImageAnimationAdvanced,
      ...slot?.advanced,
    },
  };
}

type LegacyAnimations = {
  scrollInView?: Partial<ImageAnimationSlot>;
  mouseOver?: Partial<ImageAnimationSlot>;
};

export function normalizeImageAnimations(
  raw: Partial<ImageAnimationsGroup> | LegacyAnimations | undefined,
): ImageAnimationsGroup {
  const legacy = raw as LegacyAnimations | undefined;
  if (legacy?.scrollInView && typeof legacy.scrollInView === "object") {
    const scroll = normalizeAnimationSlot(legacy.scrollInView);
    const mouse = normalizeAnimationSlot(legacy.mouseOver);
    return {
      scrollInViewAnimation: scroll.animation,
      scrollInViewAdvanced: scroll.advanced,
      mouseOverAnimation: mouse.animation,
      mouseOverAdvanced: mouse.advanced,
    };
  }

  const flat = raw as Partial<ImageAnimationsGroup> | undefined;
  const scrollAnimation =
    typeof flat?.scrollInViewAnimation === "string" &&
    flat.scrollInViewAnimation.trim()
      ? flat.scrollInViewAnimation
      : "none";
  const mouseAnimation =
    typeof flat?.mouseOverAnimation === "string" && flat.mouseOverAnimation.trim()
      ? flat.mouseOverAnimation
      : "none";

  return {
    scrollInViewAnimation: scrollAnimation,
    scrollInViewAdvanced:
      scrollAnimation !== "none"
        ? {
            ...defaultImageAnimationAdvanced,
            ...flat?.scrollInViewAdvanced,
          }
        : undefined,
    mouseOverAnimation: mouseAnimation,
    mouseOverAdvanced:
      mouseAnimation !== "none"
        ? {
            ...defaultImageAnimationAdvanced,
            ...flat?.mouseOverAdvanced,
          }
        : undefined,
  };
}

export function slotHasAnimation(slot: ImageAnimationSlot): boolean {
  return slot.animation !== "none";
}

export function imageAnimationsActive(animations: ImageAnimationsGroup): boolean {
  return (
    animations.scrollInViewAnimation !== "none" ||
    animations.mouseOverAnimation !== "none"
  );
}

const MOUSE_HOVER_DURATION: Record<ImageAnimationDuration, string> = {
  default: "1s",
  faster: "0.5s",
  fast: "0.8s",
  slow: "2s",
  slower: "3s",
};

const MOUSE_HOVER_ITERATION: Record<ImageAnimationIteration, string> = {
  once: "1",
  infinite: "infinite",
  "2": "2",
  "3": "3",
};

export function mouseOverHoverModifierClass(animation: string): string {
  if (!animation || animation === "none") return "";
  return `visbuild-image--mouse-${animation}`;
}

export function mouseOverHoverCssVars(
  advanced?: ImageAnimationAdvanced,
): Record<string, string> {
  const adv = { ...defaultImageAnimationAdvanced, ...advanced };
  return {
    "--visbuild-mouse-anim-duration": MOUSE_HOVER_DURATION[adv.duration],
    "--visbuild-mouse-anim-delay":
      adv.delay === "none" ? "0ms" : adv.delay,
    "--visbuild-mouse-anim-iteration": MOUSE_HOVER_ITERATION[adv.iterationCount],
  };
}

export const IMAGE_MOUSE_HOVER_CSS = mouseOverAnimationOptions
  .filter((option) => option.value !== "none")
  .map(
    (option) => `.visbuild-image.visbuild-image--mouse-${option.value}:hover {
  animation-name: ${option.value};
  animation-duration: var(--visbuild-mouse-anim-duration, 1s);
  animation-delay: var(--visbuild-mouse-anim-delay, 0ms);
  animation-iteration-count: var(--visbuild-mouse-anim-iteration, 1);
  animation-fill-mode: both;
}`,
  )
  .join("\n\n");

/** JSON for data attributes in exported HTML */
export function serializeAnimationSlotForData(
  slot: ImageAnimationSlot,
): string | null {
  if (!slotHasAnimation(slot)) return null;
  return JSON.stringify({
    animation: slot.animation,
    advanced: slot.advanced ?? defaultImageAnimationAdvanced,
  });
}