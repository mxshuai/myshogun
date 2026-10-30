import { createScheduleAt, deleteSchedule } from "./scheduler-core";
import type { Scheduler } from "../types";

/** Direct EventBridge access — used only when not going through Schedule Lambda. */
export function createEventBridgeScheduler(): Scheduler {
  return {
    async scheduleAt({ jobId, runAt }) {
      await createScheduleAt({ jobId, runAt });
    },
    async cancel(jobId) {
      await deleteSchedule(jobId);
    },
  };
}
