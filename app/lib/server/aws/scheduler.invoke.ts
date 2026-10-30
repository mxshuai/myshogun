import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import { getAwsRegion, getScheduleLambdaArn } from "../env";
import type { Scheduler } from "../types";

type ScheduleLambdaResult = { ok: true } | { ok: false; error: string };

function parsePayload(raw: Uint8Array | undefined): ScheduleLambdaResult {
  if (!raw?.length) {
    return { ok: false, error: "Schedule Lambda returned empty response" };
  }
  try {
    const json = JSON.parse(
      Buffer.from(raw).toString("utf8"),
    ) as ScheduleLambdaResult;
    if (json && typeof json === "object" && "ok" in json) {
      return json;
    }
    return { ok: false, error: "Invalid Schedule Lambda response" };
  } catch {
    return { ok: false, error: "Invalid Schedule Lambda response JSON" };
  }
}

async function invokeScheduleLambda(
  payload: Record<string, string>,
): Promise<void> {
  const arn = getScheduleLambdaArn();
  if (!arn) {
    throw new Error(
      "SCHEDULE_LAMBDA_ARN must be set in Amplify environment variables (see PRODUCTION_DEPLOY.md)",
    );
  }

  const client = new LambdaClient({ region: getAwsRegion() });
  const res = await client.send(
    new InvokeCommand({
      FunctionName: arn,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );

  if (res.FunctionError) {
    const body = parsePayload(res.Payload);
    throw new Error(body.ok === false ? body.error : res.FunctionError);
  }

  const body = parsePayload(res.Payload);
  if (!body.ok) {
    throw new Error(body.error);
  }
}

/**
 * Production scheduler: Amplify SSR invokes Schedule Lambda instead of calling
 * EventBridge Scheduler directly (avoids session-policy deny on iam:PassRole).
 */
export function createInvokeScheduler(): Scheduler {
  return {
    async scheduleAt({ jobId, runAt }) {
      await invokeScheduleLambda({
        action: "schedule",
        jobId,
        runAt: runAt.toISOString(),
      });
    },
    async cancel(jobId) {
      await invokeScheduleLambda({
        action: "cancel",
        jobId,
      });
    },
  };
}
