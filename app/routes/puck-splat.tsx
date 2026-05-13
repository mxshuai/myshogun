import { useCallback, useEffect, useState } from "react";
import { data, useFetcher, useLoaderData, useNavigate } from "react-router";
import type { Data } from "@puckeditor/core";
import { Puck, Render } from "@puckeditor/core";

import type { Route } from "./+types/puck-splat";
import { config } from "../../puck.config";
import { resolvePuckPath } from "~/lib/resolve-puck-path.server";
import { getPage, saveEditorPage } from "~/lib/pages.server";
import editorStyles from "@puckeditor/core/puck.css?url";
import { PuckEditorHeader } from "~/components/PuckEditorHeader";
import { PreviewModal } from "~/components/PreviewModal";
import { ViewPageModal } from "~/components/ViewPageModal";

/** 编辑数据里补齐 URL path（属性面板展示）；旧数据无该字段时用当前路由 path */
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

/** 前台预览不暴露编辑用字段 */
function stripPublicRootProps(data: Data): Data {
  const props = { ...(data.root?.props as Record<string, unknown>) };
  delete props.pagePath;
  return {
    ...data,
    root: { ...data.root, props },
  };
}

export async function loader({ params }: Route.LoaderArgs) {
  const pathname = params["*"] ?? "/";
  const { isEditorRoute, path } = resolvePuckPath(pathname);
  let page = await getPage(path);

  // Throw a 404 if we're not rendering the editor and data for the page does not exist
  if (!isEditorRoute && !page) {
    throw new Response("Not Found", { status: 404 });
  }

  // Empty shell for new pages
  if (isEditorRoute && !page) {
    page = {
      content: [],
      root: {
        props: {
          title: "",
          pagePath: path,
        },
      },
    };
  } else if (isEditorRoute && page) {
    page = ensureEditorRootProps(page, path);
  }

  return {
    isEditorRoute,
    path,
    data: page,
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
  const pathname = params["*"] ?? "/";
  const { path } = resolvePuckPath(pathname);
  const body = (await request.json()) as SaveBody;

  const rootProps = body.data.root?.props as
    | { pagePath?: string }
    | undefined;
  const desired =
    typeof rootProps?.pagePath === "string" ? rootProps.pagePath : path;

  const result = await saveEditorPage(path, body.data, desired);
  if (!result.ok) {
    return data({ ok: false as const, error: result.error }, { status: 400 });
  }
  return data({ ok: true as const, path: result.path });
}

function editHref(pagePath: string) {
  return pagePath === "/" ? "/edit" : `${pagePath}/edit`;
}

function Editor() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editorData, setEditorData] = useState<Data>(loaderData.data);
  const [saveError, setSaveError] = useState<string | null>(null);

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
  }, [fetcher.state, fetcher.data, loaderData.path, navigate]);

  const persistPage = useCallback(
    (next: Data) => {
      setEditorData(next);
      fetcher.submit(
        { data: next },
        {
          action: "",
          method: "post",
          encType: "application/json",
        }
      );
    },
    [fetcher]
  );

  return (
    <>
      <link rel="stylesheet" href={editorStyles} id="puck-css" />
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
          await fetcher.submit(
            { data: pubData },
            {
              action: "",
              method: "post",
              encType: "application/json",
            }
          );
        }}
        overrides={{
          header: ({ children }) => (
            <PuckEditorHeader onPersist={persistPage}>
              {children}
            </PuckEditorHeader>
          ),
          headerActions: ({ children }) => (
            <>
              {/* View Page：按钮暂时隐藏；ViewPageModal、showViewModal 仍挂载，恢复显示改为 true 或删除包裹 */}
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
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                    e.currentTarget.style.borderColor = "#d0d0d0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#e0e0e0";
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
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                  e.currentTarget.style.borderColor = "#d0d0d0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                  e.currentTarget.style.borderColor = "#e0e0e0";
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

export default function PuckSplatRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      {loaderData.isEditorRoute ? (
        <Editor />
      ) : (
        <Render config={config} data={stripPublicRootProps(loaderData.data)} />
      )}
    </div>
  );
}
