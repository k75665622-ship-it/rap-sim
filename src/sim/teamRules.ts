// ─── THE TEAM: PURPOSE AND RULES ───────────────────────────────────────────
//
// Everybody on a real artist's team has a job and a set of rules they work
// by — the manager does not touch the mix, the accountant does not book
// shows, the publicist does not sign anything. Writing those down does two
// things here: the Team page can tell you exactly what you are paying for, and
// the people in your group chat (written by the AI or by the game) stay in
// their lane and speak from what they actually do.
//
// The second half is the rules YOU set: what your manager may accept without
// asking, the lowest fee they take, where they may send you, and the day of
// the week nobody books. The tick obeys them.
//
// Pure.

export interface RoleCharter {
  /** Why this seat exists. */
  purpose: string;
  /** What they do every week. */
  duties: string[];
  /** What they will not do. */
  rules: string[];
  /** What they need from you to do the job. */
  needs: string;
  /** What they talk about in the group. */
  talks: string;
}

export const CHARTERS: Record<string, RoleCharter> = {
  manager: {
    purpose: 'Runs the business of your career and speaks for you in every negotiation.',
    duties: ['Answers every offer, feature ask and interview request and briefs you with a recommendation', 'Chases the opportunities their specialty is built for, every month', 'Negotiates fees and reads the terms before you sign'],
    rules: ['Never signs anything in your name without your say-so — unless you set them to auto-accept', 'Follows your minimum fee, travel and rest-day rules', 'Takes their cut or retainer whatever the month brought'],
    needs: 'Releases to sell and quick answers. An offer nobody answers expires.',
    talks: 'offers, bookings, deals, strategy, who wants you and what to say yes to',
  },
  lawyer: {
    purpose: 'Protects you on paper: contracts, disputes and court.',
    duties: ['Reviews contracts and offers before you sign', 'Claws back part of every cut other people take', 'Represents you at hearings'],
    rules: ['Does not negotiate creative decisions', 'Will tell you to walk away from a bad clause, even from a big name', 'Needs to see paperwork before the signature, not after'],
    needs: 'To be told about deals before you agree to them.',
    talks: 'contracts, clauses, court dates, disputes, what to sign and what not to',
  },
  accountant: {
    purpose: 'Keeps the money straight: income, costs, tax and runway.',
    duties: ['Tracks what comes in and goes out every month', 'Recovers royalties and fees you were owed', 'Plans for tax and warns you before rent or a loan falls due'],
    rules: ['Will not cook the books', 'Warns you when spending takes you under your cash floor', 'Does not book shows or pick songs'],
    needs: 'Honest spending and a cash floor to protect.',
    talks: 'cash, monthly costs, runway, tax, rent, loans, whether you can afford something',
  },
  producer: {
    purpose: 'Makes your beats and shapes how your records sound.',
    duties: ['Sends beats to your library on a schedule', 'Builds custom beats for a specific song when you ask', 'Produces your sessions'],
    rules: ['Does not mix or master — that is the engineer', 'Wants credit on records built on their beats', 'Will tell you if a beat is not right for the song'],
    needs: 'A brief: genre, tempo, mood and the song it is for.',
    talks: 'beats, the library, sounds, tempo, which beat fits which song',
  },
  songwriter: {
    purpose: 'Helps write hooks and verses that land.',
    duties: ['Sharpens your writing every week', 'Co-writes when you are stuck'],
    rules: ['Wants a writing credit on what they co-write', 'Does not perform'],
    needs: 'Time in the room with you.',
    talks: 'hooks, verses, concepts, what the song is about',
  },
  engineer: {
    purpose: 'Mixes and masters your records so they sound finished.',
    duties: ['Mixes and masters anything you send them', 'Runs the technical side of sessions', 'Cleans up vocals'],
    rules: ['Does not make beats — that is the producer', 'Will not master a record that has not been mixed', 'Mixes for the team free'],
    needs: 'Recorded songs to work on.',
    talks: 'mixes, masters, vocals, how a record sounds, what is ready',
  },
  vocal_coach: {
    purpose: 'Keeps your voice strong and your delivery sharp.',
    duties: ['Weekly vocal work', 'Warm-ups before big shows'],
    rules: ['Will tell you to rest your voice when you are overworking it'],
    needs: 'Regular sessions and enough sleep.',
    talks: 'voice, delivery, breath, resting before shows',
  },
  session_musician: {
    purpose: 'Live instruments on records and on stage.',
    duties: ['Plays on sessions', 'Plays with you live'],
    rules: ['Gets paid per session on top of the wage if it runs long'],
    needs: 'Rehearsal time before shows.',
    talks: 'live sound, rehearsals, arrangements',
  },
  publicist: {
    purpose: 'Controls your story: press, image, crises.',
    duties: ['Pitches you to press and outlets', 'Handles bad stories before they spread', 'Plans your posting and campaigns'],
    rules: ['Will not fake a scandal', 'Wants to know about trouble before the public does', 'Does not negotiate money'],
    needs: 'Posts, releases and honesty about what is coming.',
    talks: 'press, posting, image, interviews, how a story will play',
  },
  stylist: {
    purpose: 'Makes you look like the artist you are becoming.',
    duties: ['Dresses you for shows, shoots and events', 'Brings designer pieces and brand looks'],
    rules: ['Needs to know about events in advance', 'Will not dress you in a brand that clashes with your image'],
    needs: 'Your calendar and a budget.',
    talks: 'outfits, looks, shoots, red carpets, what to wear',
  },
  photographer: {
    purpose: 'The pictures and visuals that sell everything else.',
    duties: ['Covers shows and shoots', 'Makes your posts and covers look expensive'],
    rules: ['Wants a photo credit', 'Will not post anything you have not approved'],
    needs: 'Access to shows and sessions.',
    talks: 'shoots, covers, visuals, content',
  },
  personal_assistant: {
    purpose: 'Runs your diary and your day.',
    duties: ['Keeps your schedule straight and reminds you of plans', 'Handles errands so you rest more'],
    rules: ['Protects your rest day', 'Does not make business decisions'],
    needs: 'To know your plans.',
    talks: 'schedule, plans, reminders, where you need to be',
  },
  trainer: {
    purpose: 'Keeps your body ready for the work.',
    duties: ['Training that raises your energy ceiling', 'Pulls you back when you are burning out'],
    rules: ['Will tell you to rest when energy is low', 'Does not care about your release schedule'],
    needs: 'Sleep and showing up to sessions.',
    talks: 'energy, rest, fitness, burnout',
  },
  choreographer: {
    purpose: 'Movement for stages and videos.',
    duties: ['Builds routines for shows and videos'],
    rules: ['Needs rehearsal time before a show'],
    needs: 'Rehearsals.',
    talks: 'routines, stage moves, videos',
  },
  tour_manager: {
    purpose: 'Gets the show from city to city in one piece.',
    duties: ['Plans travel and logistics', 'Keeps costs down on the road'],
    rules: ['Will not route a tour that loses money on travel without saying so'],
    needs: 'Dates early.',
    talks: 'routing, travel, costs on the road',
  },
  distributor: {
    purpose: 'Gets your music onto every platform and playlist pitch.',
    duties: ['Delivers releases', 'Pitches to playlists'],
    rules: ['Takes a share of streaming income'],
    needs: 'Finished masters on time.',
    talks: 'release dates, platforms, playlists',
  },
  promoter: {
    purpose: 'Sells tickets.',
    duties: ['Promotes your shows', 'Fills rooms'],
    rules: ['Takes a cut of the door'],
    needs: 'Show dates early.',
    talks: 'ticket sales, promotion, the crowd',
  },
  dj: {
    purpose: 'Plays your records where people hear them.',
    duties: ['Spins your songs in clubs and on air'],
    rules: ['Plays what works on the floor'],
    needs: 'New records.',
    talks: 'clubs, what the crowd plays, mixes',
  },
};

