import type { Data } from "@puckeditor/core";

import { dataUsesImageAnimations, imageAnimationShopifyScript } from "./image-animation-export";
import { generateCSS, generateComponentHTMLForExport } from "./convert-to-html";

/** Shopify Page `body`：片段 HTML + 内联样式 */
export function convertToShopifyBody(data: Data): string {
  const components = data.content || [];
  let html = "<style>\n";
  html += generateCSS(data);
  html += "\n</style>\n<div class=\"visbuild-page\">\n";
  for (const component of components) {
    html += generateComponentHTMLForExport(component);
  }
  html += "</div>";
  if (dataUsesImageAnimations(data)) {
    html += imageAnimationShopifyScript();
  }
  return html;
}
