import type { Scheduler } from "../types";
import { runScheduledJob } from "../publish";
import { getServerContext } from "../factory";

/** setTimeout fires immediately for delays above 2^31-1 ms (~24.8 days). */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const FAR_FUTURE_ISO = "9999-12-31T23:59:59.999Z";

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let bootstrapped = false;

function clearTimer(jobId: string) {
  const t = timers.get(jobId);
  if (t) {
    clearTimeout(t);
    timers.delete(jobId);
  }
}

async function runJob(jobId: string) {
  clearTimer(jobId);
  const ctx = getServerContext();
  await runScheduledJob(jobId, ctx);
}

function arm(jobId: string, runAtMs: number) {
  clearTimer(jobId);
  const delay = Math.max(0, runAtMs - Date.now());
  const t = setTimeout(
    () => {
      if (runAtMs > Date.now()) arm(jobId, runAtMs);
      else void runJob(jobId);
    },
    Math.min(delay, MAX_TIMEOUT_MS),
  );
  timers.set(jobId, t);
}

async function bootstrapPending() {
  if (bootstrapped) return;
  bootstrapped = true;
  const ctx = getServerContext();
  const pending = await ctx.repo.listPendingJobsBefore(FAR_FUTURE_ISO);
  for (const job of pending) {
    if (timers.has(job.jobId)) continue;
    arm(job.jobId, new Date(job.runAt).getTime());
  }
}

export function createDevScheduler(): Scheduler {
  void bootstrapPending();
  return {
    async scheduleAt({ jobId, runAt }) {
      arm(jobId, runAt.getTime());
    },
    async cancel(jobId) {
      clearTimer(jobId);
    },
  };
}
