import { format, formatDistanceToNow } from "date-fns";
import type { TimelineItem } from "./types";

export function errText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Something went wrong";
}

export function formatLongDate(iso: string | null): string {
  const date = parseDay(iso);
  if (!date) return "Date not set";
  return format(date, "MMMM d, yyyy");
}

export function formatShortDate(iso: string | null): string {
  const date = parseDay(iso);
  if (!date) return "No date";
  return format(date, "MMM d");
}

export function formatWeekday(iso: string | null): string {
  const date = parseDay(iso);
  if (!date) return "Date not set";
  return format(date, "EEEE, MMMM d");
}

export function daysUntil(iso: string | null, now = new Date()): number | null {
  const date = parseDay(iso);
  if (!date) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date.getTime() - start.getTime()) / 86_400_000);
}

export function daysLabel(iso: string | null, now = new Date()): string {
  const days = daysUntil(iso, now);
  if (days === null) return "Date not set";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "event";
}

export function parseTimeToMinutes(raw: string): number | null {
  const match = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a|am|p|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const ap = match[3];
  if (hour > 23 || minute > 59) return null;
  if (ap?.startsWith("p") && hour < 12) hour += 12;
  if (ap?.startsWith("a") && hour === 12) hour = 0;
  if (!ap && hour <= 23) {
    /* 24h or ambiguous — keep as written */
  }
  return hour * 60 + minute;
}

export function sameDay(iso: string | null, now = new Date()): boolean {
  return daysUntil(iso, now) === 0;
}

export type TimelineFocus = {
  live: boolean;
  current: TimelineItem | null;
  next: TimelineItem | null;
  rest: TimelineItem[];
};

export function timelineFocus(
  items: TimelineItem[],
  eventDate: string | null,
  now = new Date(),
): TimelineFocus {
  const rows = items.filter((item) => item.label.trim() || item.time.trim());
  const live = sameDay(eventDate, now);
  if (!live) {
    return { live: false, current: null, next: rows[0] ?? null, rest: rows.slice(1, 8) };
  }
  const mins = now.getHours() * 60 + now.getMinutes();
  let nextIndex = rows.findIndex((item) => {
    const time = parseTimeToMinutes(item.time);
    return time !== null && time >= mins;
  });
  if (nextIndex === -1) nextIndex = rows.length;
  return {
    live: true,
    current: nextIndex > 0 ? rows[nextIndex - 1] : null,
    next: rows[nextIndex] ?? null,
    rest: rows.slice(nextIndex + (rows[nextIndex] ? 1 : 0), nextIndex + 7),
  };
}

function parseDay(iso: string | null): Date | null {
  if (!iso) return null;
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
