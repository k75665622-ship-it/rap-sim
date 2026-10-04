// ─── GAME CLOCK ────────────────────────────────────────────────────────────
// Every date in this app comes from the GAME calendar, never the machine clock.
// `GameDate` uses a real calendar, so a serial number is just days since epoch
// and week boundaries are real weekdays — which is what lets the chart week end
// on a Saturday the way a real one does.

import type { GameDate } from '../types/game';

const MS_PER_DAY = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dateToSerial(d: GameDate): number {
  return Math.floor(Date.UTC(d.year, d.month - 1, d.day) / MS_PER_DAY);
}

export function serialToDate(n: number): GameDate {
  const d = new Date(n * MS_PER_DAY);
  return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export function serialWeekday(n: number): number {
  return new Date(n * MS_PER_DAY).getUTCDay();
}

/** 'DD/MM/YYYY' — the format the save file already uses. */
export function parseGameDate(s: string | undefined | null): GameDate | null {
  if (!s) return null;
  const [d, m, y] = s.split('/').map(Number);
  if (!d || !m || !y) return null;
  return { day: d, month: m, year: y };
}

export function serialOf(s: string | undefined | null, fallback: number): number {
  const parsed = parseGameDate(s);
  return parsed ? dateToSerial(parsed) : fallback;
}

export function formatGameDate(d: GameDate): string {
  return `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`;
}

/** '14 Jun 2024' */
export function formatMedium(d: GameDate): string {
  return `${d.day} ${MONTHS[d.month - 1]} ${d.year}`;
}

/** '14 Jun' */
export function formatShort(d: GameDate): string {
  return `${d.day} ${MONTHS[d.month - 1]}`;
}

/** 'Sat 14 Jun' — the label a chart week carries. */
export function formatWeekEnding(d: GameDate): string {
  return `${DAYS[serialWeekday(dateToSerial(d))]} ${formatShort(d)}`;
}

/**
 * '08:42' from minutes past midnight. The time of day on the game clock, which
 * is what every "as of" label in the app reads from — never the machine clock.
 */
export function formatClockTime(minute: number | undefined): string {
  const m = Math.floor((((minute ?? 0) % 1440) + 1440) % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function formatLong(d: GameDate): string {
  return `${DAYS[serialWeekday(dateToSerial(d))]}, ${formatMedium(d)}`;
}

export function isSaturday(d: GameDate): boolean {
  return serialWeekday(dateToSerial(d)) === 6;
}

/**
 * The Saturday that closes the week a date falls in. If the date IS a Saturday
 * the week ends today — that is the day a new chart publishes.
 */
export function chartWeekEnding(d: GameDate): GameDate {
  const s = dateToSerial(d);
  const wd = serialWeekday(s);
  return serialToDate(s + (6 - wd));
}

/**
 * The serial of the most recent Saturday that has actually been reached.
 *
 * This is the week a chart can be published FOR. `chartWeekEnding` returns the
 * Saturday of the week a date is in, which is in the future on every day but
 * Saturday — and publishing a chart for a week that has not finished put a
 * future date on the board and burned the week before it happened.
 */
export function lastCompletedWeekSerial(d: GameDate): number {
  const s = dateToSerial(d);
  const end = dateToSerial(chartWeekEnding(d));
  return serialWeekday(s) === 6 ? end : end - 7;
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetween(a: GameDate, b: GameDate): number {
  return dateToSerial(b) - dateToSerial(a);
}

/**
 * "3 hours ago" / "2 days ago" / "1 year ago", measured on the game clock.
 *
 * Sub-day granularity is derived from the upload's own seeded minute offset, so
 * something uploaded today can read "20 minutes ago" without the game needing an
 * hour-by-hour clock. Anything older than a day counts in days.
 */
export function relativeAge(uploadSerial: number, nowSerial: number, minuteOfDay: number): string {
  const days = nowSerial - uploadSerial;
  if (days < 0) return 'just now';
  if (days === 0) {
    const minutes = Math.max(1, minuteOfDay);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 35) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return '1 month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/** Short age for dense rows: '2d', '3w', '5mo', '1y'. */
export function shortAge(uploadSerial: number, nowSerial: number): string {
  const days = Math.max(0, nowSerial - uploadSerial);
  if (days === 0) return 'today';
  if (days < 7) return `${days}d`;
  if (days < 35) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

// ─── GAME EPOCH ────────────────────────────────────────────────────────────
// One fixed starting date for the whole simulation. It lives here so the clock
// and the store cannot disagree about when the world began, and so a "Week 12"
// label on a chart is derived from the calendar rather than stored by hand.

export const GAME_EPOCH: GameDate = { day: 1, month: 1, year: 2024 };
export const GAME_EPOCH_SERIAL = dateToSerial(GAME_EPOCH);

/** Which tracking week of the simulation a date falls in. Week 1 is the first. */
export function weekIndexOf(d: GameDate): number {
  const end = dateToSerial(chartWeekEnding(d));
  return Math.max(1, Math.floor((end - GAME_EPOCH_SERIAL) / 7) + 1);
}
