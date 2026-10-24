// ─── A ROOM WITH A BIG NAME'S TEAM ─────────────────────────────────────────
//
// A connected manager's real value is the call nobody else can make: "I got
// you fifteen minutes with his team on Thursday." You still have to win the
// room. What you play them, how you carry yourself, and whether you ask for
// the verse straight out decide whether you leave with a feature deal, a
// co-sign, a direct line for next time — or a polite pass.
//
// Real artists never speak here. Their side is their team — a fictional
// staffer, never the artist — and anything the artist does (sharing your
// record, agreeing to a verse) is reported as something that happened.
//
// Pure: the store applies the effects.

import type { MomentEffect } from '../types/game';
import { hashString } from './rng';

export interface StarPitch { starId: string; starName: string; real: boolean; fame: number }

export interface PitchChoice { id: 'play_best' | 'play_new' | 'vision' | 'ask' | 'leave'; label: string; hint: string; energy: number }

export function pitchChoices(best?: { title: string }, fresh?: { title: string }): PitchChoice[] {
  const out: PitchChoice[] = [];
  if (best) out.push({ id: 'play_best', label: `Play them "${best.title}"`, hint: 'Your strongest record that\'s out', energy: 8 });
  if (fresh) out.push({ id: 'play_new', label: `Play the unreleased "${fresh.title}"`, hint: 'Fresh ears on something new — and a leak risk', energy: 8 });
  out.push({ id: 'vision', label: 'Talk about the vision', hint: 'Who you are and where you\'re going', energy: 6 });
  if (best || fresh) out.push({ id: 'ask', label: 'Ask straight for a verse', hint: 'Bold. Sometimes bold works', energy: 6 });
  out.push({ id: 'leave', label: 'Keep it short — just make the connection', hint: 'In, handshake, out', energy: 2 });
  return out;
}

export type IntroOutcome = 'feature' | 'cosign' | 'door' | 'pass';

export function resolvePitch(i: {
  pitch: StarPitch; choice: PitchChoice['id']; songTitle?: string; songId?: string; quality: number;
  playerFame: number; charisma: number; networking: number; businessKnowledge: number;
  managerSkill: number; rel: number; roll: number; seed: string;
}): { outcome: IntroOutcome; text: string; npcLine?: string; effects: MomentEffect[] } {
  const { pitch } = i;
  const first = pitch.starName.split(' ')[0];
  const team = pitch.real ? `${pitch.starName}'s team` : first;
  const craft = i.choice === 'vision' ? i.charisma * 0.6 + i.networking * 0.4 : i.choice === 'ask' ? i.quality * 0.6 + i.charisma * 0.4 - 4 : i.choice === 'leave' ? 25 : i.quality + (i.choice === 'play_new' ? 4 : 0);
  const score = craft * 0.55 + i.charisma * 0.12 + i.networking * 0.1 + i.businessKnowledge * 0.05 + i.managerSkill * 0.12 + i.rel * 0.15 - Math.max(0, pitch.fame - i.playerFame) * 0.35 + (i.roll - 0.5) * 24;
  let outcome: IntroOutcome = score >= 60 ? 'feature' : score >= 50 ? 'cosign' : score >= 40 ? 'door' : 'pass';
  if (i.choice === 'vision' && outcome === 'feature') outcome = 'cosign';
  if (i.choice === 'ask' && outcome === 'cosign') outcome = score >= 55 ? 'feature' : 'door';
  if (i.choice === 'leave') outcome = score >= 30 ? 'door' : 'pass';
  if (outcome === 'feature' && !i.songId) outcome = 'cosign';
  const effects: MomentEffect[] = [{ k: 'energy', v: -(i.choice === 'leave' ? 2 : 8) }, { k: 'introDone', npcId: pitch.starId, outcome }, { k: 'stat', stat: 'networking', v: 0.6 }];
  const song = i.songTitle ? `"${i.songTitle}"` : 'your music';
  const pick = <T,>(a: T[]) => a[hashString(`${i.seed}|${outcome}`) % a.length];
  if (outcome === 'feature') {
    effects.push({ k: 'starFeature', npcId: pitch.starId, songId: i.songId! }, { k: 'rel', npcId: pitch.starId, v: 8 });
    return {
      outcome, effects,
      text: pitch.real
        ? `${team} took ${song} back with them. Two days later the answer came: a verse is possible. The terms are in Studio → Features.`
        : `${first} played ${song} twice, then a third time. "Send me the session. I'm on it." The terms are in Studio → Features.`,
      npcLine: pitch.real ? undefined : pick(['That record is crazy. Let\'s do it 🔥', 'I don\'t jump on many songs. I\'m jumping on this one']),
    };
  }
  if (outcome === 'cosign') {
    effects.push({ k: 'cosign', npcId: pitch.starId, songId: i.songId }, { k: 'rel', npcId: pitch.starId, v: 6 });
    return {
      outcome, effects,
      text: pitch.real
        ? `No feature — not yet. But that night ${pitch.starName} shared ${song} on their story, and your phone hasn't stopped since.`
        : `${first} wasn't ready to jump on it, but posted ${song} that night with a 🔥. Your phone hasn't stopped since.`,
      npcLine: pitch.real ? undefined : pick(['Keep going. I\'m watching 👀', 'You\'ve got something. Don\'t waste it']),
    };
  }
  if (outcome === 'door') {
    effects.push({ k: 'rel', npcId: pitch.starId, v: 5 });
    return {
      outcome, effects,
      text: pitch.real
        ? `${team} liked you. "Send us the next one first." You've got a direct line to the camp now — that's how it starts.`
        : `${first} liked you more than the record. "Send me the next one first." That's a door, not a deal.`,
      npcLine: pitch.real ? undefined : pick(['Send me the next one first 🤝🏾', 'Good meeting. Stay in touch']),
    };
  }
  effects.push({ k: 'rel', npcId: pitch.starId, v: 2 });
  return {
    outcome, effects,
    text: pitch.real
      ? `${team} were polite and professional — and it's a pass, for now. You were in the room, though. Most people never are.`
      : `${first} listened, nodded, and passed. "Not this one." You were in the room, though.`,
    npcLine: pitch.real ? undefined : pick(['Not this one. Keep working', 'It\'s not for me — but you\'re close']),
  };
}

/** The line on the manager's desk. */
export function introPitchLine(pitch: StarPitch): string {
  return pitch.real
    ? `I called in a favour. ${pitch.starName}'s team will give you fifteen minutes — bring your best record. Rooms like this don't come twice.`
    : `${pitch.starName} owes me one. I can get you in a room with them this week. Bring your best record.`;
}
