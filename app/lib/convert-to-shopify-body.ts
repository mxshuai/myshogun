import type { Data } from "@puckeditor/core";

import { generateCSS, generateComponentHTMLForExport } from "./convert-to-html";

/** Shopify Page `body`：片段 HTML + 内联样式 */
export function convertToShopifyBody(data: Data): string {
  const components = data.content || [];
  let html = "<style>\n";
  html += generateCSS();
  html += "\n</style>\n<div class=\"visbuild-page\">\n";
  for (const component of components) {
    html += generateComponentHTMLForExport(component);
  }
  html += "</div>";
  return html;
}
