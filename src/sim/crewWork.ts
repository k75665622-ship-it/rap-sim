// ─── WHO ACTUALLY WORKS ────────────────────────────────────────────────────
//
// A CV tells you what somebody can do. The weeks tell you what they will do.
//
// Everybody on the payroll has a way of working, and it comes from who they
// are (`sim/traits.ts`): the hard worker who sends a second pass nobody asked
// for, the lazy one who does the minimum and some weeks nothing at all, the
// smart operator who is quiet for a month and then turns up exactly when it
// matters, the wildcard who is brilliant one week and unreachable the next.
//
// You don't see it on day one. You find out by working with them — a month in,
// you know. Every week is counted; every month is graded; two bad months in a
// row and your manager says what everybody is thinking. Warn them, praise
// them, or let them go — and how each lands depends on who they are.
//
// Pure: the store applies what comes back.

import type { CrewMember, CrewPerf, CrewWeeks, HiddenTrait, VisibleTrait } from '../types/game';
import { hashString } from './rng';

export type WorkStyle = 'grinder' | 'coaster' | 'timer' | 'wildcard' | 'hothead' | 'mercenary' | 'diva' | 'loyalist' | 'steady';

export const WORK_STYLE: Record<WorkStyle, { label: string; emoji: string; line: string }> = {
  grinder: { label: 'Hard worker', emoji: '💪🏾', line: 'Fights for you. Extra work nobody asked for — and no invoice for it.' },
  coaster: { label: 'Lazy', emoji: '🛋️', line: 'Does the minimum, needs chasing, and some weeks does nothing at all.' },
  timer: { label: 'Smart operator', emoji: '⏱️', line: 'Quiet most weeks — then shows up exactly when it matters.' },
  wildcard: { label: 'Wildcard', emoji: '🎲', line: 'Brilliant one week, unreachable the next.' },
  hothead: { label: 'Hothead', emoji: '🌋', line: 'Gets results and starts fights.' },
  mercenary: { label: 'In it for the money', emoji: '💵', line: 'Works for the cheque — and the work follows the money.' },
  diva: { label: 'Ego', emoji: '👑', line: 'Good, and needs everybody to know it was them.' },
  loyalist: { label: 'Ride or die', emoji: '🤝🏾', line: 'Turns down other jobs to stay on yours.' },
  steady: { label: 'Steady', emoji: '📏', line: 'Does the job. No drama, no miracles.' },
};

/** How somebody works, from who they are. The first trait that decides it wins. */
export function workStyleOf(m: { hidden?: HiddenTrait[]; visible?: VisibleTrait[] }): WorkStyle {
  const h = m.hidden ?? [];
  const v = m.visible ?? [];
  if (h.includes('lazy')) return 'coaster';
  if (h.includes('hard_working')) return 'grinder';
  if (v.includes('smart')) return 'timer';
  if (h.includes('volatile')) return 'wildcard';
  if (h.includes('anger_issues')) return 'hothead';
  if (h.includes('greedy')) return 'mercenary';
  if (h.includes('egotistical')) return 'diva';
  if (h.includes('loyal')) return 'loyalist';
  return 'steady';
}

export type EffortKind = keyof CrewWeeks;
export interface WeekEffort { kind: EffortKind; mult: number }

/**
 * How this week went for them. `bigWeek` is a week that matters — a release,
 * a show, an award night — which is when a smart operator earns the wage.
 * `warned` is a warning still ringing in their ears.
 */
