import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";

import {
  getAwsRegion,
  getPublishLambdaArn,
  getSchedulerRoleArn,
} from "../env";
import type { Scheduler } from "../types";

function scheduleName(jobId: string) {
  return `visbuild-publish-${jobId}`.slice(0, 64);
}

function toAtExpression(d: Date): string {
  const iso = d.toISOString().slice(0, 19);
  return `at(${iso})`;
}

export function createEventBridgeScheduler(): Scheduler {
  const client = new SchedulerClient({ region: getAwsRegion() });
  const lambdaArn = getPublishLambdaArn();
  const roleArn = getSchedulerRoleArn();

  return {
    async scheduleAt({ jobId, runAt }) {
      if (!lambdaArn || !roleArn) {
        throw new Error(
          "PUBLISH_LAMBDA_ARN and SCHEDULER_ROLE_ARN must be set in Amplify environment variables (see PRODUCTION_DEPLOY.md step 3)",
        );
      }
      if (roleArn.includes("REPLACE_ME")) {
        throw new Error(
          "SCHEDULER_ROLE_ARN is still a placeholder. Set it to the SchedulerInvokeRole ARN from the visbuild-shopify-data CloudFormation stack outputs",
        );
      }
      const minLeadMs = 60_000;
      if (runAt.getTime() < Date.now() + minLeadMs) {
        throw new Error("Schedule time must be at least 1 minute in the future");
      }
      try {
        await client.send(
          new CreateScheduleCommand({
            Name: scheduleName(jobId),
            ScheduleExpression: toAtExpression(runAt),
            // runAt is a UTC instant (ISO from the browser); keep expression in UTC.
            ScheduleExpressionTimezone: "UTC",
            FlexibleTimeWindow: { Mode: "OFF" },
            Target: {
              Arn: lambdaArn,
              RoleArn: roleArn,
              Input: JSON.stringify({ jobId }),
            },
          }),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`EventBridge Scheduler failed: ${msg}`);
      }
    },

    async cancel(jobId) {
      try {
        await client.send(
          new DeleteScheduleCommand({ Name: scheduleName(jobId) })
        );
      } catch {
        /* already deleted */
      }
    },
  };
}
