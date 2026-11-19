/** TipTap / Puck 导出：空 <p> 写入 &nbsp;，店面前台保留行高；编辑态存盘不改。 */

const NBSP_ENTITY = "&nbsp;";
const NBSP_CHARS = /^(?:&nbsp;|&#160;|&#xA0;|\u00a0|\s)*$/i;

/** 仅 br / 空白标签，无可见文字 */
function isBrOnlyContent(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed) return true;
  return /^(?:<br\s*\/?>|<br[^>]*\/?>)(?:\s*(?:<br\s*\/?>|<br[^>]*\/?>))*$/i.test(
    trimmed,
  );
}

/** 去掉标签后是否仅剩 nbsp 类空白（幂等：已是 nbsp 不再改） */
function isNbspOnlyContent(inner: string): boolean {
  const text = inner
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return false;
  return NBSP_CHARS.test(text);
}

/** 去标签 + 实体归一后无可见文字，且无非空媒体 */
function paragraphInnerIsEmpty(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed) return true;
  if (isBrOnlyContent(trimmed)) return true;
  if (isNbspOnlyContent(trimmed)) return false;

  if (/<img\b/i.test(trimmed)) return false;
  if (/<(?:iframe|video|audio|svg)\b/i.test(trimmed)) return false;

  const text = trimmed
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/\u00a0/g, " ")
    .trim();
  return text === "";
}

const EMPTY_P_RE = /<p([^>]*)>([\s\S]*?)<\/p>/gi;

/**
 * 导出前将空段落变为 <p…>&nbsp;</p>，保留 p 上的 attributes。
 */
export function normalizeEmptyParagraphsForExport(html: string): string {
  return html.replace(EMPTY_P_RE, (match, attrs: string, inner: string) => {
    if (!paragraphInnerIsEmpty(inner)) return match;
    const attrPart = attrs ?? "";
    return `<p${attrPart}>${NBSP_ENTITY}</p>`;
  });
}