export function charterOf(role: string): RoleCharter {
  return CHARTERS[role] ?? { purpose: 'Works for you.', duties: ['Does the job you hired them for'], rules: ['Stays in their lane'], needs: 'Clear instructions.', talks: 'their work' };
}

// ─── YOUR RULES ────────────────────────────────────────────────────────────

export interface TeamPolicy {
  /** The manager says yes for you to anything they'd take that fits the rules below. */
  autoTake: boolean;
  /** Lowest guaranteed fee for a show. Under this they pass. */
  minShowFee: number;
  /** Where they may send you. */
  travel: 'home' | 'continent' | 'anywhere';
  /** A weekday nobody books (0 = Sunday … 6 = Saturday), or -1 for none. */
  restDay: number;
  /** How the manager handles people asking you for verses. */
  featureAsks: 'ask_me' | 'auto_good' | 'decline_all';
  /** The accountant's line: nothing the team spends for you takes cash under it. */
  cashFloor: number;
}

export const DEFAULT_POLICY: TeamPolicy = { autoTake: false, minShowFee: 0, travel: 'anywhere', restDay: -1, featureAsks: 'ask_me', cashFloor: 0 };

export function policyOf(p: Partial<TeamPolicy> | undefined | null): TeamPolicy {
  return { ...DEFAULT_POLICY, ...(p ?? {}) };
}

export const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The rules, as the team reads them back to you. */
export function policyLines(p: TeamPolicy): string[] {
  const out: string[] = [];
  out.push(p.autoTake ? 'The manager may accept anything they recommend that fits these rules.' : 'The manager asks you before accepting anything.');
  if (p.minShowFee > 0) out.push(`No shows under $${p.minShowFee.toLocaleString()} guaranteed.`);
  out.push(p.travel === 'home' ? 'Home country only.' : p.travel === 'continent' ? 'This continent only.' : 'Anywhere in the world.');
  if (p.restDay >= 0) out.push(`Nobody books anything on ${WEEKDAY[p.restDay]}s.`);
  out.push(p.featureAsks === 'auto_good' ? 'Good feature asks get a yes at the manager\'s number.' : p.featureAsks === 'decline_all' ? 'Feature asks are politely declined for now.' : 'Feature asks come to you.');
  if (p.cashFloor > 0) out.push(`Cash floor: $${p.cashFloor.toLocaleString()}. The team won't spend you under it.`);
  return out;
}

/** Does a show on this night, for this fee, in this country, break the rules? Returns why, or null. */
export function showBreaksPolicy(p: TeamPolicy, o: { fee: number; weekday: number; abroad: boolean; sameContinent: boolean }): string | null {
  if (p.minShowFee > 0 && o.fee < p.minShowFee) return `Under your $${p.minShowFee.toLocaleString()} minimum.`;
  if (p.restDay >= 0 && o.weekday === p.restDay) return `It's on a ${WEEKDAY[p.restDay]} — your rest day.`;
  if (o.abroad && p.travel === 'home') return 'Abroad, and you told me home only.';
  if (o.abroad && p.travel === 'continent' && !o.sameContinent) return 'Off the continent, and you told me to keep it close.';
  return null;
}
