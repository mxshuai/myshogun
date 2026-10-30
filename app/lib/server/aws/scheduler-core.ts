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

export function scheduleName(jobId: string): string {
  return `visbuild-publish-${jobId}`.slice(0, 64);
}

export function toAtExpression(d: Date): string {
  const iso = d.toISOString().slice(0, 19);
  return `at(${iso})`;
}

function assertSchedulerConfig(): { lambdaArn: string; roleArn: string } {
  const lambdaArn = getPublishLambdaArn();
  const roleArn = getSchedulerRoleArn();
  if (!lambdaArn || !roleArn) {
    throw new Error(
      "PUBLISH_LAMBDA_ARN and SCHEDULER_ROLE_ARN must be set (see PRODUCTION_DEPLOY.md)",
    );
  }
  if (roleArn.includes("REPLACE_ME")) {
    throw new Error(
      "SCHEDULER_ROLE_ARN is still a placeholder. Set it to the SchedulerInvokeRole ARN from CloudFormation outputs",
    );
  }
  return { lambdaArn, roleArn };
}

export async function createScheduleAt(params: {
  jobId: string;
  runAt: Date;
}): Promise<void> {
  const { lambdaArn, roleArn } = assertSchedulerConfig();
  const minLeadMs = 60_000;
  if (params.runAt.getTime() < Date.now() + minLeadMs) {
    throw new Error("Schedule time must be at least 1 minute in the future");
  }

  const client = new SchedulerClient({ region: getAwsRegion() });
  try {
    await client.send(
      new CreateScheduleCommand({
        Name: scheduleName(params.jobId),
        ScheduleExpression: toAtExpression(params.runAt),
        ScheduleExpressionTimezone: "UTC",
        FlexibleTimeWindow: { Mode: "OFF" },
        Target: {
          Arn: lambdaArn,
          RoleArn: roleArn,
          Input: JSON.stringify({ jobId: params.jobId }),
        },
      }),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`EventBridge Scheduler failed: ${msg}`);
  }
}

export async function deleteSchedule(jobId: string): Promise<void> {
  const client = new SchedulerClient({ region: getAwsRegion() });
  try {
    await client.send(
      new DeleteScheduleCommand({ Name: scheduleName(jobId) }),
    );
  } catch {
    /* already deleted */
  }
}
