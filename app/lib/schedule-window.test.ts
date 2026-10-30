import assert from "node:assert/strict";
import { test } from "node:test";

import {
  blockedRanges,
  derivePageStatus,
  earliestPublishAt,
  findConflict,
  isDayBlocked,
  isMinuteBlocked,
  pickFallbackEvergreen,
  validateLiveUnpublish,
  validateWindow,
  versionDisplayStatus,
} from "./schedule-window";

const minute = (iso: string) => new Date(iso);

test("publish-only schedule blocks a single minute", () => {
  const ranges = blockedRanges([
    {
      versionId: "v2",
      publishAt: "2026-01-01T04:15:00.000Z",
      unpublishAt: null,
      status: "pending",
    },
  ]);
  assert.equal(ranges.length, 1);
  assert.equal(isMinuteBlocked(minute("2026-01-01T04:15:00.000Z").getTime(), ranges), true);
  assert.equal(isMinuteBlocked(minute("2026-01-01T04:16:00.000Z").getTime(), ranges), false);
});

test("bounded windows are inclusive and the next minute is free", () => {
  const ranges = blockedRanges([
    {
      versionId: "v2",
      publishAt: "2026-01-01T04:15:00.000Z",
      unpublishAt: "2026-01-01T22:23:00.000Z",
      status: "pending",
    },
  ]);
  const conflict = findConflict(
    {
      publishAt: minute("2026-01-01T22:23:00.000Z"),
      unpublishAt: minute("2026-01-02T00:00:00.000Z"),
    },
    ranges,
  );
  assert.ok(conflict);
  const next = findConflict(
    {
      publishAt: minute("2026-01-01T22:24:00.000Z"),
      unpublishAt: null,
    },
    ranges,
  );
  assert.equal(next, null);
});

test("ended schedules and the version being edited do not block", () => {
  const ranges = blockedRanges(
    [
      {
        versionId: "self",
        publishAt: "2026-02-01T00:00:00.000Z",
        unpublishAt: "2026-02-02T00:00:00.000Z",
        status: "pending",
      },
      {
        versionId: "old",
        publishAt: "2026-03-01T00:00:00.000Z",
        unpublishAt: "2026-03-02T00:00:00.000Z",
        status: "ended",
      },
    ],
    "self",
  );
  assert.deepEqual(ranges, []);
});

test("unpublish must be at least a minute after publish", () => {
  const now = minute("2026-01-01T00:00:00.000Z");
  assert.equal(
    validateWindow({
      publishAt: minute("2026-01-01T00:02:00.000Z"),
      unpublishAt: minute("2026-01-01T00:02:00.000Z"),
      now,
    }),
    "Unpublish time must be at least 1 minute after publish time",
  );
  assert.equal(
    validateWindow({
      publishAt: minute("2026-01-01T00:02:00.000Z"),
      unpublishAt: minute("2026-01-01T00:03:00.000Z"),
      now,
    }),
    null,
  );
});

test("live window unpublish must stay ahead of now and publish", () => {
  const now = minute("2026-01-01T10:00:00.000Z");
  const publishAt = minute("2026-01-01T09:00:00.000Z");
  assert.equal(
    validateLiveUnpublish({ publishAt, unpublishAt: minute("2026-01-01T10:00:30.000Z"), now }),
    "Unpublish time must be at least 1 minute in the future",
  );
  assert.equal(
    validateLiveUnpublish({ publishAt, unpublishAt: minute("2026-01-01T10:01:00.000Z"), now }),
    null,
  );
  assert.equal(validateLiveUnpublish({ publishAt, unpublishAt: null, now }), null);
});

test("fallback evergreen skips the excluded version and anything before a manual unpublish", () => {
  const versions = [
    { versionId: "direct-old", source: "publish" as const, createdAt: "2026-01-01T00:00:00.000Z" },
    { versionId: "draft", source: "manual_save" as const, createdAt: "2026-01-05T00:00:00.000Z" },
  ];
  const schedules = [
    {
      versionId: "sched-evergreen",
      unpublishAt: null,
      publishedAt: "2026-01-03T00:00:00.000Z",
      status: "live" as const,
    },
    {
      versionId: "bounded",
      unpublishAt: "2026-01-04T12:00:00.000Z",
      publishedAt: "2026-01-04T00:00:00.000Z",
      status: "ended" as const,
    },
    {
      versionId: "current",
      unpublishAt: "2026-02-01T00:00:00.000Z",
      publishedAt: "2026-01-06T00:00:00.000Z",
      status: "live" as const,
    },
  ];
  assert.equal(
    pickFallbackEvergreen({ versions, schedules, excludeVersionId: "current", clearedAt: null }),
    "sched-evergreen",
  );
  assert.equal(
    pickFallbackEvergreen({
      versions,
      schedules,
      excludeVersionId: "current",
      clearedAt: "2026-01-03T12:00:00.000Z",
    }),
    null,
  );
});

test("earliest publish minute stays a full minute ahead", () => {
  const now = minute("2026-01-01T00:00:30.000Z");
  assert.equal(earliestPublishAt(now).toISOString(), "2026-01-01T00:02:00.000Z");
});

test("a day is blocked only when every minute is occupied", () => {
  const full = blockedRanges([
    {
      versionId: "all-day",
      publishAt: new Date(2026, 3, 1, 0, 0, 0, 0).toISOString(),
      unpublishAt: new Date(2026, 3, 1, 23, 59, 0, 0).toISOString(),
      status: "live",
    },
  ]);
  assert.equal(isDayBlocked(new Date(2026, 3, 1, 12, 0, 0, 0), full), true);
  const partial = blockedRanges([
    {
      versionId: "noon",
      publishAt: new Date(2026, 3, 2, 12, 0, 0, 0).toISOString(),
      unpublishAt: new Date(2026, 3, 2, 13, 0, 0, 0).toISOString(),
      status: "pending",
    },
  ]);
  assert.equal(isDayBlocked(new Date(2026, 3, 2, 12, 0, 0, 0), partial), false);
});

test("page and version status follow visibility and schedule", () => {
  assert.equal(
    derivePageStatus({
      schedules: [{ status: "pending" }],
      liveVersionId: "v1",
      latestVersionId: "v2",
      lastPublishedAt: "2026-01-01T00:00:00.000Z",
    }),
    "scheduled",
  );
  assert.equal(
    derivePageStatus({
      schedules: [],
      liveVersionId: null,
      latestVersionId: "v1",
      lastPublishedAt: "2026-01-01T00:00:00.000Z",
    }),
    "unpublished",
  );
  assert.equal(
    versionDisplayStatus({
      source: "manual_save",
      scheduleStatus: null,
      isLive: false,
      pageHasPublishHistory: true,
      pageIsVisible: true,
    }),
    "outdated",
  );
  assert.equal(
    versionDisplayStatus({
      source: "publish",
      scheduleStatus: null,
      isLive: false,
      pageHasPublishHistory: true,
      pageIsVisible: false,
    }),
    "unpublished",
  );
});
