import { useAwsDataLayer } from "./env";
import { createDevRepo } from "./dev/repo.dev";
import { createDevSecretsStore } from "./dev/secrets.dev";
import { createDevScheduler } from "./dev/scheduler.dev";
import type { Repo, Scheduler, SecretsStore, ServerContext } from "./types";

let repo: Repo | null = null;
let secrets: SecretsStore | null = null;
let scheduler: Scheduler | null = null;

async function loadAwsRepo(): Promise<Repo> {
  const mod = await import("./aws/repo.ddb");
  return mod.createDdbRepo();
}

async function loadAwsSecrets(): Promise<SecretsStore> {
  const mod = await import("./aws/secrets.sm");
  return mod.createSecretsManagerStore();
}

async function loadAwsScheduler(): Promise<Scheduler> {
  const mod = await import("./aws/scheduler.invoke");
  return mod.createInvokeScheduler();
}

let initPromise: Promise<void> | null = null;

function initDevSync() {
  repo ??= createDevRepo();
  secrets ??= createDevSecretsStore();
  scheduler ??= createDevScheduler();
}

export async function initServerContext(): Promise<void> {
  if (!useAwsDataLayer()) {
    initDevSync();
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      repo = await loadAwsRepo();
      secrets = await loadAwsSecrets();
      scheduler = await loadAwsScheduler();
    })();
  }
  await initPromise;
}

export function getRepo(): Repo {
  if (!repo) {
    if (!useAwsDataLayer()) initDevSync();
    else throw new Error("Call ensureServerContext() before getRepo()");
  }
  return repo!;
}

export function getSecretsStore(): SecretsStore {
  if (!secrets) {
    if (!useAwsDataLayer()) initDevSync();
    else throw new Error("Call ensureServerContext() before getSecretsStore()");
  }
  return secrets!;
}

export function getScheduler(): Scheduler {
  if (!scheduler) {
    if (!useAwsDataLayer()) initDevSync();
    else throw new Error("Call ensureServerContext() before getScheduler()");
  }
  return scheduler!;
}

export function getServerContext(): ServerContext {
  return {
    repo: getRepo(),
    secrets: getSecretsStore(),
    scheduler: getScheduler(),
  };
}

/** Call from loaders/actions before using AWS-backed services */
export async function ensureServerContext(): Promise<ServerContext> {
  await initServerContext();
  return getServerContext();
}
