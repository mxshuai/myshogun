import { useCallback, useEffect, useState } from "react";
import { data, useFetcher, useLoaderData, useNavigate } from "react-router";
import type { Data } from "@puckeditor/core";
import { Puck, Render } from "@puckeditor/core";

import type { Route } from "./+types/shop.$shopDomain.splat";
import { config } from "../../visbuild.config";
import { resolveVisbuildPath } from "~/lib/resolve-visbuild-path.server";
import { shopEditPath } from "~/lib/shop-url";
import { ensureServerContext } from "~/lib/server/factory";
import {
  getPageDataByPath,
  savePageByPath,
} from "~/lib/server/page-service.server";
import { requireShopRouteContext } from "~/lib/server/shop-route.server";
import editorStyles from "@puckeditor/core/puck.css?url";
import { VisbuildEditorHeader } from "~/components/VisbuildEditorHeader";
import { PreviewModal } from "~/components/PreviewModal";
import { ViewPageModal } from "~/components/ViewPageModal";

function ensureEditorRootProps(data: Data, urlPath: string): Data {
  const props = { ...(data.root?.props as Record<string, unknown>) };
  const existing =
    typeof props.pagePath === "string" ? props.pagePath.trim() : "";
  if (!existing) props.pagePath = urlPath;
  return {
    ...data,
    root: { ...data.root, props },
  };
}

function stripPublicRootProps(data: Data): Data {
  const props = { ...(data.root?.props as Record<string, unknown>) };
  delete props.pagePath;
  return {
    ...data,
    root: { ...data.root, props },
  };
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );
  const pathname = params["*"] ?? "/";
  const { isEditorRoute, path } = resolveVisbuildPath(pathname);
  const page = await getPageDataByPath(ctx, shop.id, path);

  if (!isEditorRoute && !page) {
    throw new Response("Not Found", { status: 404 });
  }

  let resolved: Data;
  if (page) {
    resolved = isEditorRoute ? ensureEditorRootProps(page, path) : page;
  } else {
    resolved = ensureEditorRootProps(
      { content: [], root: { props: { title: "" } } },
      path,
    );
  }

  return {
    shopDomain: shop.domain,
    isEditorRoute,
    path,
    data: resolved,
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData.isEditorRoute
        ? `Edit: ${loaderData.path}`
        : loaderData.data.root.props?.title ?? "",
    },
  ];
}

type SaveBody = { data: Data };

export async function action({ params, request }: Route.ActionArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );
  const pathname = params["*"] ?? "/";
  const { path } = resolveVisbuildPath(pathname);
  const body = (await request.json()) as SaveBody;

  const rootProps = body.data.root?.props as
    | { pagePath?: string }
    | undefined;
  const desired =
    typeof rootProps?.pagePath === "string" ? rootProps.pagePath : path;

  const result = await savePageByPath(
    ctx,
    shop.id,
    path,
    body.data,
    desired
  );
  if (!result.ok) {
    return data({ ok: false as const, error: result.error }, { status: 400 });
  }
  return data({ ok: true as const, path: result.path });
}

function Editor({ shopDomain }: { shopDomain: string }) {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editorData, setEditorData] = useState<Data>(loaderData.data);
  const [saveError, setSaveError] = useState<string | null>(null);

  const editHref = (pagePath: string) => shopEditPath(shopDomain, pagePath);

  useEffect(() => {
    setEditorData(loaderData.data);
  }, [loaderData.data]);

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    const d = fetcher.data as
      | { ok?: boolean; path?: string; error?: string }
      | undefined;
    if (d?.ok === false && typeof d.error === "string") {
      setSaveError(d.error);
    } else {
      setSaveError(null);
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    const d = fetcher.data as
      | { ok?: boolean; path?: string; error?: string }
      | undefined;
    if (!d?.ok || !d.path || d.path === loaderData.path) return;
    navigate(editHref(d.path));
  }, [fetcher.state, fetcher.data, loaderData.path, navigate, shopDomain]);

  const persistPage = useCallback(
    (next: Data) => {
      setEditorData(next);
      fetcher.submit(JSON.stringify({ data: next }), {
        action: "",
        method: "post",
        encType: "application/json",
      });
    },
    [fetcher]
  );

  return (
    <>
      <link rel="stylesheet" href={editorStyles} id="visbuild-editor-css" />
      {saveError ? (
        <div
          role="alert"
          style={{
            padding: "10px 16px",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            borderBottom: "1px solid #fecaca",
            fontSize: "0.875rem",
          }}
        >
          {saveError}
        </div>
      ) : null}
      <Puck
        config={config}
        data={editorData}
        onChange={(data) => {
          setEditorData(data);
        }}
        onPublish={async (pubData) => {
          await fetcher.submit(JSON.stringify({ data: pubData }), {
            action: "",
            method: "post",
            encType: "application/json",
          });
        }}
        overrides={{
          header: ({ children }) => (
            <VisbuildEditorHeader shopDomain={shopDomain} onPersist={persistPage}>
              {children}
            </VisbuildEditorHeader>
          ),
          headerActions: ({ children }) => (
            <>
              {false && (
                <button
                  type="button"
                  onClick={() => setShowViewModal(true)}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#ffffff",
                    color: "#333333",
                    border: "1px solid #e0e0e0",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    marginRight: "8px",
                  }}
                >
                  View Page
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ffffff",
                  color: "#333333",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  marginRight: "8px",
                }}
              >
                Preview
              </button>
              {children}
            </>
          ),
        }}
      />
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        data={editorData}
      />
      <ViewPageModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        data={editorData}
      />
    </>
  );
}

export default function ShopVisbuildSplatRoute({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div>
      {loaderData.isEditorRoute ? (
        <Editor shopDomain={loaderData.shopDomain} />
      ) : (
        <Render
          config={config}
          data={stripPublicRootProps(loaderData.data)}
        />
      )}
    </div>
  );
}
