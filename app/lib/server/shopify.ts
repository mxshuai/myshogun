export type ShopifyPage = {
  id: string;
  title: string;
  handle: string;
  body: string;
  isPublished: boolean;
  updatedAt: string;
};

export type ShopifyClientConfig = {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
};

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ShopifyApiError";
  }
}

const DEFAULT_VERSION = "2024-10";
const MAX_RETRIES = 5;

function normalizeDomain(domain: string): string {
  const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return d.includes(".") ? d : `${d}.myshopify.com`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export function createAdminClient(config: ShopifyClientConfig) {
  const domain = normalizeDomain(config.shopDomain);
  const version = config.apiVersion?.trim() || DEFAULT_VERSION;
  const endpoint = `https://${domain}/admin/api/${version}/graphql.json`;

  async function graphql<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      attempt += 1;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": config.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt >= MAX_RETRIES) {
          throw new ShopifyApiError(
            `Shopify HTTP ${res.status}`,
            "THROTTLED",
            res.status
          );
        }
        const retryAfter = Number(res.headers.get("Retry-After") || "0");
        const backoff = retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500;
        await sleep(backoff);
        continue;
      }

      const json = (await res.json()) as {
        data?: T;
        errors?: { message: string; extensions?: { code?: string } }[];
      };

      if (!res.ok) {
        throw new ShopifyApiError(
          json.errors?.[0]?.message || `HTTP ${res.status}`,
          json.errors?.[0]?.extensions?.code,
          res.status
        );
      }

      if (json.errors?.length) {
        const throttled = json.errors.some(
          (e) =>
            e.extensions?.code === "THROTTLED" ||
            /throttl/i.test(e.message)
        );
        if (throttled && attempt < MAX_RETRIES) {
          await sleep(2 ** attempt * 500);
          continue;
        }
        throw new ShopifyApiError(
          json.errors.map((e) => e.message).join("; "),
          json.errors[0]?.extensions?.code
        );
      }

      return json.data as T;
    }
  }

  return {
    async verifyShop(): Promise<string> {
      const data = await graphql<{ shop: { name: string } }>(`
        query { shop { name } }
      `);
      return data.shop.name;
    },

    async listPages(params?: { first?: number; after?: string }) {
      const first = params?.first ?? 50;
      const data = await graphql<{
        pages: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: ShopifyPage[];
        };
      }>(
        `query ListPages($first: Int!, $after: String) {
          pages(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes { id title handle body isPublished updatedAt }
          }
        }`,
        { first, after: params?.after ?? null }
      );
      return data.pages;
    },

    async getPage(id: string): Promise<ShopifyPage | null> {
      const data = await graphql<{ page: ShopifyPage | null }>(
        `query GetPage($id: ID!) {
          page(id: $id) { id title handle body isPublished updatedAt }
        }`,
        { id }
      );
      return data.page;
    },

    async pageCreate(input: {
      title: string;
      handle?: string;
      body: string;
      isPublished?: boolean;
    }) {
      const data = await graphql<{
        pageCreate: {
          page: ShopifyPage | null;
          userErrors: { field: string[]; message: string }[];
        };
      }>(
        `mutation PageCreate($page: PageCreateInput!) {
          pageCreate(page: $page) {
            page { id title handle body isPublished updatedAt }
            userErrors { field message }
          }
        }`,
        {
          page: {
            title: input.title,
            handle: input.handle,
            body: input.body,
            isPublished: input.isPublished ?? true,
          },
        }
      );
      const errs = data.pageCreate.userErrors;
      if (errs?.length) {
        throw new ShopifyApiError(errs.map((e) => e.message).join("; "));
      }
      if (!data.pageCreate.page) {
        throw new ShopifyApiError("pageCreate returned no page");
      }
      return data.pageCreate.page;
    },

    async pageUpdate(input: {
      id: string;
      title?: string;
      handle?: string;
      body?: string;
      isPublished?: boolean;
    }) {
      const data = await graphql<{
        pageUpdate: {
          page: ShopifyPage | null;
          userErrors: { field: string[]; message: string }[];
        };
      }>(
        `mutation PageUpdate($id: ID!, $page: PageUpdateInput!) {
          pageUpdate(id: $id, page: $page) {
            page { id title handle body isPublished updatedAt }
            userErrors { field message }
          }
        }`,
        {
          id: input.id,
          page: {
            title: input.title,
            handle: input.handle,
            body: input.body,
            isPublished: input.isPublished,
          },
        }
      );
      const errs = data.pageUpdate.userErrors;
      if (errs?.length) {
        throw new ShopifyApiError(errs.map((e) => e.message).join("; "));
      }
      if (!data.pageUpdate.page) {
        throw new ShopifyApiError("pageUpdate returned no page");
      }
      return data.pageUpdate.page;
    },

    async pageDelete(id: string) {
      const data = await graphql<{
        pageDelete: {
          deletedPageId: string | null;
          userErrors: { message: string }[];
        };
      }>(
        `mutation PageDelete($id: ID!) {
          pageDelete(id: $id) {
            deletedPageId
            userErrors { message }
          }
        }`,
        { id }
      );
      const errs = data.pageDelete.userErrors;
      if (errs?.length) {
        throw new ShopifyApiError(errs.map((e) => e.message).join("; "));
      }
      return data.pageDelete.deletedPageId;
    },
  };
}

export type ShopifyAdminClient = ReturnType<typeof createAdminClient>;
