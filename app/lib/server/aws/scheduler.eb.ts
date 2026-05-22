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
          "PUBLISH_LAMBDA_ARN and SCHEDULER_ROLE_ARN must be set for EventBridge Scheduler"
        );
      }
      await client.send(
        new CreateScheduleCommand({
          Name: scheduleName(jobId),
          ScheduleExpression: toAtExpression(runAt),
          ScheduleExpressionTimezone: "UTC",
          FlexibleTimeWindow: { Mode: "OFF" },
          Target: {
            Arn: lambdaArn,
            RoleArn: roleArn,
            Input: JSON.stringify({ jobId }),
          },
        })
      );
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
