import {
  createScheduleAt,
  deleteSchedule,
} from "~/lib/server/aws/scheduler-core";

export type ScheduleEvent =
  | { action: "schedule"; jobId: string; runAt: string }
  | { action: "cancel"; jobId: string };

export type ScheduleResult = { ok: true } | { ok: false; error: string };

export async function handler(event: ScheduleEvent): Promise<ScheduleResult> {
  const jobId = event?.jobId?.trim();
  if (!jobId) {
    return { ok: false, error: "Missing jobId" };
  }

  try {
    if (event.action === "cancel") {
      await deleteSchedule(jobId);
      return { ok: true };
    }

    if (event.action !== "schedule") {
      return { ok: false, error: "Unknown action" };
    }

    const runAt = new Date(event.runAt);
    if (Number.isNaN(runAt.getTime())) {
      return { ok: false, error: "Invalid runAt" };
    }

    await createScheduleAt({ jobId, runAt });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
