export const ACCORDION_CONTENT_FADE_MS = 500;

export const ACCORDION_CARET_FA_CLASS = "fa fa-caret-down";
export const ACCORDION_PLUS_FA_CLASS = "fa fa-plus";

/** 侧栏 Active Accordion Index 为 1-based */
export function clampCurrentAccordionIndex(
  oneBased: number | undefined,
  itemCount: number
): number {
  const count = Math.max(1, itemCount);
  const raw = oneBased ?? 1;
  return Math.min(Math.max(1, Math.floor(raw)), count);
}

export const ACCORDION_EXPORT_CSS = `/* Accordion */
@keyframes visbuild-accordion-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.visbuild-accordion-content-panel {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height ${ACCORDION_CONTENT_FADE_MS}ms ease, opacity ${ACCORDION_CONTENT_FADE_MS}ms ease;
}

.visbuild-accordion-content-panel--open {
  max-height: 4000px;
  opacity: 1;
}

.visbuild-accordion-content-inner {
  animation: visbuild-accordion-fade-in ${ACCORDION_CONTENT_FADE_MS}ms ease;
}

.visbuild-accordion-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 8px;
  user-select: none;
  color: inherit;
  transition: transform ${ACCORDION_CONTENT_FADE_MS}ms ease;
}

.visbuild-accordion-icon .fa {
  line-height: 1;
}

/* Chevron: fa-caret-down 展开，逆时针 90° 为收起 */
.visbuild-accordion-icon--caret {
  transform: rotate(-90deg);
}

.visbuild-accordion-icon--caret.visbuild-accordion-icon--open {
  transform: rotate(0deg);
}

/* Plus: fa-plus 收起，顺时针 405° 为展开 */
.visbuild-accordion-icon--plus {
  transform: rotate(0deg);
}

.visbuild-accordion-icon--plus.visbuild-accordion-icon--open {
  transform: rotate(405deg);
}
`;
