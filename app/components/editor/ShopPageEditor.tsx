"use client";

import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { useFetcher, useNavigate } from "react-router";
import type { Data } from "@puckeditor/core";
import { Puck } from "@puckeditor/core";

import { config } from "../../../visbuild.config";
import {
  EditorPublishActions,
  type EditorActionResult,
  type EditorPageMeta,
} from "~/components/editor/EditorPublishActions";
import type { PageVersionSummary } from "~/lib/server/types";
import { shopEditPath } from "~/lib/shop-url";
import editorStyles from "@puckeditor/core/puck.css?url";
import { MediaPickerProvider } from "~/components/editor/media/MediaPickerContext";
import "~/components/editor/media/media.css";
import { visbuildPuckFieldTypes } from "~/components/editor/puck-overrides";
import { stableSlotFieldTransforms } from "~/components/editor/stable-slot-transform";
import "~/components/editor/puck-overrides.css";
import { VisbuildEditorHeader } from "~/components/VisbuildEditorHeader";
import { PreviewModal } from "~/components/PreviewModal";
import { ViewPageModal } from "~/components/ViewPageModal";

export function ShopPageEditor({
  shopDomain,
  path,
  initialData,
  initialPageMeta,
  initialVersions,
}: {
  shopDomain: string;
  path: string;
  initialData: Data;
  initialPageMeta: EditorPageMeta | null;
  initialVersions: PageVersionSummary[];
}) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editorData, setEditorData] = useState<Data>(initialData);
  const [savedData, setSavedData] = useState<Data>(initialData);
  const [pageMeta, setPageMeta] = useState<EditorPageMeta | null>(initialPageMeta);
  const [versions, setVersions] = useState<PageVersionSummary[]>(initialVersions);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialVersions[0]?.versionId ?? null,
  );
  const [restoreEpoch, setRestoreEpoch] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = fetcher.state !== "idle";
  const editHref = (pagePath: string) => shopEditPath(shopDomain, pagePath);
  /** 同一轮 fetcher 响应只处理一次，避免 revalidate 后重复请求 edit.data */
  const handledFetcherDataRef = useRef<unknown>(null);
  const editorDataRef = useRef(editorData);
  editorDataRef.current = editorData;

  useEffect(() => {
    setEditorData(initialData);
    setSavedData(initialData);
    setPageMeta(initialPageMeta);
    setSelectedVersionId(initialVersions[0]?.versionId ?? null);
    setRestoreEpoch(0);
  }, [path]);

  useEffect(() => {
    setVersions(initialVersions);
  }, [initialVersions]);

  useEffect(() => {
    if (fetcher.state === "submitting" || fetcher.state === "loading") {
      handledFetcherDataRef.current = null;
    }
  }, [fetcher.state]);

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    const d = fetcher.data as EditorActionResult | undefined;
    if (!d) return;
    if (handledFetcherDataRef.current === d) return;
    handledFetcherDataRef.current = d;

    if (d.ok === false && typeof d.error === "string") {
      setActionError(d.error);
      return;
    }
    if (d.ok && d.intent === "restore" && d.data) {
      setActionError(null);
      setEditorData(d.data);
      setSavedData(d.data);
      if (d.versionId) setSelectedVersionId(d.versionId);
      setRestoreEpoch((epoch) => epoch + 1);
      return;
    }
    if (d.ok) {
      setActionError(null);
      const snapshot = editorDataRef.current;
      setSavedData(snapshot);
      if (d.pageMeta) {
        setPageMeta(d.pageMeta);
      } else if (d.status) {
        setPageMeta((current) =>
          current ? { ...current, status: d.status! } : current,
        );
      }
      if (d.versions) setVersions(d.versions);
      if (d.versionId) setSelectedVersionId(d.versionId);
      if (d.path && d.path !== path) {
        navigate(editHref(d.path));
      }
    }
  }, [fetcher.state, fetcher.data, path, navigate, shopDomain]);

  const submitAction = useCallback(
    (payload: Record<string, unknown>) => {
      fetcher.submit(JSON.stringify(payload), {
        method: "post",
        encType: "application/json",
      });
    },
    [fetcher],
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      submitAction({ intent: "restore", versionId });
    },
    [submitAction],
  );

  const saveEditor = useCallback(() => {
    submitAction({ intent: "save", data: editorDataRef.current });
  }, [submitAction]);

  const persistPage = useCallback(
    (next: Data) => {
      setEditorData(next);
      submitAction({ intent: "save", data: next });
    },
    [submitAction],
  );

  return (
    <>
      <link rel="stylesheet" href={editorStyles} id="visbuild-editor-css" />
      {actionError ? (
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
          {actionError}
        </div>
      ) : null}
      <MediaPickerProvider shopDomain={shopDomain}>
      <Puck
        key={`${path}:${restoreEpoch}`}
        config={config}
        data={editorData}
        onChange={setEditorData}
        fieldTransforms={
          stableSlotFieldTransforms as NonNullable<
            ComponentProps<typeof Puck>["fieldTransforms"]
          >
        }
        overrides={{
          fieldTypes: visbuildPuckFieldTypes,
          header: ({ children }) => (
            <VisbuildEditorHeader
              shopDomain={shopDomain}
              onPersist={persistPage}
              versions={versions}
              selectedVersionId={selectedVersionId}
              onRestore={restoreVersion}
            >
              {children}
            </VisbuildEditorHeader>
          ),
          headerActions: () => (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                flexWrap: "nowrap",
                gap: 8,
                flexShrink: 0,
                height: 36,
              }}
            >
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                style={{
                  padding: "0 16px",
                  height: 36,
                  backgroundColor: "#ffffff",
                  color: "#333333",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                Preview
              </button>
              <EditorPublishActions
                pageMeta={pageMeta}
                selectedVersionId={selectedVersionId}
                editorData={editorData}
                savedData={savedData}
                busy={busy}
                actionError={actionError}
                lastResult={
                  fetcher.state === "idle"
                    ? (fetcher.data as EditorActionResult | undefined)
                    : undefined
                }
                onSave={saveEditor}
                onPublish={() =>
                  submitAction({ intent: "publish", data: editorData })
                }
                onSchedule={(publishAt, unpublishAt, timezone, versionId) =>
                  submitAction({
                    intent: "schedule",
                    data: editorData,
                    publishAt,
                    unpublishAt,
                    timezone,
                    versionId,
                  })
                }
                onUnschedule={(versionId) =>
                  submitAction({ intent: "unschedule", data: editorData, versionId })
                }
              />
            </div>
          ),
        }}
      />
      </MediaPickerProvider>
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
