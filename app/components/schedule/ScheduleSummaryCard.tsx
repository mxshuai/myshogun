"use client";

import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { formatRelativeTime } from "~/lib/relative-time";
import { formatScheduleInstant } from "~/lib/schedule-format";
import type { ScheduleStatus } from "~/lib/server/types";

const PUBLISH_ARROW = "#2e7d32";
const UNPUBLISH_ARROW = "#b45309";

export type ScheduleSummaryCardData = {
  title: string;
  versionNumber: number;
  updatedAt: string;
  publishAt: string;
  unpublishAt: string | null;
  unpublishedAt?: string | null;
  status?: ScheduleStatus;
};

const PENDING_BORDER = "rgba(167, 139, 250, 0.3)";
const LIVE_OPEN_BORDER = "rgba(129, 199, 132, 0.3)";
const LIVE_WAITING_UNPUBLISH_BORDER = "rgba(27, 94, 32, 0.3)";
const ENDED_BORDER = "rgba(158, 158, 158, 0.3)";
const FAILED_BORDER = "rgba(239, 83, 80, 0.3)";

export function scheduleCardBorderColor(
  schedule: Pick<ScheduleSummaryCardData, "status" | "unpublishAt" | "unpublishedAt">,
): string | undefined {
  if (schedule.status === "pending") return PENDING_BORDER;
  if (schedule.status === "failed") return FAILED_BORDER;
  if (schedule.status === "ended") return ENDED_BORDER;
  if (
    schedule.status === "live" &&
    schedule.unpublishAt &&
    !schedule.unpublishedAt
  ) {
    return LIVE_WAITING_UNPUBLISH_BORDER;
  }
  if (schedule.status === "live") return LIVE_OPEN_BORDER;
  return undefined;
}

function ScheduleTimingRow({
  kind,
  at,
}: {
  kind: "publish" | "unpublish";
  at: string;
}) {
  const label = kind === "publish" ? "Publish" : "Unpublish";
  const Icon = kind === "publish" ? ArrowUpwardIcon : ArrowDownwardIcon;
  const iconColor = kind === "publish" ? PUBLISH_ARROW : UNPUBLISH_ARROW;

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        gap: 1.25,
        py: 1.25,
        px: 2,
      }}
    >
      <Icon sx={{ fontSize: 18, color: iconColor, flexShrink: 0 }} aria-hidden />
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: "0.875rem",
          color: "text.primary",
          minWidth: 76,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.875rem", color: "text.primary", flex: 1 }}>
        {formatScheduleInstant(at)}
      </Typography>
    </Stack>
  );
}

const cardShellSx = {
  display: "flex",
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  mb: 1.5,
  p: 0,
  flexDirection: "column",
  alignItems: "stretch",
  bgcolor: "background.paper",
} as const;

function ScheduleSummaryCardBody({
  schedule,
  footer,
}: {
  schedule: ScheduleSummaryCardData;
  footer?: React.ReactNode;
}) {
  return (
    <>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2,
          py: 1.5,
        }}
      >
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "text.primary",
          }}
        >
          {schedule.title}{" "}
          <Box component="span" sx={{ fontWeight: 400 }}>
            (Version {schedule.versionNumber})
          </Box>
        </Typography>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", color: "text.secondary", flexShrink: 0 }}
        >
          <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} aria-hidden />
          <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
            {formatRelativeTime(schedule.updatedAt)}
          </Typography>
        </Stack>
      </Stack>

      <Divider />

      <Box>
        <ScheduleTimingRow kind="publish" at={schedule.publishAt} />
        {schedule.unpublishAt ? (
          <>
            <Divider />
            <ScheduleTimingRow kind="unpublish" at={schedule.unpublishAt} />
          </>
        ) : null}
      </Box>

      {footer}
    </>
  );
}

function cardBorderSx(schedule: ScheduleSummaryCardData) {
  const borderColor = scheduleCardBorderColor(schedule);
  if (!borderColor) return {};
  return { borderColor, borderWidth: 2 };
}

/** Read-only card (e.g. unpublish confirm). */
export function ScheduleSummaryCard({ schedule }: { schedule: ScheduleSummaryCardData }) {
  return (
    <Box sx={{ ...cardShellSx, ...cardBorderSx(schedule) }}>
      <ScheduleSummaryCardBody schedule={schedule} />
    </Box>
  );
}

/** Clickable card (scheduled versions list). */
export function ScheduleSummaryCardButton({
  schedule,
  onClick,
  footer,
}: {
  schedule: ScheduleSummaryCardData;
  onClick: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        ...cardShellSx,
        ...cardBorderSx(schedule),
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <ScheduleSummaryCardBody schedule={schedule} footer={footer} />
    </ListItemButton>
  );
}
