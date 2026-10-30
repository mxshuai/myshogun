import type {
  PageStatus,
  ScheduleStatus,
  VersionSource,
} from "./server/types";

const MINUTE_MS = 60_000;

export type ScheduleLike = {
  versionId: string;
  publishAt: string;
  unpublishAt: string | null;
  status: ScheduleStatus;
};

export type OccupiedRange = {
  versionId: string;
  /** Inclusive minute timestamp. */
  start: number;
  /** Inclusive minute timestamp. */
  end: number;
};

export type VersionDisplayStatus =
  | "draft"
  | "published"
  | "scheduled"
  | "outdated"
  | "unpublished";

export function truncateToMinute(date: Date): Date {
  const next = new Date(date.getTime());
  next.setSeconds(0, 0);
  return next;
}

/** Earliest publish minute that is still at least 60 seconds away. */
export function earliestPublishAt(now = new Date()): Date {
  const min = new Date(now.getTime() + MINUTE_MS);
  const truncated = truncateToMinute(min);
  if (truncated.getTime() < min.getTime()) {
    return new Date(truncated.getTime() + MINUTE_MS);
  }
  return truncated;
}

export function validateWindow(input: {
  publishAt: Date;
  unpublishAt: Date | null;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();
  const publishAt = truncateToMinute(input.publishAt);
  if (Number.isNaN(publishAt.getTime())) return "Invalid publish time";
  if (publishAt.getTime() < now.getTime() + MINUTE_MS) {
    return "Schedule must be at least 1 minute in the future";
  }
  if (!input.unpublishAt) return null;
  const unpublishAt = truncateToMinute(input.unpublishAt);
  if (Number.isNaN(unpublishAt.getTime())) return "Invalid unpublish time";
  if (unpublishAt.getTime() < publishAt.getTime() + MINUTE_MS) {
    return "Unpublish time must be at least 1 minute after publish time";
  }
  return null;
}

/** A live window keeps its publish time; only the unpublish time can move. */
export function validateLiveUnpublish(input: {
  publishAt: Date;
  unpublishAt: Date | null;
  now?: Date;
}): string | null {
  if (!input.unpublishAt) return null;
  const now = input.now ?? new Date();
  const publishAt = truncateToMinute(input.publishAt);
  const unpublishAt = truncateToMinute(input.unpublishAt);
  if (Number.isNaN(unpublishAt.getTime())) return "Invalid unpublish time";
  if (unpublishAt.getTime() < publishAt.getTime() + MINUTE_MS) {
    return "Unpublish time must be at least 1 minute after publish time";
  }
  if (unpublishAt.getTime() < now.getTime() + MINUTE_MS) {
    return "Unpublish time must be at least 1 minute in the future";
  }
  return null;
}

function occupiedRange(schedule: ScheduleLike): OccupiedRange | null {
  const start = truncateToMinute(new Date(schedule.publishAt)).getTime();
  if (Number.isNaN(start)) return null;
  const end = schedule.unpublishAt
    ? truncateToMinute(new Date(schedule.unpublishAt)).getTime()
    : start;
  if (Number.isNaN(end)) return null;
  return { versionId: schedule.versionId, start, end };
}

/** Pending and live windows. Publish-only schedules occupy their publish minute. */
export function blockedRanges(
  schedules: ScheduleLike[],
  excludeVersionId?: string | null,
): OccupiedRange[] {
  const ranges: OccupiedRange[] = [];
  for (const schedule of schedules) {
    if (schedule.status !== "pending" && schedule.status !== "live") continue;
    if (excludeVersionId && schedule.versionId === excludeVersionId) continue;
    const range = occupiedRange(schedule);
    if (range) ranges.push(range);
  }
  return ranges;
}

export function findConflict(
  candidate: { publishAt: Date; unpublishAt: Date | null },
  ranges: OccupiedRange[],
): OccupiedRange | null {
  const start = truncateToMinute(candidate.publishAt).getTime();
  const end = candidate.unpublishAt
    ? truncateToMinute(candidate.unpublishAt).getTime()
    : start;
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return ranges.find((range) => start <= range.end && range.start <= end) ?? null;
}

export function isMinuteBlocked(timestamp: number, ranges: OccupiedRange[]): boolean {
  const minute = truncateToMinute(new Date(timestamp)).getTime();
  return ranges.some((range) => minute >= range.start && minute <= range.end);
}

function mergeMinutes(
  ranges: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end + MINUTE_MS) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }
  return merged;
}

