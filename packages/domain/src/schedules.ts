import { canManageWorkspace, type MembershipRole } from "./roles";

export const SCHEDULE_FREQUENCIES = ["weekly", "monthly", "every_n_days", "once"] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

export const JOB_STATUSES = ["pending", "created", "skipped", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type LocalDate = {
  year: number;
  month: number;
  day: number;
};

export type LocalDateTime = LocalDate & {
  hour: number;
  minute: number;
};

export type ScheduleRuleInput = {
  frequency: ScheduleFrequency;
  timeZone: string;
  localHour: number;
  localMinute: number;
  weekday?: Weekday;
  dayOfMonth?: number;
  intervalDays?: number;
  onceLocalDate?: LocalDate;
};

export function canManageSchedules(role: MembershipRole): boolean {
  return canManageWorkspace(role);
}

export function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

export function formatLocalDate(date: LocalDate): string {
  return `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
}

export function parseLocalDate(value: string): LocalDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const utc = Date.UTC(date.year, date.month - 1, date.day) + days * 86_400_000;
  const next = new Date(utc);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function partNumber(parts: Intl.DateTimeFormatPart[], type: string): number {
  return Number(parts.find((part) => part.type === type)?.value);
}

export function localDateTimeInZone(instant: Date, timeZone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  return {
    year: partNumber(parts, "year"),
    month: partNumber(parts, "month"),
    day: partNumber(parts, "day"),
    hour: partNumber(parts, "hour"),
    minute: partNumber(parts, "minute"),
  };
}

export function localDateInZone(instant: Date, timeZone: string): LocalDate {
  const dt = localDateTimeInZone(instant, timeZone);
  return { year: dt.year, month: dt.month, day: dt.day };
}

/**
 * Convert a civil date+time in `timeZone` to a UTC instant.
 * Uses an offset correction so Sydney (and DST) dates are not UTC dates.
 */
export function localDateTimeToUtc(
  date: LocalDate,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);
  const seen = localDateTimeInZone(new Date(guess), timeZone);
  const seenMs = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0);
  const wantedMs = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);
  return new Date(guess + (wantedMs - seenMs));
}

const WEEKDAY_INDEX: Record<string, Weekday> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function localWeekday(date: LocalDate, timeZone: string): Weekday {
  const noon = localDateTimeToUtc(date, 12, 0, timeZone);
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  return WEEKDAY_INDEX[name] ?? 0;
}

export function jobDedupKey(scheduleRuleId: string, localDate: LocalDate | string): string {
  const date = typeof localDate === "string" ? localDate : formatLocalDate(localDate);
  return `${scheduleRuleId}:${date}`;
}

export function planCreateJob(input: {
  existingKeys: readonly string[];
  scheduleRuleId: string;
  localDate: LocalDate | string;
}): { ok: true; key: string } | { ok: false; error: "duplicate" } {
  const key = jobDedupKey(input.scheduleRuleId, input.localDate);
  if (input.existingKeys.includes(key)) return { ok: false, error: "duplicate" };
  return { ok: true, key };
}

export function nextOccurrence(rule: ScheduleRuleInput, after: LocalDate): LocalDate | null {
  switch (rule.frequency) {
    case "weekly": {
      const weekday = rule.weekday ?? 5;
      let cursor = addLocalDays(after, 1);
      for (let i = 0; i < 8; i += 1) {
        if (localWeekday(cursor, rule.timeZone) === weekday) return cursor;
        cursor = addLocalDays(cursor, 1);
      }
      return null;
    }
    case "monthly": {
      const wanted = Math.min(Math.max(rule.dayOfMonth ?? 1, 1), 31);
      let year = after.year;
      let month = after.month;
      for (let i = 0; i < 14; i += 1) {
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
        const day = Math.min(wanted, daysInMonth(year, month));
        const candidate = { year, month, day };
        if (compareLocalDate(candidate, after) > 0) return candidate;
      }
      return null;
    }
    case "every_n_days": {
      const n = Math.max(rule.intervalDays ?? 1, 1);
      return addLocalDays(after, n);
    }
    case "once": {
      if (!rule.onceLocalDate) return null;
      return compareLocalDate(rule.onceLocalDate, after) > 0 ? rule.onceLocalDate : null;
    }
    default:
      return null;
  }
}

/** First due local date on or after `from` (inclusive). */
export function firstDueOnOrAfter(rule: ScheduleRuleInput, from: LocalDate): LocalDate | null {
  switch (rule.frequency) {
    case "weekly": {
      const weekday = rule.weekday ?? 5;
      let cursor = from;
      for (let i = 0; i < 8; i += 1) {
        if (localWeekday(cursor, rule.timeZone) === weekday) return cursor;
        cursor = addLocalDays(cursor, 1);
      }
      return null;
    }
    case "monthly": {
      const wanted = Math.min(Math.max(rule.dayOfMonth ?? 1, 1), 31);
      const thisMonthDay = Math.min(wanted, daysInMonth(from.year, from.month));
      const thisMonth = { year: from.year, month: from.month, day: thisMonthDay };
      if (compareLocalDate(thisMonth, from) >= 0) return thisMonth;
      return nextOccurrence(rule, from);
    }
    case "every_n_days":
      return from;
    case "once": {
      if (!rule.onceLocalDate) return null;
      return compareLocalDate(rule.onceLocalDate, from) >= 0 ? rule.onceLocalDate : null;
    }
    default:
      return null;
  }
}

export function dueAtForLocalDate(rule: ScheduleRuleInput, localDate: LocalDate): Date {
  return localDateTimeToUtc(localDate, rule.localHour, rule.localMinute, rule.timeZone);
}

export type DueState = "upcoming" | "due_today" | "overdue";

export function dueState(dueAt: Date, now: Date, timeZone: string): DueState {
  if (now.getTime() > dueAt.getTime()) return "overdue";
  if (
    formatLocalDate(localDateInZone(dueAt, timeZone)) ===
    formatLocalDate(localDateInZone(now, timeZone))
  ) {
    return "due_today";
  }
  return "upcoming";
}

const NUMBER_SUFFIX = /-(\d+)$/;

export function nextInspectionNumber(existing: readonly string[], prefix: string): string {
  const head = prefix.replace(/-+$/, "");
  let max = 1000;
  for (const number of existing) {
    if (!number.startsWith(`${head}-`)) continue;
    const match = NUMBER_SUFFIX.exec(number);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return `${head}-${max + 1}`;
}
