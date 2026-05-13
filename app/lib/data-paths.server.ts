import fs from "fs/promises";
import os from "os";
import path from "path";

/**
 * 页面 JSON 数据存放目录。
 *
 * - 本地：`process.cwd()`（仓库根目录）。
 * - Amplify SSR / Lambda：应用包通常为只读，应落到 **`/tmp`**（或由环境变量指定）。
 *
 * 环境变量：
 * - **`SHOGUN_DATA_DIR`**：绝对路径，自定义数据目录（如挂载卷）。
 * - **`SHOGUN_USE_TMP_DATA=1`**：强制使用 `{tmpdir}/shogun-cms`。
 */
export function getShogunDataDirectory(): string {
  const explicit = process.env.SHOGUN_DATA_DIR?.trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  const forceTmp = process.env.SHOGUN_USE_TMP_DATA === "1";
  const awsCompute =
    process.env.AWS_EXECUTION_ENV !== undefined ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.LAMBDA_TASK_ROOT !== undefined;

  if (forceTmp || awsCompute) {
    return path.join(os.tmpdir(), "shogun-cms");
  }

  return process.cwd();
}

export function getDatabasePath(): string {
  return path.join(getShogunDataDirectory(), "database.json");
}

export function getPageMetadataPath(): string {
  return path.join(getShogunDataDirectory(), "page-metadata.json");
}

export function getShopifyJsonPaths(): {
  shopifyPagesPath: string;
  importedIdsPath: string;
} {
  const root = getShogunDataDirectory();
  return {
    shopifyPagesPath: path.join(root, "shopify-pages.json"),
    importedIdsPath: path.join(root, "shopify-imported-ids.json"),
  };
}

/** 首次写入前调用，避免 ENOENT */
export async function ensureShogunDataDirectory(): Promise<void> {
  await fs.mkdir(getShogunDataDirectory(), { recursive: true });
}
