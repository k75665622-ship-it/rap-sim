// ─── WORK IN PROGRESS ──────────────────────────────────────────────────────
//
// A session is not a button. When the editor says six days, six days have to
// pass — and while they pass the artist is free, because the energy was spent
// when the room was booked rather than while they were locked in it.
//
// This module owns the two things the rest of the app needs to agree on:
//
//   · what a job is CALLED and how far along it is (the card, the progress bar,
//     the "3 days left" line), and
//   · how many days a video shoot is worth, which is the one day-count that did
//     not already have a home in `sim/studio.ts`.
//
// The day counts for recording and mixing live in `sim/studio.ts` and in
// `mixMasterSong` respectively — this does NOT duplicate them.

import type { WorkItem } from '../types/game';
import { serialToDate } from './gameClock';
import { formatMedium } from './gameClock';

export const WORK_KIND_EMOJI: Record<WorkItem['kind'], string> = {
  record: '🎛️',
  mix: '🎚️',
  video: '🎬',
  verse: '✍️',
};

export const WORK_KIND_LABEL: Record<WorkItem['kind'], string> = {
  record: 'Recording',
  mix: 'Mixing',
  video: 'Shooting',
  verse: 'Writing a verse',
};

/**
 * How many days a shoot is worth, from what is being spent on it.
 *
 * A phone video in one location is a day. A proper production with a director,
 * a crew and a marketing push is a week of the artist's life. Anchored at
 * $75,000 a day, clamped to 1–6, so the number is legible from the budget the
 * player already chose rather than being a second decision they never made.
 */
export function videoShootDays(budget: number): number {
  const days = 1 + Math.floor(Math.max(0, budget) / 75_000);
  return Math.max(1, Math.min(6, days));
}

/** 0 … 1. The bar on the card. */
export function workProgress(item: WorkItem): number {
  if (item.daysTotal <= 0) return 1;
  return Math.max(0, Math.min(1, item.daysDone / item.daysTotal));
}

/** Whole days still to go. 0 on the day it lands. */
export function workDaysLeft(item: WorkItem): number {
  return Math.max(0, item.daysTotal - item.daysDone);
}

/**
 * The date the job finishes, derived from when it started rather than from the
 * clock at the moment the tick happens to notice. A 30-day sim must not date a
 * 6-day session as if it took a month.
 */
export function workEta(item: WorkItem): string {
  return formatMedium(serialToDate(item.startedSerial + item.daysTotal));
}

/** The line under the title on the card: `Day 4 of 6 · ready 19 Sep`. */
export function workEtaLine(item: WorkItem): string {
  const done = Math.min(item.daysDone, item.daysTotal);
  return `Day ${done} of ${item.daysTotal} · ready ${workEta(item)}`;
}

/** Sort key so the job closest to landing is at the top of the card. */
export function byWorkAlmostDone(a: WorkItem, b: WorkItem): number {
  return workDaysLeft(a) - workDaysLeft(b);
}
