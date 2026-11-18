import type { Data } from "@puckeditor/core";

import {
  buildAnimateClasses,
  imageAnimationsActive,
  isEntranceAnimation,
  mouseOverHoverCssVars,
  mouseOverHoverModifierClass,
  mouseOverSlot,
  normalizeImageAnimations,
  scrollInViewSlot,
  serializeAnimationSlotForData,
  slotHasAnimation,
  type ImageAnimationsGroup,
} from "~/components/image-animation-config";

const ANIMATE_CSS_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css";

export function dataUsesImageAnimations(data: Data): boolean {
  const walk = (items: unknown[]): boolean => {
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const row = item as { type?: string; props?: Record<string, unknown> };
      if (row.type === "Image") {
        const animations = normalizeImageAnimations(
          row.props?.animations as Partial<ImageAnimationsGroup> | undefined,
        );
        if (imageAnimationsActive(animations)) return true;
      }
      const props = row.props ?? {};
      for (const value of Object.values(props)) {
        if (Array.isArray(value) && walk(value)) return true;
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          "type" in (value as object)
        ) {
          if (walk([value])) return true;
        }
      }
    }
    return false;
  };
  if (walk(data.content ?? [])) return true;
  const zones = data.zones ?? {};
  for (const zoneItems of Object.values(zones)) {
    if (Array.isArray(zoneItems) && walk(zoneItems)) return true;
  }
  return false;
}

export function animateCssImportLine(): string {
  return `@import url("${ANIMATE_CSS_CDN}");`;
}

export function imageAnimationDataAttributes(flat: {
  animations: ImageAnimationsGroup;
}): { attrs: string; extraClass: string; styleExtra: string } {
  const animations = flat.animations;
  let attrs = "";
  const scrollData = serializeAnimationSlotForData(scrollInViewSlot(animations));
  if (scrollData) {
    attrs += ` data-visbuild-animate-scroll="${escapeAttr(scrollData)}"`;
  }

  const scroll = scrollInViewSlot(animations);
  const mouse = mouseOverSlot(animations);
  let extraClass = "";
  if (
    slotHasAnimation(scroll) &&
    isEntranceAnimation(scroll.animation)
  ) {
    extraClass += " visbuild-image--scroll-pending";
  }
  if (slotHasAnimation(mouse)) {
    if (mouse.advanced?.triggerOnce) {
      const hoverData = serializeAnimationSlotForData(mouse);
      if (hoverData) {
        attrs += ` data-visbuild-animate-hover-once="${escapeAttr(hoverData)}"`;
      }
    } else {
      extraClass += ` ${mouseOverHoverModifierClass(mouse.animation)}`;
    }
  }

  const styleVars = slotHasAnimation(mouse)
    ? mouseOverHoverCssVars(mouse.advanced)
    : {};
  const styleExtra = Object.entries(styleVars)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");

  return { attrs, extraClass, styleExtra };
}

function escapeAttr(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function imageAnimationShopifyScript(): string {
  return `<script>
(function () {
  function parseSlot(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function classesFor(slot) {
    if (!slot || !slot.animation || slot.animation === "none") return "";
    var map = {
      animation: slot.animation,
      advanced: slot.advanced || {}
    };
    var adv = map.advanced;
    var list = ["animate__animated", "animate__" + map.animation];
    if (adv.delay && adv.delay !== "none") list.push("animate__delay-" + adv.delay);
    if (adv.duration && adv.duration !== "default") list.push("animate__" + adv.duration);
    if (adv.iterationCount === "infinite") list.push("animate__infinite");
  else if (adv.iterationCount === "2" || adv.iterationCount === "3") list.push("animate__repeat-" + adv.iterationCount);
    return list.join(" ");
  }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  document.querySelectorAll("[data-visbuild-animate-scroll]").forEach(function (el) {
    var slot = parseSlot(el.getAttribute("data-visbuild-animate-scroll"));
    if (!slot) return;
    var cls = classesFor(slot);
    if (!cls) return;
    var once = !!(slot.advanced && slot.advanced.triggerOnce);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        el.classList.remove("visbuild-image--scroll-pending");
        cls.split(" ").forEach(function (c) { if (c) el.classList.add(c); });
        if (once) io.unobserve(el);
      });
    }, { threshold: 0.15 });
    io.observe(el);
  });

  document.querySelectorAll("[data-visbuild-animate-hover-once]").forEach(function (el) {
    var slot = parseSlot(el.getAttribute("data-visbuild-animate-hover-once"));
    if (!slot) return;
    var cls = classesFor(slot);
    if (!cls) return;
  var consumed = false;
    el.addEventListener("mouseenter", function () {
      if (consumed) return;
      consumed = true;
      cls.split(" ").forEach(function (c) { if (c) el.classList.add(c); });
    });
  });
})();
</script>`;
}

/** Used in tests / server render parity */
export function exportAnimateClassString(
  animation: string,
  advanced?: ImageAnimationsGroup["scrollInViewAdvanced"],
): string {
  return buildAnimateClasses(animation, advanced).join(" ");
}