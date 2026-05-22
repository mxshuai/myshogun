import { useCallback, useEffect, useState } from "react";
import { Form, Link, data, useFetcher, useLoaderData } from "react-router";
import type { Data } from "@puckeditor/core";
import { Puck } from "@puckeditor/core";

import type { Route } from "./+types/admin.pages.$pageId";
import { config } from "../../visbuild.config";
import { requireAdmin } from "~/lib/server/auth.server";
import { ensureServerContext } from "~/lib/server/factory";
import {
  cancelPendingJob,
  publishPageNow,
  savePageDraft,
  schedulePageUpdate,
} from "~/lib/server/publish";
import editorStyles from "@puckeditor/core/puck.css?url";

export async function loader({ request, params }: Route.LoaderArgs) {
  requireAdmin(request);
  const ctx = await ensureServerContext();
  const pageId = params.pageId!;
  const index = await ctx.repo.getPageIndex(pageId);
  if (!index) throw new Response("Page not found", { status: 404 });
  const body = await ctx.repo.getPageBody(pageId);
  const shop = await ctx.repo.getShop(index.shopId);
  let pendingJob = null;
  if (index.pendingJobId) {
    pendingJob = await ctx.repo.getJob(index.pendingJobId);
  }
  return {
    index,
    shop,
    data: body?.currentVisbuildData ?? {
      content: [],
      root: { props: { title: index.title } },
    },
    pendingJob,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  requireAdmin(request);
  const ctx = await ensureServerContext();
  const pageId = params.pageId!;
  const contentType = request.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { intent: string; data?: Data };
    if (body.intent === "saveDraft" && body.data) {
      await savePageDraft(pageId, ctx, body.data);
      return data({ ok: true });
    }
    if (body.intent === "publishNow" && body.data) {
      await publishPageNow(pageId, ctx, body.data);
      return data({ ok: true });
    }
    return data({ error: "Unknown intent" }, { status: 400 });
  }

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "schedule") {
    const runAtRaw = String(form.get("runAt") ?? "");
    const tz = String(form.get("timezone") ?? "UTC");
    const visbuildJson = String(form.get("visbuildData") ?? "");
    let visbuildData: Data;
    try {
      visbuildData = JSON.parse(visbuildJson) as Data;
    } catch {
      return data({ error: "Invalid editor data" }, { status: 400 });
    }
    const runAt = new Date(runAtRaw);
    if (Number.isNaN(runAt.getTime())) {
      return data({ error: "Invalid schedule time" }, { status: 400 });
    }
    const jobId = await schedulePageUpdate(pageId, ctx, visbuildData, runAt, tz);
    return data({ ok: true, jobId });
  }

  if (intent === "cancelSchedule") {
    await cancelPendingJob(pageId, ctx);
    return data({ ok: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: editorStyles },
];

export default function AdminPageEditor() {
  const { index, shop, data: initialData, pendingJob } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [editorData, setEditorData] = useState<Data>(initialData);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditorData(initialData);
  }, [initialData]);

  const postJson = useCallback(
    (intent: "saveDraft" | "publishNow") => {
      void fetcher.submit(
        JSON.stringify({ intent, data: editorData }),
        {
          method: "post",
          encType: "application/json",
        }
      );
      setMessage(intent === "saveDraft" ? "Draft saved" : "Published to Shopify");
    },
    [editorData, fetcher]
  );

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && "error" in fetcher.data) {
      setMessage(String((fetcher.data as { error: string }).error));
    }
  }, [fetcher.state, fetcher.data]);

  const defaultSchedule = () => {
    const d = new Date(Date.now() + 60_000);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #ddd",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          fontFamily: "system-ui",
          background: "#fafafa",
        }}
      >
        <Link to={`/admin/shops/${index.shopId}/pages`}>← Pages</Link>
        <strong>
          {index.title} ({shop?.name})
        </strong>
        <span style={{ fontSize: 13, color: "#666" }}>Status: {index.status}</span>
        <button type="button" onClick={() => postJson("saveDraft")}>
          Save Draft
        </button>
        <button type="button" onClick={() => postJson("publishNow")}>
          Publish Now
        </button>
        {message ? (
          <span style={{ fontSize: 13, color: "#333" }}>{message}</span>
        ) : null}
      </header>

      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #eee",
          fontFamily: "system-ui",
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Form method="post" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="hidden" name="intent" value="schedule" />
          <input type="hidden" name="visbuildData" value={JSON.stringify(editorData)} />
          <label>
            Schedule update (UTC local input)
            <input
              type="datetime-local"
              name="runAt"
              defaultValue={defaultSchedule()}
              required
            />
          </label>
          <input type="hidden" name="timezone" value="UTC" />
          <button type="submit">Schedule Update</button>
        </Form>
        {pendingJob && pendingJob.status === "pending" ? (
          <Form method="post">
            <input type="hidden" name="intent" value="cancelSchedule" />
            <span style={{ fontSize: 13 }}>
              Pending: {new Date(pendingJob.runAt).toLocaleString()} ({pendingJob.jobId.slice(0, 8)}…)
            </span>
            <button type="submit" style={{ marginLeft: 8 }}>
              Cancel
            </button>
          </Form>
        ) : null}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Puck
          config={config}
          data={editorData}
          onChange={setEditorData}
          overrides={{
            headerActions: () => <></>,
          }}
        />
      </div>
    </div>
  );
}
