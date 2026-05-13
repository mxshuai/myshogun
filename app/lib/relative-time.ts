/** 服务端或客户端均可：生成类似「7 minutes ago」的英文相对时间 */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffSec = Math.round((now - then) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (diffSec < 45 && diffSec >= 0) return "just now";
  if (diffSec < 0) return rtf.format(Math.ceil(diffSec / 60), "minute");

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return rtf.format(-diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return rtf.format(-diffMonth, "month");
  const diffYear = Math.round(diffDay / 365);
  return rtf.format(-diffYear, "year");
}

/** 将来发布时间：如 Publishes in 1 month（与 Scheduled 状态配套） */
export function formatPublishesIn(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (diffSec <= 60) return "Publishing soon";

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `Publishes ${rtf.format(diffMin, "minute")}`;
  const diffHour = Math.round(diffSec / 3600);
  if (diffHour < 24) return `Publishes ${rtf.format(diffHour, "hour")}`;
  const diffDay = Math.round(diffSec / 86400);
  if (diffDay < 7) return `Publishes ${rtf.format(diffDay, "day")}`;
  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `Publishes ${rtf.format(diffWeek, "week")}`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `Publishes ${rtf.format(diffMonth, "month")}`;
  const diffYear = Math.round(diffDay / 365);
  return `Publishes ${rtf.format(diffYear, "year")}`;
}
