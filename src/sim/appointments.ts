// ─── PLANS ON THE CLOCK ────────────────────────────────────────────────────
//
// "Pull up to the studio at 8." Saying yes puts it in your diary at a real
// time. When the clock reaches it you're there: record something together,
// just vibe, play them your unreleased songs, or leave early. Or bail — and
// how that lands depends on who they are. Skip the day without going and it
// counts as a no-show, unless you were fit enough to go anyway (or your
// assistant gets you there).
//
// Pure: the store applies the effects.

import type { Appointment, MomentEffect, NPC } from '../types/game';
import type { Persona } from './persona';
import { hashString } from './rng';

export const DAY = 1440;

const pick = <T,>(arr: T[], seed: string): T => arr[hashString(seed) % arr.length];

export function fmtMinute(atMinute: number): string {
  const m = ((atMinute % DAY) + DAY) % DAY;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

/** "Tonight 8:00 PM", "Tomorrow 2:00 PM", "Fri 9:00 PM". */
export function whenLabel(atMinute: number, nowMinute: number): string {
  const d = Math.floor(atMinute / DAY) - Math.floor(nowMinute / DAY);
  const t = fmtMinute(atMinute);
  const hour = Math.floor((atMinute % DAY) / 60);
  if (d === 0) return `${hour >= 17 ? 'Tonight' : 'Today'} ${t}`;
  if (d === 1) return `Tomorrow ${t}`;
  const dow = new Date(Math.floor(atMinute / DAY) * 86400000).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  return `${dow} ${t}`;
}

const HOUR: Record<Appointment['kind'], number> = { studio: 20, linkup: 19, party: 22, meeting: 14 };

/** The next sensible time for this kind of plan, at least an hour away. */
export function defaultSlot(nowMinute: number, kind: Appointment['kind']): number {
  const today = Math.floor(nowMinute / DAY) * DAY;
  let at = today + HOUR[kind] * 60;
  if (at - nowMinute < 60) at += DAY;
  return at;
}

/** Three times to pick from. */
export function slotChoices(nowMinute: number, kind: Appointment['kind']): number[] {
  const first = defaultSlot(nowMinute, kind);
  const late = first + 2 * 60;
  const nextDay = first + DAY - (kind === 'studio' ? 6 * 60 : 0);
  return [first, late, nextDay];
}

export function placeFor(npc: Pick<NPC, 'id' | 'name' | 'city'>, kind: Appointment['kind'], playerHasStudio: boolean): string {
  const first = npc.name.split(' ')[0];
  const city = npc.city ?? 'town';
  const seed = `place|${npc.id}|${kind}`;
  if (kind === 'studio') return pick([`${first}'s home studio`, `Sound Garden Studios, ${city}`, `The Lab, ${city}`, playerHasStudio ? 'your studio' : `Night Owl Studios, ${city}`], seed);
  if (kind === 'party') return pick([`Club Midnight, ${city}`, `a rooftop in ${city}`, `${first}'s place`], seed);
  if (kind === 'meeting') return pick([`an office in ${city}`, `a hotel lounge in ${city}`], seed);
  return pick([`a chop bar in ${city}`, `a lounge in ${city}`, `the waterfront, ${city}`], seed);
}

export const KIND_LABEL: Record<Appointment['kind'], { emoji: string; label: string }> = {
  studio: { emoji: '🎙️', label: 'Studio session' },
  linkup: { emoji: '🍻', label: 'Link-up' },
  party: { emoji: '🪩', label: 'Party' },
  meeting: { emoji: '🤝', label: 'Meeting' },
};

/** How late they turn up, in minutes. */
export function lateness(p: Persona, seed: string): number {
  const r = (hashString(`late|${seed}`) % 1000) / 1000;
  if (r < p.punctuality) return 0;
  return 15 + Math.round((1 - p.punctuality) * 90 * ((hashString(`late2|${seed}`) % 100) / 100));
}

// ─── WHAT YOU CAN DO WHEN YOU'RE THERE ─────────────────────────────────────

export interface SceneChoice { id: string; label: string; hint: string; energy: number }

export function sceneChoices(a: Appointment, hasUnreleased: boolean): SceneChoice[] {
  if (a.kind === 'studio') {
    const out: SceneChoice[] = [
      { id: 'record', label: 'Record something together', hint: 'A song could come out of it', energy: 25 },
      { id: 'vibe', label: 'Just vibe and talk', hint: 'Get to know each other', energy: 10 },
    ];
    if (hasUnreleased) out.push({ id: 'play', label: 'Play them your unreleased songs', hint: 'Honest feedback — and a risk of leaks', energy: 5 });
    out.push({ id: 'leave', label: 'Show face and leave early', hint: 'Better than not coming', energy: 3 });
    return out;
  }
  if (a.kind === 'party') {
    return [
      { id: 'network', label: 'Work the room', hint: 'Meet people who matter', energy: 15 },
      { id: 'turnup', label: 'Turn up all night', hint: 'Fun. Cameras everywhere', energy: 25 },
      { id: 'leave', label: 'One drink and go', hint: 'Showed love, kept it short', energy: 5 },
    ];
  }
  return [
    { id: 'vibe', label: 'Talk properly', hint: 'Plans, gossip, life', energy: 8 },
    { id: 'business', label: 'Talk business', hint: 'Ideas, collabs, money', energy: 10 },
    { id: 'leave', label: 'Keep it short', hint: 'In and out', energy: 3 },
  ];
}

export interface SceneResult { text: string; npcLine: string; effects: MomentEffect[] }

/** What happens. `roll` 0-1; better with warmth and relationship. */
export function resolveScene(a: Appointment, choice: string, p: Persona, ctx: { rel: number; unreleasedQuality: number; playerFame: number }, roll: number): SceneResult {
  const id = a.npcId;
  const first = a.npcName.split(' ')[0];
  const luck = roll + p.warmth * 0.15 + ctx.rel / 400;
  const late = a.lateBy ? `${first} turned up ${a.lateBy} minutes late. ` : '';
  switch (choice) {
    case 'record': {
      if (luck > 0.85) return { text: `${late}Magic. You two made a record everyone in the room was replaying. ${first} wants you on it — free.`, npcLine: 'Bro we just made a hit. I\'m not even joking 🔥', effects: [{ k: 'energy', v: -25 }, { k: 'rel', npcId: id, v: 12 }, { k: 'stat', stat: 'songwriting', v: 1 }, { k: 'stat', stat: 'creativity', v: 1 }, { k: 'inboundAsk', npcId: id, free: true }] };
      if (luck > 0.55) return { text: `${late}Solid session. A couple of good ideas, one hook you can't stop humming.`, npcLine: 'Good session. We need to finish that one', effects: [{ k: 'energy', v: -25 }, { k: 'rel', npcId: id, v: 8 }, { k: 'stat', stat: 'creativity', v: 1 }] };
      if (luck > 0.25) return { text: `${late}Long night, nothing usable. Still — you showed up.`, npcLine: 'Wasn\'t our night but we go again', effects: [{ k: 'energy', v: -25 }, { k: 'rel', npcId: id, v: 4 }] };
      return { text: `${late}The vibe was off. You clashed over the beat and the session ended early.`, npcLine: 'Not feeling it today. Another time', effects: [{ k: 'energy', v: -20 }, { k: 'rel', npcId: id, v: -2 }] };
    }
    case 'vibe':
      return luck > 0.5
        ? { text: `${late}Hours of talking — music, family, the industry. You leave as actual friends.`, npcLine: 'Real talk tonight. Appreciate you for real 🙏🏾', effects: [{ k: 'energy', v: -10 }, { k: 'rel', npcId: id, v: 9 }, { k: 'stat', stat: 'networking', v: 0.5 }] }
        : { text: `${late}Pleasant enough. A few laughs, nothing deep.`, npcLine: 'Good to link 🤝🏾', effects: [{ k: 'energy', v: -10 }, { k: 'rel', npcId: id, v: 5 }] };
    case 'play': {
      const q = ctx.unreleasedQuality;
      const leak = p.messy > 0.6 && roll < 0.25;
      if (q >= 70) return { text: `${late}${first} made you play it three times. ${leak ? 'Someone recorded it on their phone — a snippet is already online.' : 'They want a verse on it.'}`, npcLine: leak ? 'My bad about the video 😬 but people LOVE it' : 'Run that back!! Let me jump on it', effects: [{ k: 'energy', v: -5 }, { k: 'rel', npcId: id, v: 7 }, ...(leak ? [{ k: 'momentum' as const, v: 4 }] : [{ k: 'inboundAsk' as const, npcId: id, free: true }])] };
      if (q >= 50) return { text: `${late}Nods, a couple of honest notes on the hook. Useful.`, npcLine: 'It\'s close. Fix the hook and it\'s there', effects: [{ k: 'energy', v: -5 }, { k: 'rel', npcId: id, v: 4 }, { k: 'stat', stat: 'songwriting', v: 0.5 }] };
      return { text: `${late}Polite silence. ${p.style === 'blunt' ? `${first} told you straight: it's not ready.` : 'You could tell it didn\'t land.'}`, npcLine: p.style === 'blunt' ? 'Honestly? Not your best' : 'Keep working on it 🙏🏾', effects: [{ k: 'energy', v: -5 }, { k: 'rel', npcId: id, v: 1 }] };
    }
    case 'network':
      return luck > 0.5
        ? { text: 'You worked the room and left with numbers that matter.', npcLine: 'You were everywhere tonight 😂 good look', effects: [{ k: 'energy', v: -15 }, { k: 'rel', npcId: id, v: 6 }, { k: 'stat', stat: 'networking', v: 1 }, { k: 'momentum', v: 1 }] }
        : { text: 'Loud, crowded, fun. A few new contacts.', npcLine: 'Glad you came through!', effects: [{ k: 'energy', v: -15 }, { k: 'rel', npcId: id, v: 5 }, { k: 'stat', stat: 'networking', v: 0.5 }] };
    case 'turnup':
      return luck > 0.35
        ? { text: 'A legendary night. The clips are everywhere and people love it.', npcLine: 'LAST NIGHT 😂😂🔥', effects: [{ k: 'energy', v: -25 }, { k: 'rel', npcId: id, v: 8 }, { k: 'momentum', v: 3 }, { k: 'fans', v: Math.round(200 + ctx.playerFame * 30) }] }
        : { text: 'Too much. A video of you stumbling out is doing numbers for the wrong reasons.', npcLine: 'You good? 😭', effects: [{ k: 'energy', v: -30 }, { k: 'rel', npcId: id, v: 3 }, { k: 'reputation', v: -2 }] };
    case 'business':
      return luck > 0.55
        ? { text: `${late}You traded real ideas. ${first} wants to work together.`, npcLine: 'Let\'s make money together 🤝🏾', effects: [{ k: 'energy', v: -10 }, { k: 'rel', npcId: id, v: 6 }, { k: 'stat', stat: 'businessKnowledge', v: 0.7 }] }
        : { text: `${late}Useful chat, nothing concrete yet.`, npcLine: 'Let\'s keep talking', effects: [{ k: 'energy', v: -10 }, { k: 'rel', npcId: id, v: 3 }] };
    default:
      return { text: `${late}You showed face and dipped. ${p.ego > 0.7 ? `${first} noticed.` : 'Fair enough.'}`, npcLine: p.ego > 0.7 ? 'Leaving already? ok' : 'Thanks for coming through', effects: [{ k: 'energy', v: -3 }, { k: 'rel', npcId: id, v: p.ego > 0.7 ? 0 : 2 }] };
  }
}

/** Bailing on them, or not turning up. */
export function noShow(a: Appointment, p: Persona, how: 'bail' | 'missed' | 'slept', seed: string): SceneResult & { post?: string } {
  const first = a.npcName.split(' ')[0];
  const hurt = Math.round((how === 'bail' ? 6 : 10) * (1.3 - p.forgiveness) * (a.kind === 'studio' ? 1.2 : 1));
  const goesPublic = p.messy > 0.55 && (hashString(`nos|${seed}`) % 100) / 100 < p.messy;
  const npcLine = how === 'bail'
    ? (p.forgiveness > 0.65 ? 'No stress, another time 🙏🏾' : p.forgiveness < 0.3 ? 'Wow. I cleared my whole night for this.' : 'Ok… let me know when you\'re serious')
    : (p.forgiveness > 0.65 ? 'You good? Didn\'t see you tonight' : p.forgiveness < 0.3 ? 'You really stood me up? Noted.' : 'Waited for you. Not cool');
  const effects: MomentEffect[] = [{ k: 'rel', npcId: a.npcId, v: -hurt }];
  let post: string | undefined;
  if (goesPublic) {
    effects.push({ k: 'reputation', v: -1 });
    post = pick(['Some people are only real online 🤷🏾‍♂️', 'Cleared my night for someone who didn\'t show. Lesson learnt.', 'Punctuality is free. Just saying.'], seed);
  }
  const text = how === 'bail'
    ? `You bailed on ${first}.${goesPublic ? ' They subtweeted about it.' : ''}`
    : how === 'slept'
      ? `You slept through it. ${first} waited.${goesPublic ? ' Now they\'re posting about it.' : ''}`
      : `You never showed up.${goesPublic ? ` ${first} posted about it.` : ''}`;
  return { text, npcLine, effects, post };
}
