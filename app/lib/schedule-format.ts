export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatScheduleInstant(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatScheduleLine(
  publishAt: string,
  unpublishAt: string | null,
): string {
  const publish = formatScheduleInstant(publishAt);
  if (!unpublishAt) return `Publish ${publish}`;
  return `Publish ${publish} · Unpublish ${formatScheduleInstant(unpublishAt)}`;
}

export function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
