import type { Scheduler } from "../types";
import { publishPageVersion } from "../publish";
import { getServerContext } from "../factory";

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
  await publishPageVersion(jobId, ctx);
}

async function bootstrapPending() {
  if (bootstrapped) return;
  bootstrapped = true;
  const ctx = getServerContext();
  const now = new Date().toISOString();
  const pending = await ctx.repo.listPendingJobsBefore(now);
  for (const job of pending) {
    const delay = Math.max(0, new Date(job.runAt).getTime() - Date.now());
    const t = setTimeout(() => {
      void runJob(job.jobId);
    }, delay);
    timers.set(job.jobId, t);
  }
}

export function createDevScheduler(): Scheduler {
  void bootstrapPending();
  return {
    async scheduleAt({ jobId, runAt }) {
      clearTimer(jobId);
      const delay = Math.max(0, runAt.getTime() - Date.now());
      const t = setTimeout(() => {
        void runJob(jobId);
      }, delay);
      timers.set(jobId, t);
    },
    async cancel(jobId) {
      clearTimer(jobId);
    },
  };
}