export function weekEffort(style: WorkStyle, morale: number, roll: number, bigWeek: boolean, warned: boolean): WeekEffort {
  // Unhappy people coast. Everybody, a little; some, a lot.
  const sour = morale < 35 ? 0.12 : morale < 50 ? 0.05 : 0;
  switch (style) {
    case 'coaster': {
      const skip = (warned ? 0.1 : 0.28) + sour;
      if (roll < skip) return { kind: 'none', mult: 0 };
      return roll > 0.93 && bigWeek ? { kind: 'normal', mult: 1 } : { kind: 'low', mult: 0.75 };
    }
    case 'grinder':
      if (roll < 0.26 - sour) return { kind: 'extra', mult: 1.7 };
      return { kind: 'normal', mult: 1.15 };
    case 'timer':
      if (bigWeek) return { kind: 'clutch', mult: 1.9 };
      if (roll < 0.2 + sour) return { kind: 'low', mult: 0.6 };
      return { kind: 'normal', mult: 0.95 };
    case 'wildcard':
      if (roll < (warned ? 0.14 : 0.22) + sour) return { kind: 'none', mult: 0 };
      if (roll > 0.74) return { kind: 'extra', mult: 2 };
      return { kind: 'normal', mult: 1 };
    case 'hothead':
      if (roll < 0.08 + sour) return { kind: 'none', mult: 0 };
      if (roll > 0.85) return { kind: 'extra', mult: 1.5 };
      return { kind: 'normal', mult: 1.05 };
    case 'mercenary':
      if (roll < sour * 2.5) return { kind: 'low', mult: 0.7 };
      return { kind: 'normal', mult: 1 };
    case 'diva':
      if (roll < 0.06 + sour) return { kind: 'low', mult: 0.7 };
      if (bigWeek && roll > 0.8) return { kind: 'extra', mult: 1.4 };
      return { kind: 'normal', mult: 1 };
    case 'loyalist':
      if (roll < 0.13) return { kind: 'extra', mult: 1.5 };
      return { kind: 'normal', mult: 1.05 };
    default:
      if (roll < 0.04 + sour) return { kind: 'none', mult: 0 };
      if (roll > 0.94) return { kind: 'extra', mult: 1.4 };
      return { kind: 'normal', mult: 1 };
  }
}

const pick = <T,>(a: T[], seed: string): T => a[hashString(seed) % a.length];

/** The line on the team page when a week was not a normal week. */
export function effortLine(name: string, kind: EffortKind, style: WorkStyle, seed: string): string | null {
  const n = name.split(' ')[0];
  if (kind === 'none') {
    if (style === 'coaster') return pick([`${n} didn't do anything this week. No message, no work.`, `${n} "was on it" all week. Nothing came in.`, `${n} took the week off and didn't tell anybody.`], seed);
    if (style === 'wildcard') return pick([`${n} went missing this week — phone off, nothing delivered.`, `Nobody could reach ${n} all week.`], seed);
    if (style === 'hothead') return pick([`${n} walked out after an argument and didn't come back till Monday.`, `${n} spent the week fighting with somebody instead of working.`], seed);
    return pick([`${n} was off sick this week.`, `${n} had a family thing — nothing got done.`], seed);
  }
  if (kind === 'extra') {
    if (style === 'grinder') return pick([`${n} put in hours nobody asked for — and it shows.`, `${n} sent a second pass nobody asked for. It was better.`, `${n} was still working at 3am.`], seed);
    if (style === 'wildcard') return pick([`${n} had one of those weeks. Brilliant.`, `${n} came out of nowhere with the best work they've done for you.`], seed);
    if (style === 'loyalist') return pick([`${n} turned down another client's job to finish yours.`, `${n} worked the weekend for you, unpaid.`], seed);
    if (style === 'hothead') return `${n} was angry all week — and turned it into the best work of the month.`;
    return `${n} went beyond the brief this week.`;
  }
  if (kind === 'clutch') return pick([`${n} was quiet all month, then came through exactly when it mattered.`, `When it counted, ${n} was the first one in.`], seed);
  if (kind === 'low') {
    if (style === 'coaster') return pick([`${n} sent the first pass and called it finished.`, `${n} did exactly what was asked. Not one thing more.`], seed);
    if (style === 'timer') return `${n} kept it light this week — saving it for when it matters.`;
    if (style === 'mercenary') return `${n} did the minimum. The money conversation is coming.`;
    if (style === 'diva') return `${n} did the work and spent the rest of the week talking about it.`;
    return `${n} had a slow week.`;
  }
  return null;
}

const EMPTY: CrewWeeks = { none: 0, low: 0, normal: 0, extra: 0, clutch: 0 };

/** Count a week. */
export function recordWeek(perf: CrewPerf | undefined, kind: EffortKind): CrewPerf {
  const out: CrewPerf = perf ? { ...perf, total: { ...perf.total }, month: { ...perf.month }, grades: [...perf.grades] } : { total: { ...EMPTY }, month: { ...EMPTY }, grades: [] };
  out.total[kind] += 1;
  out.month[kind] += 1;
  out.last = kind;
  return out;
}

export const weeksOf = (w: CrewWeeks) => w.none + w.low + w.normal + w.extra + w.clutch;

/** What a month of weeks adds up to. */
export function gradeOf(w: CrewWeeks): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; score: number } | null {
  const n = weeksOf(w);
  if (n < 2) return null;
  const score = (w.low * 0.6 + w.normal + w.extra * 1.45 + w.clutch * 1.6) / n;
  const grade = score >= 1.15 ? 'A' : score >= 0.95 ? 'B' : score >= 0.75 ? 'C' : score >= 0.5 ? 'D' : 'F';
  return { grade, score };
}

