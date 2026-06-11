export const ACCORDION_CONTENT_FADE_MS = 500;

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
  transition: transform ${ACCORDION_CONTENT_FADE_MS}ms ease;
}

.visbuild-accordion-icon--chevron-open {
  transform: rotate(90deg);
}

.visbuild-accordion-icon--plus {
  font-weight: 700;
}

.visbuild-accordion-icon--plus-open {
  transform: rotate(45deg);
}
`;
