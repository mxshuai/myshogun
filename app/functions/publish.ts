import { ensureServerContext } from "~/lib/server/factory";
import { publishPageVersion } from "~/lib/server/publish";

export type PublishEvent = { jobId: string };

export async function handler(event: PublishEvent) {
  const jobId = event?.jobId;
  if (!jobId) {
    console.error("Missing jobId", event);
    return { ok: false };
  }
  const ctx = await ensureServerContext();
  await publishPageVersion(jobId, ctx);
  return { ok: true };
}
