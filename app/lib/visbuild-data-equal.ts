import type { Data } from "@puckeditor/core";

/** Stable JSON-like serialization so key order does not affect equality. */
export function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}

export function visbuildDataEqual(a: Data, b: Data): boolean {
  return stableSerialize(a) === stableSerialize(b);
}
