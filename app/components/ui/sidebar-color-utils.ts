/** 将侧栏/导出用的颜色值规范为 #rrggbb（供 color input 与样式共用） */
export function normalizeHexColor(
  raw: string | undefined | null,
  fallback: string
): string {
  const fb = normalizeFallback(fallback);
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return fb;

  let s = trimmed;
  if (!s.startsWith("#")) s = `#${s}`;

  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1];
    const g = s[2];
    const b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    return s.toLowerCase();
  }

  return fb;
}

function normalizeFallback(fallback: string): string {
  const t = fallback.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    return normalizeHexColor(t, "#000000");
  }
  if (/^#[0-9a-fA-F]{6}$/.test(t)) {
    return t.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(t)) {
    return `#${t.toLowerCase()}`;
  }
  return "#000000";
}

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function rgbToHsv(r: number, g: number, b: number): {
  h: number;
  s: number;
  v: number;
} {
  const rn = clampByte(r) / 255;
  const gn = clampByte(g) / 255;
  const bn = clampByte(b) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function hsvToRgb(h: number, s: number, v: number): {
  r: number;
  g: number;
  b: number;
} {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const val = Math.max(0, Math.min(1, v));
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: clampByte((r + m) * 255),
    g: clampByte((g + m) * 255),
    b: clampByte((b + m) * 255),
  };
}

export type ParsedSidebarColor = {
  r: number;
  g: number;
  b: number;
  /** 0–100 */
  a: number;
  hex: string;
};

function alphaFromByte(byte: number): number {
  return Math.max(0, Math.min(100, Math.round((clampByte(byte) / 255) * 100)));
}

export function parseSidebarColor(
  raw: string | undefined | null,
  fallback: string,
): ParsedSidebarColor {
  const fb = normalizeHexColor(fallback, "#000000");
  const trimmed = (raw ?? "").trim();
  const rgba = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i,
  );
  if (rgba) {
    const r = clampByte(Number(rgba[1]));
    const g = clampByte(Number(rgba[2]));
    const b = clampByte(Number(rgba[3]));
    const alphaPart = rgba[4];
    const a =
      alphaPart == null
        ? 100
        : Number(alphaPart) <= 1
          ? Math.round(Number(alphaPart) * 100)
          : Math.round(Number(alphaPart));
    return { r, g, b, a: Math.max(0, Math.min(100, a)), hex: rgbToHex(r, g, b).slice(1) };
  }

  let s = trimmed;
  if (s && !s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const hex = normalizeHexColor(s, fb);
    return { ...hexToRgb(hex), a: 100, hex: hex.slice(1) };
  }
  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    const hex = s.toLowerCase();
    return { ...hexToRgb(hex), a: 100, hex: hex.slice(1) };
  }
  if (/^#[0-9a-fA-F]{8}$/.test(s)) {
    const hex = s.toLowerCase();
    return {
      ...hexToRgb(hex.slice(0, 7)),
      a: alphaFromByte(parseInt(hex.slice(7, 9), 16)),
      hex: hex.slice(1, 7),
    };
  }

  const fallbackHex = normalizeHexColor(fb, "#000000");
  return { ...hexToRgb(fallbackHex), a: 100, hex: fallbackHex.slice(1) };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** 不透明时存 #rrggbb，带透明度时存 #rrggbbaa。 */
export function formatSidebarColor(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  const hex = rgbToHex(color.r, color.g, color.b);
  const alpha = Math.max(0, Math.min(100, Math.round(color.a)));
  if (alpha >= 100) return hex;
  const byte = Math.round((alpha / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${byte}`;
}

/** 取不透明的 #rrggbb，供需要纯色的地方使用。 */
export function toColorInputValue(
  raw: string | undefined | null,
  fallback: string
): string {
  return `#${parseSidebarColor(raw, fallback).hex}`;
}
