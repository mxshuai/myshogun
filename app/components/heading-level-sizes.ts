/** Heading type (h1–h6) 对应的默认字号（px） */
export const HEADING_SIZE_BY_LEVEL: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 32,
  2: 24,
  3: 18.7,
  4: 16,
  5: 13.2,
  6: 12,
};

const LEGACY_SIZE_TO_PX: Record<string, number> = {
  xxxl: 56,
  xxl: 48,
  xl: 40,
  l: 32,
  m: 24,
  s: 20,
  xs: 16,
};

export function normalizeHeadingLevel(
  level: unknown
): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = Number(level);
  if (n >= 1 && n <= 6) return n as 1 | 2 | 3 | 4 | 5 | 6;
  return 1;
}

export function resolveHeadingFontSize(props: {
  fontSize?: number;
  level?: unknown;
  size?: string;
}): number {
  if (typeof props.fontSize === "number" && Number.isFinite(props.fontSize)) {
    return props.fontSize;
  }
  if (props.size && LEGACY_SIZE_TO_PX[props.size] != null) {
    return LEGACY_SIZE_TO_PX[props.size];
  }
  return HEADING_SIZE_BY_LEVEL[normalizeHeadingLevel(props.level)];
}
