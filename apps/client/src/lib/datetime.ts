// Convert between UTC instants and <input type="datetime-local"> wall time in a
// given IANA timezone (e.g. an event's "Africa/Cairo"), independent of the
// admin's own device timezone.

export const DEFAULT_EVENT_TZ = "Africa/Cairo";

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Milliseconds to add to a UTC instant to get wall-clock time in `tz` (0 for an invalid zone). */
function tzOffsetMs(date: Date, tz: string): number {
  if (!isValidTimeZone(tz)) return 0;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function toZonedInput(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + tzOffsetMs(d, tz)).toISOString().slice(0, 16);
}

export function fromZonedInput(value: string, tz: string): string | undefined {
  if (!value) return undefined;
  const wall = Date.parse(`${value}:00Z`);
  if (Number.isNaN(wall)) return undefined;
  // Two passes so instants near a DST change resolve to the right offset.
  let t = wall - tzOffsetMs(new Date(wall), tz);
  t = wall - tzOffsetMs(new Date(t), tz);
  return new Date(t).toISOString();
}