/** The review: one line you can hold them to. */
export function reviewLine(name: string, w: CrewWeeks, grade: string, style: WorkStyle, known: boolean): string {
  const n = name.split(' ')[0];
  const weeks = weeksOf(w);
  const delivered = weeks - w.none;
  const parts = [`${delivered}/${weeks} weeks delivered`];
  if (w.extra) parts.push(`${w.extra} beyond the brief`);
  if (w.clutch) parts.push(`came through when it mattered`);
  if (w.none) parts.push(`${w.none} week${w.none > 1 ? 's' : ''} with nothing`);
  const verdict = grade === 'A' ? 'Carried the team.' : grade === 'B' ? 'Solid month.' : grade === 'C' ? 'Did the job, just about.' : grade === 'D' ? 'Not good enough.' : 'Dead weight this month.';
  return `${n}: ${parts.join(', ')}. ${verdict}${known && (grade === 'D' || grade === 'F') ? ` (${WORK_STYLE[style].label.toLowerCase()} — no surprise)` : ''}`;
}

/** Once you've worked together long enough, you know. */
export function knowsStyle(perf: CrewPerf | undefined, monthsServed: number): boolean {
  return monthsServed >= 1 || (perf ? weeksOf(perf.total) >= 4 : false);
}

export interface ManageOutcome { text: string; morale: number; quit?: boolean; warned?: boolean }

/** You told them to pick it up. */
export function warnOutcome(style: WorkStyle, grade: string | undefined, roll: number, name: string): ManageOutcome {
  const n = name.split(' ')[0];
  const deserved = grade === 'D' || grade === 'F' || grade === undefined;
  switch (style) {
    case 'coaster':
      return roll < 0.55
        ? { text: `${n} got the message. "You're right. I'll lock in." Let's see.`, morale: -4, warned: true }
        : { text: `${n} took it badly and is sulking. You'll find out next week if it landed.`, morale: -10, warned: true };
    case 'grinder':
      return { text: `"You're warning ME? I've been here at 3am every night." ${n} is hurt.`, morale: deserved ? -6 : -16 };
    case 'hothead':
      return roll < 0.28
        ? { text: `${n} blew up, said some things, and walked. They quit.`, morale: -30, quit: true }
        : { text: `${n} shouted for five minutes, then went back to work. It might have worked.`, morale: -12, warned: true };
    case 'wildcard':
      return roll < 0.5
        ? { text: `${n} apologised. "I'll be reachable. Promise."`, morale: -4, warned: true }
        : { text: `${n} read the message and didn't answer. Classic.`, morale: -8, warned: true };
    case 'diva':
      return roll < 0.2
        ? { text: `${n} said nobody talks to them like that — and quit.`, morale: -30, quit: true }
        : { text: `${n} is offended but heard you.`, morale: -10, warned: true };
    case 'mercenary':
      return { text: `${n}: "Pay me like the top guys and I'll work like the top guys." They'll pick it up — a bit.`, morale: -6, warned: true };
    case 'loyalist':
      return { text: `${n} took it on the chin. "You're right, boss. Won't happen again."`, morale: -5, warned: true };
    case 'timer':
      return { text: `${n}: "Judge me on the weeks that matter." They're not wrong — but they heard you.`, morale: -5, warned: true };
    default:
      return { text: `${n} heard you. "Understood."`, morale: -4, warned: true };
  }
}

/** You told them they're doing well. */
export function praiseOutcome(style: WorkStyle, name: string): ManageOutcome {
  const n = name.split(' ')[0];
  switch (style) {
    case 'diva': return { text: `${n} screenshotted it. They'll be unbearable — and working harder.`, morale: 12 };
    case 'mercenary': return { text: `${n}: "Appreciate it. Praise is nice. A bonus is nicer."`, morale: 3 };
    case 'coaster': return { text: `${n} relaxed a little too much after that.`, morale: 6 };
    case 'grinder': return { text: `${n} needed to hear that. They're going even harder now.`, morale: 10 };
    case 'loyalist': return { text: `${n}: "Always, boss. Always."`, morale: 9 };
    default: return { text: `${n} appreciated it.`, morale: 8 };
  }
}

/** Does this crew member have a reason to want a raise, given how they work? */
export function wantsRaise(m: CrewMember, style: WorkStyle, roll: number): boolean {
  if (style !== 'mercenary' && style !== 'diva') return false;
  return (m.morale ?? 70) < 60 && roll < 0.3;
}