/** True when every minute of the local calendar day is occupied. */
export function isDayBlocked(day: Date, ranges: OccupiedRange[]): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const dayEnd = dayStart + 24 * 60 * MINUTE_MS - MINUTE_MS;
  const overlapping = ranges
    .filter((range) => range.start <= dayEnd && range.end >= dayStart)
    .map((range) => ({
      start: Math.max(range.start, dayStart),
      end: Math.min(range.end, dayEnd),
    }));
  if (overlapping.length === 0) return false;
  let cursor = dayStart;
  for (const range of mergeMinutes(overlapping)) {
    if (range.start > cursor) return false;
    cursor = range.end + MINUTE_MS;
  }
  return cursor > dayEnd;
}

/**
 * Latest evergreen version other than `excludeVersionId`: direct publishes and
 * publish-only schedules that went live after the last manual unpublish.
 */
export function pickFallbackEvergreen(input: {
  versions: Array<{ versionId: string; source: VersionSource; createdAt: string }>;
  schedules: Array<{
    versionId: string;
    unpublishAt: string | null;
    publishedAt: string | null;
    status: ScheduleStatus;
  }>;
  excludeVersionId: string;
  clearedAt: string | null;
}): string | null {
  const candidates: Array<{ versionId: string; at: string }> = [];
  for (const version of input.versions) {
    if (version.source === "publish") {
      candidates.push({ versionId: version.versionId, at: version.createdAt });
    }
  }
  for (const schedule of input.schedules) {
    if (schedule.unpublishAt || !schedule.publishedAt) continue;
    if (schedule.status !== "live" && schedule.status !== "ended") continue;
    candidates.push({ versionId: schedule.versionId, at: schedule.publishedAt });
  }
  let best: { versionId: string; at: string } | null = null;
  for (const candidate of candidates) {
    if (candidate.versionId === input.excludeVersionId) continue;
    if (input.clearedAt && candidate.at <= input.clearedAt) continue;
    if (!best || candidate.at > best.at) best = candidate;
  }
  return best?.versionId ?? null;
}

export function derivePageStatus(input: {
  schedules: Array<{ status: ScheduleStatus }>;
  liveVersionId: string | null;
  latestVersionId: string | null;
  lastPublishedAt: string | null;
}): PageStatus {
  if (input.schedules.some((schedule) => schedule.status === "pending")) {
    return "scheduled";
  }
  if (input.liveVersionId) {
    return input.latestVersionId === input.liveVersionId ? "published" : "dirty";
  }
  if (input.lastPublishedAt) return "unpublished";
  return "draft";
}

export function versionDisplayStatus(input: {
  source: VersionSource;
  scheduleStatus: ScheduleStatus | null;
  isLive: boolean;
  pageHasPublishHistory: boolean;
  pageIsVisible: boolean;
}): VersionDisplayStatus {
  if (input.scheduleStatus === "pending") return "scheduled";
  if (input.isLive) return "published";
  if (input.scheduleStatus === "ended" || input.scheduleStatus === "live") {
    return "unpublished";
  }
  if (
    !input.pageIsVisible &&
    input.pageHasPublishHistory &&
    input.source === "publish"
  ) {
    return "unpublished";
  }
  if (input.pageHasPublishHistory && input.pageIsVisible && !input.isLive) {
    return "outdated";
  }
  return "draft";
}

export type ScheduleSummary = {
  versionId: string;
  versionNumber: number;
  title: string;
  publishAt: string;
  unpublishAt: string | null;
  unpublishedAt: string | null;
  status: ScheduleStatus;
  lastError: string | null;
  updatedAt: string;
};
