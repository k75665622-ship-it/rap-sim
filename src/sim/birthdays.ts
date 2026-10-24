// ─── BIRTHDAYS ─────────────────────────────────────────────────────────────
//
// Once a year it's your day. A week out, your people ask the question every
// artist gets asked: party, dinner, studio — or is it just a normal day? A
// party costs money and is a room full of people who either turn up or don't,
// and who turns up says a lot about where you are. A dinner is the people who
// actually matter. A studio birthday is a statement. A normal day is a normal
// day — the ones who love you still text.
//
// Everybody else has a birthday too. Your producer, your manager, the artist
// you came up with: the day comes round, and whether you remembered is
// remembered.
//
// Pure: the store applies the effects. NPC birthdays are derived from the id,
// so they never need storing.

import type { GameDate, MomentEffect } from '../types/game';
import { hashString } from './rng';

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** A generated person's birthday, the same every year. */
export function npcBirthday(id: string): { month: number; day: number } {
  let d = hashString(`bday|${id}`) % 365;
  let m = 0;
  while (d >= DAYS[m]) { d -= DAYS[m]; m++; }
  return { month: m + 1, day: d + 1 };
}

/** "1999-03-14" → { month: 3, day: 14 }. */
export function birthdayOf(dob: string | undefined): { month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? '');
  if (!m) return null;
  return { month: Number(m[2]), day: Number(m[3]) };
}

/** Days from `date` to the next time this birthday comes round (0 = today). */
export function daysUntil(b: { month: number; day: number }, date: GameDate): number {
  const t0 = Date.UTC(date.year, date.month - 1, date.day);
  let t = Date.UTC(date.year, b.month - 1, Math.min(b.day, b.month === 2 ? 28 : b.day));
  if (t < t0) t = Date.UTC(date.year + 1, b.month - 1, Math.min(b.day, b.month === 2 ? 28 : b.day));
  return Math.round((t - t0) / 86_400_000);
}

export type BirthdayPlan = 'party' | 'dinner' | 'studio' | 'normal';

/** What a party costs where you live, at your level. */
export function partyCost(fame: number, costIdx: number): number {
  const base = 600 + fame * fame * 6;
  return Math.max(300, Math.round((base * Math.max(0.5, costIdx)) / 50) * 50);
}
export function dinnerCost(fame: number, costIdx: number): number {
  return Math.max(80, Math.round(((120 + fame * 25) * Math.max(0.5, costIdx)) / 10) * 10);
}

export interface Guest { id: string; name: string; rel: number; fame: number; real: boolean; role: string; crew?: boolean }

/**
 * The night. Who comes depends on how they feel about you and how big you
 * are next to them; a star might pull up for ten minutes. Real artists only
 * ever appear as something that happened — a photo, an appearance — never
 * with a word put in their mouth.
 */
export function partyNight(i: { guests: Guest[]; playerFame: number; charisma: number; networking: number; roll: () => number; me: string }): { came: Guest[]; star?: Guest; text: string; effects: MomentEffect[]; messy: boolean } {
  const came: Guest[] = [];
  for (const g of i.guests) {
    const gap = g.fame - i.playerFame;
    const p = g.crew ? 0.92 : Math.max(0.05, Math.min(0.95, 0.45 + g.rel / 120 - Math.max(0, gap) / 90 + (g.real ? -0.25 : 0)));
    if (i.roll() < p) came.push(g);
  }
  const star = came.filter((g) => g.fame >= i.playerFame + 15).sort((a, b) => b.fame - a.fame)[0];
  const messy = i.roll() < 0.12;
  const effects: MomentEffect[] = [];
  for (const g of came) effects.push({ k: 'rel', npcId: g.id, v: g.crew ? 3 : 5 });
  const big = came.length >= 8;
  effects.push({ k: 'momentum', v: Math.round(2 + came.length * 0.4 + (star ? 4 : 0)) });
  effects.push({ k: 'stat', stat: 'networking', v: Math.round((0.4 + came.length * 0.06 + i.networking / 400) * 10) / 10 });
  if (star) effects.push({ k: 'fans', v: Math.round(300 + star.fame * 40) });
  if (messy) effects.push({ k: 'reputation', v: -2 }, { k: 'headline', text: `${i.me}'s birthday party ends in a shouting match`, story: 'Videos from the night show a heated argument near the DJ booth. The party carried on.', category: 'scandal' });
  const names = came.filter((g) => !g.crew).slice(0, 3).map((g) => g.name);
  const text = !came.length
    ? 'You threw a party and almost nobody came. The DJ played to an empty room for an hour. It stings.'
    : `${came.length} people came${names.length ? ` — ${names.join(', ')}${came.length > names.length ? ' and more' : ''}` : ''}.${star ? ` Then ${star.name} pulled up for twenty minutes, and every phone in the room came out.` : ''}${big ? ' Packed, loud, and all over the internet by midnight.' : ' A good night with good people.'}${messy ? ' It got messy at the end — somebody filmed an argument by the booth.' : ''}`;
  if (!came.length) effects.push({ k: 'momentum', v: -2 });
  return { came, star, text, effects, messy };
}

const pick = <T,>(a: T[], seed: string): T => a[hashString(seed) % a.length];

/** What a friend texts you on the day. */
export function wishLine(seed: string, close: boolean): string {
  return pick(close
    ? ['Happy birthday fam 🎂🙏🏾 another year of winning', 'HBD!! Love you bro, God bless you 🙏🏾❤️', 'Happy birthday to my day one 🎉 we go higher', 'Another lap around the sun 🌍 happy birthday!!']
    : ['Happy birthday 🎂', 'HBD 🎉', 'Happy birthday! Have a good one 🙏🏾', 'Big day! Happy birthday 🎈'], seed);
}

/** What your team says in the group. */
export function teamWish(seed: string, role: string): string {
  return pick(role === 'manager'
    ? ['Happy birthday boss 🎂 the gift is the next contract 😂', 'HBD! Another year, bigger rooms. Enjoy today 🙏🏾']
    : ['HBD boss 🎉🎉', 'Happy birthday!! 🎂', 'Happy birthday G 🙏🏾 enjoy your day', 'Happy birthday to the boss 🔥'], seed);
}

/** A fan post on the day. */
export function fanWish(seed: string, me: string, age: number): string {
  return pick([`Happy birthday ${me} 🎂 thank you for the music`, `${age} today! Happy birthday to the GOAT ${me} 🐐`, `HBD ${me} 🎉 drop something for your birthday please 😭`, `Happy birthday to the realest — ${me} 🙏🏾`], seed);
}
