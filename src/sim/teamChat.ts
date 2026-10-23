// ─── THE TEAM GROUP CHAT ───────────────────────────────────────────────────
// Everyone on your payroll in one group, like the WhatsApp every real artist
// has: the manager flags the offers, the accountant tells you what the month
// looks like, the producer says what's in the library. Updates come from facts
// in the game, and when you ask, the right person answers with real numbers.
// Pure: reads a snapshot, returns lines.

import type { CrewMember, GameState } from '../types/game';

export interface TeamLine { from: string; name: string; role: string; text: string }

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const first = (n: string) => n.split(' ')[0];

function h(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
const pick = <T,>(a: T[], seed: string): T => a[h(seed) % a.length];

function crewOf(state: GameState, ...roles: string[]): CrewMember | undefined {
  return (state.crew ?? []).find((c) => roles.includes(c.role));
}

export interface Snapshot {
  money: number;
  energy: number;
  fame: number;
  momentum: number;
  serial: number;
  minute: number;
  openOffers: number;
  nextPlan?: { label: string; inMin: number };
  freshBeats: number;
  unreleased: number;
  rentDue?: { amount: number; days: number };
  loanDue?: { amount: number; days: number };
  openCase?: { kind: string; claim: number };
  daysSincePost: number;
  burn: number;
}

/** What each role has to say today, from facts alone. */
export function teamUpdates(state: GameState, snap: Snapshot, today: number): TeamLine[] {
  const out: TeamLine[] = [];
  const say = (c: CrewMember | undefined, text: string) => { if (c) out.push({ from: c.npcId, name: c.npcName, role: c.role, text }); };
  const mgr = (state.contracts ?? []).find((c) => c.type === 'management' && c.active);
  const mgrNpc = mgr ? state.npcs.find((n) => n.id === mgr.npcId) : undefined;
  const sayMgr = (text: string) => { if (mgrNpc) out.push({ from: mgrNpc.id, name: mgrNpc.name, role: 'manager', text }); };
  const seed = `${today}`;

  if (snap.openOffers > 0) sayMgr(pick([`${snap.openOffers} offer${snap.openOffers > 1 ? 's' : ''} on my desk. Open the Business tab in PingChat and tell me what you want to do.`, `Reminder: ${snap.openOffers} thing${snap.openOffers > 1 ? 's' : ''} waiting on you. Some of them expire.`], seed + 'm'));
  if (snap.nextPlan && snap.nextPlan.inMin < 24 * 60) say(crewOf(state, 'personal_assistant'), `Heads up — ${snap.nextPlan.label} in ${snap.nextPlan.inMin < 120 ? `${Math.round(snap.nextPlan.inMin)} minutes` : `${Math.round(snap.nextPlan.inMin / 60)} hours`}. Want me to clear the rest of your day?`);
  const acct = crewOf(state, 'accountant');
  if (acct) {
    if (snap.rentDue && snap.rentDue.days <= 5) say(acct, `Rent of ${usd(snap.rentDue.amount)} is due in ${snap.rentDue.days} day${snap.rentDue.days === 1 ? '' : 's'}. You have ${usd(snap.money)}.`);
    else if (snap.loanDue && snap.loanDue.days <= 5) say(acct, `Loan payment of ${usd(snap.loanDue.amount)} comes out in ${snap.loanDue.days} days. Keep it covered — missing one hits your credit score.`);
    else if (snap.money < snap.burn * 1.5) say(acct, `We're running thin: ${usd(snap.money)} in the account and about ${usd(snap.burn)} going out every month. Time to book shows or cut spending.`);
    else if (h(seed + 'a') % 4 === 0) say(acct, `Cash is ${usd(snap.money)} against about ${usd(snap.burn)} a month in costs. ${snap.money > snap.burn * 6 ? 'Healthy. We should put some of it to work.' : 'Fine for now.'}`);
  }
  const prod = crewOf(state, 'producer');
  if (prod && snap.freshBeats > 0 && h(seed + 'p') % 3 === 0) say(prod, `${snap.freshBeats} beat${snap.freshBeats > 1 ? 's' : ''} in your library that you haven't used. I think one of them is a single — check Studio → Beats.`);
  const eng = crewOf(state, 'engineer');
  if (eng && snap.unreleased > 0 && h(seed + 'e') % 3 === 0) say(eng, `You've got ${snap.unreleased} record${snap.unreleased > 1 ? 's' : ''} in the vault. Send me one in DM and I'll mix it — it's free for you.`);
  const pub = crewOf(state, 'publicist');
  if (pub && snap.daysSincePost > 4) say(pub, `You haven't posted in ${snap.daysSincePost} days. The algorithm forgets quickly — put something up today.`);
  const trainer = crewOf(state, 'trainer');
  if (trainer && snap.energy < 35) say(trainer, `Energy at ${Math.round(snap.energy)}. Sleep, eat, then work. Burnout costs you more than a day off.`);
  const lawyer = crewOf(state, 'lawyer');
  if (lawyer && snap.openCase) say(lawyer, `Case update: a ${snap.openCase.kind.replace(/_/g, ' ')} claim for ${usd(snap.openCase.claim)} is open. Don't ignore the hearing date.`);
  return out.slice(0, 3);
}

/** You said something in the group: the right people answer. */
export function teamReply(state: GameState, snap: Snapshot, text: string): TeamLine[] {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const out: TeamLine[] = [];
  const say = (c: CrewMember | undefined, line: string) => { if (c) out.push({ from: c.npcId, name: c.npcName, role: c.role, text: line }); };
  const mgr = (state.contracts ?? []).find((c) => c.type === 'management' && c.active);
  const mgrNpc = mgr ? state.npcs.find((n) => n.id === mgr.npcId) : undefined;
  const sayMgr = (line: string) => { if (mgrNpc) out.push({ from: mgrNpc.id, name: mgrNpc.name, role: 'manager', text: line }); };
  const seed = `${snap.serial}|${text.length}`;

  if (has('money', 'cash', 'broke', 'afford', 'budget', 'rent', 'loan', 'tax', 'invest', 'save', 'spend')) {
    say(crewOf(state, 'accountant'), `You have ${usd(snap.money)}. Monthly costs run about ${usd(snap.burn)}, so that's ${snap.burn ? (snap.money / snap.burn).toFixed(1) : '—'} months of runway. ${snap.money < snap.burn * 2 ? 'Don\'t add anything big until a show pays.' : snap.money > snap.burn * 8 ? 'You can afford to invest some of it.' : 'Spend with a plan.'}`);
  }
  if (has('beat', 'produc', 'instrumental', 'cook')) say(crewOf(state, 'producer'), snap.freshBeats ? `You've got ${snap.freshBeats} unused beat${snap.freshBeats > 1 ? 's' : ''} already. Go through Studio → Beats first; I can make a custom one for a specific record.` : `Nothing fresh in the library right now. Order a custom beat from me in Studio → Beats and I'll build it to your brief.`);
  if (has('mix', 'master', 'sound', 'engineer')) say(crewOf(state, 'engineer'), snap.unreleased ? `Send me the record in DM, hit "Ask to mix", and I'll turn it around. No charge for the team.` : `Nothing in the vault to mix. Record something first.`);
  if (has('post', 'social', 'followers', 'fans', 'press', 'image', 'brand', 'viral')) say(crewOf(state, 'publicist'), `${snap.daysSincePost > 3 ? `It's been ${snap.daysSincePost} days since your last post — start there. ` : ''}Reply to fans under your posts, it feeds the algorithm and builds loyalty. Momentum is ${Math.round(snap.momentum)} right now.`);
  if (has('tired', 'energy', 'sleep', 'rest', 'gym', 'health', 'burn')) say(crewOf(state, 'trainer'), snap.energy < 40 ? `You're at ${Math.round(snap.energy)} energy — that's too low to be pushing. Rest today.` : `Energy ${Math.round(snap.energy)}. You're fine to work, just don't stack three heavy days in a row.`);
  if (has('court', 'sue', 'lawyer', 'contract', 'legal', 'deal')) say(crewOf(state, 'lawyer'), snap.openCase ? `There's an open case (${usd(snap.openCase.claim)}). Don't miss the hearing and let me look at the facts before you answer anyone.` : `No open cases. Send me anything with money or a signature on it before you agree to it.`);
  if (has('show', 'gig', 'book', 'tour', 'offer', 'interview', 'feature')) sayMgr(snap.openOffers ? `I've got ${snap.openOffers} open on my desk — check the Business tab and I'll give you my read on each.` : `Nothing new on the desk. Keep releasing, keep posting — offers follow momentum.`);
  if (has('plan', 'schedule', 'today', 'diary', 'calendar', 'busy')) say(crewOf(state, 'personal_assistant'), snap.nextPlan ? `Next up: ${snap.nextPlan.label} in ${snap.nextPlan.inMin < 120 ? `${Math.round(snap.nextPlan.inMin)} minutes` : `${Math.round(snap.nextPlan.inMin / 60)} hours`}. Nothing else on the diary.` : `Your diary is clear.`);
  if (has('style', 'outfit', 'fit', 'drip', 'wear')) say(crewOf(state, 'stylist'), `Check your wardrobe before any show or shoot. A strong look is worth real fans. I can pull something for the next event.`);

  if (!out.length) {
    const c = pick((state.crew ?? []).map((x) => x).concat([]), seed);
    if (mgrNpc) sayMgr(pick([`Got it. Let's talk it through on a call — what's the goal?`, `Noted. Anything specific you need from the team?`, `Understood, I'll check what we can do.`], seed));
    else if (c) say(c, pick(['Noted 👍🏾', `Got it, ${first(state.player?.artistName ?? 'boss')}.`, 'On it.'], seed));
  }
  return out.slice(0, 3);
}
