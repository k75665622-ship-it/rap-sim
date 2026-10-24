// ─── YOUR FANBASE ──────────────────────────────────────────────────────────
//
// Fans are not a number. They have a mood: how loyal they are (do they stay
// when you go quiet?) and how hyped they are right now (do they turn up on
// release day?). You look after them — reply, meet them, give back, play the
// day ones the new music first — and they look after you: stream parties on
// release day, defending you in fan wars, pages that grow with you. Ignore
// them and they drift. Every fan war ends with a winner, and the record is kept.
//
// Pure.

export interface FanClub {
  loyalty: number;
  hype: number;
  /** Day serial each action was last used. */
  used: Record<string, number>;
  /** Fan counts already celebrated. */
  milestones: number[];
  war: { won: number; lost: number; drawn: number };
  /** Hype banked by a listening party for the next release. */
  preHype?: number;
}

export function newFanClub(): FanClub {
  return { loyalty: 50, hype: 30, used: {}, milestones: [], war: { won: 0, lost: 0, drawn: 0 } };
}

export type FanActionId = 'reply' | 'meetup' | 'giveaway' | 'listening' | 'shoutout' | 'stream_party';

export const FAN_ACTIONS: Record<FanActionId, { label: string; emoji: string; blurb: string; energy: number; cooldown: number; minFans: number }> = {
  reply: { label: 'Reply to fans', emoji: '💬', blurb: 'An hour in the comments and DMs. Small, and it adds up.', energy: 4, cooldown: 1, minFans: 0 },
  shoutout: { label: 'Shout out a fan page', emoji: '📣', blurb: 'Repost the page that never stops posting you.', energy: 2, cooldown: 7, minFans: 300 },
  giveaway: { label: 'Merch & ticket giveaway', emoji: '🎁', blurb: 'Give something back. New followers, happy day ones.', energy: 3, cooldown: 10, minFans: 500 },
  meetup: { label: 'Pop-up fan meet', emoji: '🤳🏾', blurb: 'Announce a spot an hour before. Photos, hugs, chaos.', energy: 15, cooldown: 14, minFans: 1000 },
  listening: { label: 'Listening party for superfans', emoji: '🎧', blurb: 'Play the day ones something unreleased. Banks hype for the drop.', energy: 10, cooldown: 21, minFans: 800 },
  stream_party: { label: 'Call a stream party', emoji: '🔁', blurb: 'Your fans run your newest record all night. Wins fan wars.', energy: 5, cooldown: 7, minFans: 1500 },
};

export const MILESTONES = [1_000, 10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000];

export function costOf(id: FanActionId, fame: number, costIdx: number): number {
  if (id === 'giveaway') return Math.round((300 + fame * fame * 2) * Math.max(0.5, costIdx) / 50) * 50;
  if (id === 'meetup') return Math.round((150 + fame * 15) * Math.max(0.5, costIdx) / 50) * 50;
  if (id === 'listening') return Math.round((200 + fame * 10) * Math.max(0.5, costIdx) / 50) * 50;
  return 0;
}

export interface FanActionResult {
  loyalty: number;
  hype: number;
  fans: number;
  momentum: number;
  reputation?: number;
  /** For a stream party: the push on your newest record. */
  push?: number;
  /** For a fan war: how much it swings the edge. */
  edge?: number;
  preHype?: number;
  text: string;
}

/** Do something for your fans. `roll` 0-1. */
export function fanAction(id: FanActionId, c: FanClub, i: { fans: number; fame: number; charisma: number; city: string; pageName: string; roll: number }): FanActionResult {
  const big = (n: number) => Math.round(n * (1 + i.fame / 40));
  switch (id) {
    case 'reply':
      return { loyalty: 2.5, hype: 1, fans: big(15), momentum: 0.3, text: i.roll < 0.15 ? 'One of your replies went viral — a fan screenshotted it and the timeline loved it.' : 'You spent an hour in the replies. The day ones noticed.' };
    case 'shoutout':
      return { loyalty: 4, hype: 2, fans: big(60), momentum: 0.5, text: `You reposted ${i.pageName}. They've been posting you since day one — they're crying in the comments.` };
    case 'giveaway':
      return { loyalty: 5, hype: 6, fans: big(250), momentum: 1.5, text: 'The giveaway post is your most shared this month. New followers everywhere.' };
    case 'meetup': {
      const chaos = i.roll < 0.12 && i.fame >= 35;
      return { loyalty: 9, hype: 7, fans: big(120), momentum: 2.5, reputation: chaos ? -1 : 0.5, text: chaos ? `Way more people turned up in ${i.city} than the spot could hold. Police closed the street. It's all over the internet — not all of it kind.` : `You turned up in ${i.city} with an hour's notice and ${Math.round(40 + i.fame * 12)} people came. Photos, hugs, one fan cried. Those people are yours for life.` };
    }
    case 'listening':
      return { loyalty: 6, hype: 12, fans: big(40), momentum: 1, preHype: 15 + Math.round(c.loyalty / 10), text: 'You played the superfans the new music in a dark room. Nobody leaked it. They are counting the days.' };
    case 'stream_party': {
      const power = Math.round((0.15 + c.loyalty / 400 + c.hype / 500) * 100) / 100;
      return { loyalty: 1, hype: -6, fans: big(80), momentum: 2, push: power, edge: 6 + Math.round(c.loyalty / 12), text: c.loyalty >= 60 ? 'Your fans ran it all night — trending by 2am. The numbers jumped.' : 'Some of your fans showed up for the stream party. Not all of them.' };
    }
  }
}

/** The day: hype cools, loyalty drifts with how you treat them. */
export function fanDay(c: FanClub, i: { daysSinceRelease?: number; daysSincePost: number; momentum: number; days: number }): void {
  for (let d = 0; d < Math.min(i.days, 30); d++) {
    c.hype = Math.max(0, c.hype * 0.975 + (i.momentum >= 50 ? 0.3 : 0));
    const quiet = i.daysSinceRelease === undefined ? 0 : i.daysSinceRelease;
    if (quiet > 45) c.loyalty = Math.max(0, c.loyalty - 0.15);
    if (i.daysSincePost > 10 && i.daysSincePost < 99) c.loyalty = Math.max(0, c.loyalty - 0.08);
    if (c.loyalty > 70) c.loyalty -= 0.03;
  }
}

export function moodLine(c: FanClub, daysSinceRelease?: number): string {
  if (c.hype >= 70) return 'Your fans are on fire — anything you drop right now gets a huge first week.';
  if (daysSinceRelease !== undefined && daysSinceRelease > 60 && c.loyalty < 45) return 'Your fans are restless. "Drop something" is under every post.';
  if (c.loyalty >= 75) return 'Ride-or-die. They would defend you in any fan war.';
  if (c.loyalty < 30) return 'They\'re drifting. A few have started following other artists.';
  if (c.hype < 15) return 'Quiet. They\'re waiting for a reason to get loud.';
  return 'Steady. They\'re with you — give them something to talk about.';
}
