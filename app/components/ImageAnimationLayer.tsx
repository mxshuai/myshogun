import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import {
  buildAnimateClasses,
  isEntranceAnimation,
  mouseOverHoverCssVars,
  mouseOverHoverModifierClass,
  mouseOverSlot,
  normalizeImageAnimations,
  scrollInViewSlot,
  slotHasAnimation,
  type ImageAnimationsGroup,
} from "./image-animation-config";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function ImageAnimationHost({
  animations,
  isEditing,
  className,
  style,
  children,
}: {
  animations: ImageAnimationsGroup;
  isEditing: boolean;
  className: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollClasses, setScrollClasses] = useState<string>("");
  const [mouseOnceClasses, setMouseOnceClasses] = useState<string>("");
  const mouseOnceFiredRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  const normalized = normalizeImageAnimations(animations);
  const scroll = scrollInViewSlot(normalized);
  const mouse = mouseOverSlot(normalized);
  const scrollAdv = scroll.advanced;

  const mouseActive = slotHasAnimation(mouse) && !reducedMotion;
  const useCssMouseHover = mouseActive && !mouse.advanced?.triggerOnce;
  const useJsMouseOnce = mouseActive && mouse.advanced?.triggerOnce === true;

  const mouseHoverClass = useCssMouseHover
    ? mouseOverHoverModifierClass(mouse.animation)
    : "";

  const mouseHoverStyle = mouseActive
    ? (mouseOverHoverCssVars(mouse.advanced) as CSSProperties)
    : {};

  useEffect(() => {
    setScrollClasses("");
    if (isEditing || reducedMotion || !slotHasAnimation(scroll)) return;
    const el = ref.current;
    if (!el) return;

    const classes = buildAnimateClasses(scroll.animation, scrollAdv);
    const classNameStr = classes.join(" ");
    const pending = isEntranceAnimation(scroll.animation);
    if (pending) {
      el.classList.add("visbuild-image--scroll-pending");
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setScrollClasses(classNameStr);
          el.classList.remove("visbuild-image--scroll-pending");
          if (scrollAdv?.triggerOnce) {
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.classList.remove("visbuild-image--scroll-pending");
    };
  }, [
    isEditing,
    reducedMotion,
    scroll.animation,
    scrollAdv?.delay,
    scrollAdv?.duration,
    scrollAdv?.iterationCount,
    scrollAdv?.triggerOnce,
  ]);

  useEffect(() => {
    mouseOnceFiredRef.current = false;
    setMouseOnceClasses("");
  }, [mouse.animation, mouse.advanced?.triggerOnce]);

  const onMouseEnter = () => {
    if (!useJsMouseOnce || mouseOnceFiredRef.current) return;
    mouseOnceFiredRef.current = true;
    setMouseOnceClasses(
      buildAnimateClasses(mouse.animation, mouse.advanced).join(" "),
    );
  };

  const mergedClass = [
    className,
    scrollClasses,
    mouseHoverClass,
    mouseOnceClasses,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={ref}
      className={mergedClass}
      style={{ ...style, ...mouseHoverStyle }}
      onMouseEnter={useJsMouseOnce ? onMouseEnter : undefined}
    >
      {children}
    </div>
  );
}