// ─── KEEPING AI TEXTS HONEST ───────────────────────────────────────────────
// Two things a language model does that a person doesn't: say the same thing
// three times, and promise "see you at 8" without anything being booked. The
// first is dropped; the second becomes a real plan in the diary, so 8 o'clock
// actually comes with a session.

function words(t: string): string[] {
  return t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 1);
}

/** Same message, give or take an emoji or a word. */
export function nearDuplicate(a: string, b: string): boolean {
  const A = words(a);
  const B = words(b);
  if (!A.length || !B.length) return a.trim() === b.trim();
  const sa = new Set(A);
  const sb = new Set(B);
  let both = 0;
  for (const w of sa) if (sb.has(w)) both++;
  const jac = both / (sa.size + sb.size - both);
  const contain = both / Math.min(sa.size, sb.size);
  return jac >= 0.6 || (contain >= 0.85 && Math.min(sa.size, sb.size) >= 4);
}

export interface ImpliedPlan {
  kind: 'studio' | 'linkup' | 'party';
  /** The time as written ("20:00", "8pm"). */
  time: string;
  /** "See you at 8" — already agreed, not a question. */
  confirmed: boolean;
}

const TIME = /\b(?:([01]?\d|2[0-3]):([0-5]\d)|(1[0-2]|0?[1-9])\s?(am|pm))\b/i;
const MEET = /\b(see you|see u|pull up|come through|link up|linkup|session|studio|pass through|meet|tonight|party|come by|swing by|slide through|be there)\b/i;

/** A text that sets a time to meet. */
export function impliedPlan(text: string): ImpliedPlan | null {
  const t = TIME.exec(text);
  if (!t || !MEET.test(text)) return null;
  const kind = /\b(studio|session|beat|record|mix|master|verse|hook|booth|visuals?)\b/i.test(text) ? 'studio'
    : /\b(party|club|turn ?up|rave)\b/i.test(text) ? 'party' : 'linkup';
  const confirmed = /\b(see you|see u|locked in|it'?s a date|be there|sharp|bet,? see)\b/i.test(text) && !/\?\s*$/.test(text.trim());
  return { kind, time: t[0], confirmed };
}

/** The player's last line said yes. */
export function soundsLikeYes(text: string): boolean {
  return /^(ok(ay)?|k|bet|cool|sure|yes|yeah|yh|ya|yep|say less|i'?m (there|in|down)|deal|for sure|alright|aight|no wahala|sharp)\b/i.test(text.trim());
}
