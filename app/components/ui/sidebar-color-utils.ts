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

/** color input 仅接受 #rrggbb */
export function toColorInputValue(
  raw: string | undefined | null,
  fallback: string
): string {
  return normalizeHexColor(raw, fallback);
}
