// ─── THE TEAM GROUP CHAT ───────────────────────────────────────────────────
// Everyone on your payroll in one group, like the WhatsApp every real artist
// has: the manager flags the offers, the accountant tells you what the month
// looks like, the producer says what's in the library. Updates come from facts
// in the game, and when you ask, the right person answers with real numbers —
// and when you ask somebody to DO something that is their job, they do it.
//
// With an AI key the people write their own messages (see `ai/bridge.ts`);
// this file is what they say without one, and the facts they say it from.
// Pure: reads a snapshot, returns lines and actions.

import type { CrewMember, GameState, TeamDispute } from '../types/game';
import { WORK_STYLE, type WorkStyle, type EffortKind } from './crewWork';

/** `key` names the kind of update, so the same one isn't posted every week; `urgent` ones may repeat sooner. */
export interface TeamLine { from: string; name: string; role: string; text: string; key?: string; urgent?: boolean }

/** Things a team member can actually do when you ask them in the chat. */
export type TeamActionKind = 'make_beat' | 'mix_song' | 'push_shows' | 'push_features' | 'push_deals';
export interface TeamAction { kind: TeamActionKind; from: string; songId?: string }

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

export interface VaultSong { id: string; title: string; quality: number; status: string }

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
  /** What's in the vault, best first. */
  vault?: VaultSong[];
  /** The newest record out. */
  newest?: { title: string; days: number; weekly: number };
  /** Titles of what's waiting on the manager's desk. */
  desk?: string[];
  nextShow?: { label: string; days: number };
  nextAward?: { name: string; days: number; entered: boolean; nominated: number };
  /** The rules the player set, read back. */
  policy?: string[];
  /** "The Connector", "The Road Manager"… */
  managerKind?: string;
  /** Monthly wages and retainer. */
  payroll?: number;
  /** The player's first name or artist name. */
  me?: string;
  /** What the team would put out next, and when — they can see the vault. */
  dropPlan?: DropPlan;
  /** Big names who dropped in the last few days. */
  bigDrops?: { name: string; title: string }[];
  /** Saved projects in the album vault. */
  drafts?: { title: string; tracks: number; plannedDays?: number }[];
  /** Who you're in a beef with right now. */
  beef?: string;
  /** Who on the team had a week with nothing in it. */
  slackers?: string[];
}

export interface DropPlan {
  id: string;
  title: string;
  quality: number;
  status: string;
  /** "Friday 14 March". */
  friday: string;
  daysToFriday: number;
  /** Days since the last release (undefined: never released). */
  quietDays?: number;
  /** Why to wait, if they'd wait. */
  wait?: string;
}

function mgrOf(state: GameState): { id: string; name: string } | undefined {
  const mgr = (state.contracts ?? []).find((c) => c.type === 'management' && c.active);
  const n = mgr ? state.npcs.find((x) => x.id === mgr.npcId) : undefined;
  return n ? { id: n.id, name: n.name } : undefined;
}

/** What each role has to say today, from facts alone. */
export function teamUpdates(state: GameState, snap: Snapshot, today: number): TeamLine[] {
  const out: TeamLine[] = [];
  let key = '';
  let urgent = false;
  const say = (c: CrewMember | undefined, text: string) => { if (c) out.push({ from: c.npcId, name: c.npcName, role: c.role, text, key, urgent }); };
  const m = mgrOf(state);
  const sayMgr = (text: string) => { if (m) out.push({ from: m.id, name: m.name, role: 'manager', text, key, urgent }); };
  const k = (name: string, isUrgent = false) => { key = name; urgent = isUrgent; };
  const seed = `${today}`;

  if (snap.openOffers > 0) { k(`desk:${snap.openOffers}`); } else k('');
  if (snap.openOffers > 0) sayMgr(pick([
    `${snap.openOffers} thing${snap.openOffers > 1 ? 's' : ''} on my desk${snap.desk?.length ? ` — ${snap.desk.slice(0, 2).join('; ')}` : ''}. Tell me what you want to do.`,
    `Reminder: ${snap.openOffers} offer${snap.openOffers > 1 ? 's' : ''} waiting on you. Some of them expire.`,
  ], seed + 'm'));
  else if (snap.newest && snap.newest.days <= 10 && h(seed + 'n') % 2 === 0) { k(`newest:${snap.newest.title}:${Math.floor(snap.newest.days / 4)}`); sayMgr(pick([
    `"${snap.newest.title}" did ${snap.newest.weekly.toLocaleString()} streams this week. ${snap.newest.weekly > 20000 ? 'People are on it — let\'s keep feeding it.' : 'Slow start. A video or a feature push would help.'}`,
    `Day ${snap.newest.days} for "${snap.newest.title}". ${snap.momentum >= 30 ? 'The buzz is real.' : 'We need more noise around it.'}`,
  ], seed + 'nw')); }
  else if (snap.newest && snap.newest.days > 45 && (snap.vault?.length ?? 0) > 0 && h(seed + 'q') % 3 === 0) { k('quiet-release'); sayMgr(`It's been ${snap.newest.days} days since your last release. "${snap.vault![0].title}" is sitting in the vault at ${Math.round(snap.vault![0].quality)} — I'd put it out.`); }
  if (snap.nextAward && snap.nextAward.days <= 30 && !snap.nextAward.entered && snap.nextAward.days > 0) { k(`award:${snap.nextAward.name}`, true); sayMgr(`${snap.nextAward.name} entries close soon. Make sure we're in.`); }
  if (snap.nextPlan && snap.nextPlan.inMin < 24 * 60) { k(`plan:${snap.nextPlan.label}`, true); say(crewOf(state, 'personal_assistant'), `Heads up — ${snap.nextPlan.label} in ${snap.nextPlan.inMin < 120 ? `${Math.round(snap.nextPlan.inMin)} minutes` : `${Math.round(snap.nextPlan.inMin / 60)} hours`}. Want me to clear the rest of your day?`); }
  if (snap.nextShow && snap.nextShow.days <= 3) { k(`show:${snap.nextShow.label}`, true); say(crewOf(state, 'personal_assistant', 'tour_manager', 'trainer'), `${snap.nextShow.label} in ${snap.nextShow.days === 0 ? 'tonight' : `${snap.nextShow.days} day${snap.nextShow.days > 1 ? 's' : ''}`}. ${snap.energy < 50 ? 'Get some sleep before it.' : 'Rehearse the set.'}`); }
  const acct = crewOf(state, 'accountant');
  if (acct) {
    if (snap.rentDue && snap.rentDue.days <= 5) { k('rent', true); say(acct, `Rent of ${usd(snap.rentDue.amount)} is due in ${snap.rentDue.days} day${snap.rentDue.days === 1 ? '' : 's'}. You have ${usd(snap.money)}.`); }
    else if (snap.loanDue && snap.loanDue.days <= 5) { k('loan', true); say(acct, `Loan payment of ${usd(snap.loanDue.amount)} comes out in ${snap.loanDue.days} days. Keep it covered — missing one hits your credit score.`); }
    else if (snap.money < snap.burn * 1.5) { k('thin', true); say(acct, `We're running thin: ${usd(snap.money)} in the account and about ${usd(snap.burn)} going out every month. Time to book shows or cut spending.`); }
    else if (h(seed + 'a') % 4 === 0) { k('cash'); say(acct, `Cash is ${usd(snap.money)} against about ${usd(snap.burn)} a month in costs${snap.payroll ? ` (${usd(snap.payroll)} of it is the team)` : ''}. ${snap.money > snap.burn * 6 ? 'Healthy. We should put some of it to work.' : 'Fine for now.'}`); }
  }
  const prod = crewOf(state, 'producer');
  if (prod && snap.freshBeats > 0 && h(seed + 'p') % 3 === 0) { k('beats'); say(prod, `${snap.freshBeats} beat${snap.freshBeats > 1 ? 's' : ''} in your library you haven't touched. I think one of them is a single — check Studio → Beats.`); }
  const eng = crewOf(state, 'engineer');
  const unmixed = (snap.vault ?? []).filter((v) => v.status === 'recorded');
  if (eng && unmixed.length && h(seed + 'e') % 3 === 0) { k(`mix:${unmixed[0].title}`); say(eng, `"${unmixed[0].title}" is still a rough recording. Say the word and I'll mix it — free for the team.`); }
  const pub = crewOf(state, 'publicist');
  if (pub && snap.daysSincePost > 4) { k('post'); say(pub, snap.daysSincePost >= 99 ? `You haven't posted anything yet. People can't follow what they can't see — put something up today.` : `You haven't posted in ${snap.daysSincePost} days. The algorithm forgets quickly — put something up today.`); }
  const trainer = crewOf(state, 'trainer');
  if (trainer && snap.energy < 35) { k('energy', true); say(trainer, `Energy at ${Math.round(snap.energy)}. Sleep, eat, then work. Burnout costs you more than a day off.`); }
  const lawyer = crewOf(state, 'lawyer');
  if (lawyer && snap.openCase) { k('case'); say(lawyer, `Case update: a ${snap.openCase.kind.replace(/_/g, ' ')} claim for ${usd(snap.openCase.claim)} is open. Don't ignore the hearing date.`); }
  // When to drop, and what: the team can see the vault.
  const plan = snap.dropPlan;
  if (plan && m) {
    const ready = plan.status !== 'recorded';
    const quiet = plan.quietDays === undefined || plan.quietDays >= 21;
    if (plan.wait && quiet && h(seed + 'w') % 2 === 0) { k(`wait:${plan.id}`); sayMgr(`Hold "${plan.title}" one more week. ${plan.wait}`); }
    else if (ready && quiet && plan.quality >= 62 && h(seed + 'dp') % 3 === 0) {
      k(`drop:${plan.id}`);
      sayMgr(pick([
        `"${plan.title}" is the one. Put it out ${plan.daysToFriday <= 1 ? 'this Friday' : `on ${plan.friday}`} — ${plan.quietDays === undefined ? 'it\'s time people heard you' : `it's been ${plan.quietDays} days since your last release`}.`,
        `My plan: "${plan.title}" ${plan.daysToFriday <= 2 ? 'this Friday' : `on ${plan.friday}`}. Fridays get the playlists. ${snap.momentum >= 30 ? 'The buzz is up — don\'t waste it.' : 'We build the noise around it.'}`,
      ], seed + 'dp2'));
      say(crewOf(state, 'publicist'), `If "${plan.title}" is going ${plan.daysToFriday <= 2 ? 'this Friday' : `on ${plan.friday}`}, I need the cover and a snippet three days before.`);
      say(crewOf(state, 'dj'), `Send me "${plan.title}" before it drops. I'll test it in the club — if the room reacts, we know.`);
    } else if (!ready && plan.quality >= 62 && h(seed + 'mx') % 3 === 0) {
      k(`needsmix:${plan.id}`);
      say(crewOf(state, 'engineer'), `"${plan.title}" could be the next single — but it's still a rough recording. Let me mix it before anybody hears it.`);
    }
  }
  if (snap.drafts?.length && m && h(seed + 'dr') % 5 === 0) {
    const d = snap.drafts[0];
    k(`draft:${d.title}`);
    sayMgr(d.plannedDays !== undefined && d.plannedDays <= 14 ? `"${d.title}" is due in ${d.plannedDays} days. Two singles before a project — have we done that?` : d.tracks < 4 ? `"${d.title}" only has ${d.tracks} track${d.tracks === 1 ? '' : 's'} on it. We need more records before it's a project.` : `"${d.title}" has ${d.tracks} tracks. Pick a date and I'll build the rollout.`);
  }
  const dj = crewOf(state, 'dj');
  if (dj && snap.newest && h(seed + 'dj') % 3 === 0) {
    k(`dj:${snap.newest.title}:${Math.floor(snap.newest.days / 14)}`);
    say(dj, snap.newest.days <= 30
      ? pick([`Played "${snap.newest.title}" last night — the whole room knew the hook by the second chorus 🔥`, `"${snap.newest.title}" at 1am, packed floor. It works in the club.`, `Ran "${snap.newest.title}" twice last night. Second time they sang it back.`], seed + 'dj2')
      : pick([`The clubs are getting tired of "${snap.newest.title}". I need something new to play.`, `Still spinning "${snap.newest.title}", but it's been ${snap.newest.days} days. Give me something fresh.`], seed + 'dj3'));
  }
  if (snap.bigDrops?.length && m && h(seed + 'bd') % 2 === 0) {
    const b = snap.bigDrops[0];
    k(`bigdrop:${b.title}`);
    sayMgr(`${b.name} just dropped "${b.title}". Don't release into that this week — let it breathe.`);
  }
  if (snap.slackers?.length && h(seed + 'sl') % 2 === 0) {
    const worker = (state.crew ?? []).find((c) => !snap.slackers!.includes(c.npcName) && c.skill >= 50);
    if (worker) { k(`slack:${snap.slackers[0]}`); say(worker, `@${first(snap.slackers[0])} we waited all week on your part. Nothing came.`); }
  }
  // Now and then they talk to each other, the way a real group does.
  if (out.length && acct && m && snap.money < snap.burn * 3 && h(seed + 'x') % 3 === 0) out.push({ from: acct.npcId, name: acct.npcName, role: acct.role, text: `@${first(m.name)} anything paying on your desk? We need cash in before we spend more.`, key: 'acct-asks-mgr' });
  return out.slice(0, 4);
}

// ─── WHEN YOU SAY SOMETHING ────────────────────────────────────────────────

function songIn(text: string, vault: VaultSong[] | undefined): VaultSong | undefined {
  const t = text.toLowerCase();
  return (vault ?? []).find((v) => v.title.length >= 2 && t.includes(v.title.toLowerCase()));
}

/** What you asked somebody to DO. The store carries it out. */
export function teamActions(state: GameState, snap: Snapshot, text: string, only?: string): TeamAction[] {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const ask = has('can you', 'could you', 'please', 'make', 'need', 'get me', 'find me', 'book', 'do ', 'send', 'mix', 'push', 'let\'s', 'lets ', 'i want', 'go ');
  if (!ask) return [];
  const out: TeamAction[] = [];
  const ok = (id: string | undefined) => !!id && (!only || only === id);
  const prod = crewOf(state, 'producer');
  if (prod && ok(prod.npcId) && has('beat', 'instrumental', 'cook', 'riddim')) out.push({ kind: 'make_beat', from: prod.npcId, songId: songIn(text, snap.vault)?.id });
  const eng = crewOf(state, 'engineer');
  if (eng && ok(eng.npcId) && has('mix', 'master', 'clean up', 'engineer')) {
    const song = songIn(text, snap.vault) ?? (snap.vault ?? []).find((v) => v.status === 'recorded');
    if (song) out.push({ kind: 'mix_song', from: eng.npcId, songId: song.id });
  }
  const m = mgrOf(state);
  if (m && ok(m.id)) {
    if (has('show', 'gig', 'booking', 'tour', 'festival', 'perform')) out.push({ kind: 'push_shows', from: m.id });
    else if (has('feature', 'collab', 'verse from', 'big name')) out.push({ kind: 'push_features', from: m.id });
    else if (has('brand', 'endorse', 'deal', 'sponsor', 'money in')) out.push({ kind: 'push_deals', from: m.id });
  }
  return out;
}

/** You said something in the group: the right people answer. */
export function teamReply(state: GameState, snap: Snapshot, text: string, only?: string): TeamLine[] {
  const t = text.toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const out: TeamLine[] = [];
  const allowed = (id: string) => !only || only === id;
  const say = (c: CrewMember | undefined, line: string) => { if (c && line && allowed(c.npcId) && !out.some((o) => o.from === c.npcId)) out.push({ from: c.npcId, name: c.npcName, role: c.role, text: line }); };
  const m = mgrOf(state);
  const sayMgr = (line: string) => { if (m && allowed(m.id) && !out.some((o) => o.from === m.id)) out.push({ from: m.id, name: m.name, role: 'manager', text: line }); };
  const seed = `${snap.serial}|${text.length}|${text.slice(0, 6)}`;
  const me = snap.me ? first(snap.me) : 'boss';
  const actions = teamActions(state, snap, text, only);
  const song = songIn(text, snap.vault);

  // Requests first: the person whose job it is says yes, and does it.
  for (const a of actions) {
    const c = (state.crew ?? []).find((x) => x.npcId === a.from);
    if (a.kind === 'make_beat') say(c, pick([`Say less. I'll cook something${song ? ` for "${song.title}"` : ''} and drop it in your library in a few days.`, `On it${song ? ` — "${song.title}" needs the right bounce` : ''}. Give me a few days.`, `Bet. Building one tonight.`], seed + 'b'));
    if (a.kind === 'mix_song') {
      const v = (snap.vault ?? []).find((x) => x.id === a.songId);
      say(c, v ? pick([`Sending "${v.title}" to my desk now. Proper mix and master — you'll hear the difference.`, `Got it. "${v.title}" is next. I'll clean the vocals and give it some air.`], seed + 'mx') : 'Send me the record and I\'ll mix it.');
    }
    if (a.kind === 'push_shows') sayMgr(pick([`Understood — dates. I'll work the promoters this month${snap.policy?.some((p) => p.includes('minimum')) ? ' and stick to your minimum' : ''}.`, `Shows it is. Give me a few weeks and you'll have offers on the desk.`], seed + 's'));
    if (a.kind === 'push_features') sayMgr(pick([`Features. I'll make calls${snap.vault?.[0] ? ` with "${snap.vault[0].title}"` : ''} — the better the record, the bigger the name I can get.`, `I'll start calling camps. Get me your strongest record.`], seed + 'f'));
    if (a.kind === 'push_deals') sayMgr(pick([`Brands want reach — I'll take your numbers around and see who bites.`, `I'll chase deals. Keep posting — that's what brands are buying.`], seed + 'd'));
  }

  if (/\b(hi|hello|hey|yo|morning|evening|wassup|sup|what'?s up)\b/.test(t) && t.split(/\s+/).length <= 6) {
    sayMgr(pick([`Morning ${me}. ${snap.openOffers ? `${snap.openOffers} thing${snap.openOffers > 1 ? 's' : ''} on my desk when you have a minute.` : 'Quiet on my side — good day to make music.'}`, `Yo ${me} 🙏🏾 ${snap.newest ? `"${snap.newest.title}" is doing ${snap.newest.weekly.toLocaleString()} a week.` : 'Let\'s get something out.'}`], seed + 'g'));
    const c = (state.crew ?? [])[h(seed) % Math.max(1, (state.crew ?? []).length)];
    if (c) say(c, pick(['Morning! 👋🏾', `Hey ${me} 🙌🏾`, 'Good morning fam', 'We move 💪🏾'], seed + 'g2'));
  }
  if (has('thank', 'appreciate', 'good job', 'well done', 'great work')) {
    const c = (state.crew ?? [])[0];
    sayMgr(pick(['Anytime. That\'s the job 🤝🏾', 'Appreciate you too. Let\'s keep going.'], seed + 't'));
    if (c) say(c, pick(['🙏🏾', 'Always 💯', 'That\'s what we\'re here for'], seed + 't2'));
  }
  if (has('money', 'cash', 'broke', 'afford', 'budget', 'rent', 'loan', 'tax', 'invest', 'save', 'spend', 'runway')) {
    say(crewOf(state, 'accountant'), `You have ${usd(snap.money)}. Monthly costs run about ${usd(snap.burn)}${snap.payroll ? ` plus ${usd(snap.payroll)} for the team` : ''}, so that's ${(snap.burn + (snap.payroll ?? 0)) ? (snap.money / (snap.burn + (snap.payroll ?? 0))).toFixed(1) : '—'} months of runway. ${snap.money < (snap.burn + (snap.payroll ?? 0)) * 2 ? 'Don\'t add anything big until a show pays.' : snap.money > (snap.burn + (snap.payroll ?? 0)) * 8 ? 'You can afford to invest some of it.' : 'Spend with a plan.'}`);
    if (!crewOf(state, 'accountant')) sayMgr(`Roughly ${usd(snap.money)} in the account. Get an accountant if you want it watched properly.`);
  }
  if (!actions.some((a) => a.kind === 'make_beat') && has('beat', 'produc', 'instrumental', 'cook')) say(crewOf(state, 'producer'), snap.freshBeats ? `You've got ${snap.freshBeats} unused beat${snap.freshBeats > 1 ? 's' : ''} already. Go through Studio → Beats first — or tell me "make me a beat" and I'll build one to a brief.` : `Nothing fresh in the library. Say "make me a beat" and I'll start one.`);
  if (!actions.some((a) => a.kind === 'mix_song') && has('mix', 'master', 'sound', 'engineer')) {
    const unmixed = (snap.vault ?? []).filter((v) => v.status === 'recorded');
    say(crewOf(state, 'engineer'), unmixed.length ? `"${unmixed[0].title}"${unmixed.length > 1 ? ` and ${unmixed.length - 1} more` : ''} still need a mix. Tell me which one and I'll do it.` : `Everything in the vault is mixed. Record something and send it my way.`);
  }
  if (song && !actions.length) {
    const eng = crewOf(state, 'engineer');
    const prod = crewOf(state, 'producer');
    const verdict = song.quality >= 75 ? 'That one is a single.' : song.quality >= 60 ? 'Solid. A feature or a better mix could push it.' : 'Honestly? It needs more work before it goes out.';
    if (eng && song.status === 'recorded') say(eng, `"${song.title}" scores ${Math.round(song.quality)} right now and it isn't mixed yet. ${verdict}`);
    else if (prod) say(prod, `"${song.title}" — ${Math.round(song.quality)}. ${verdict}`);
    else sayMgr(`"${song.title}" scores ${Math.round(song.quality)}. ${verdict}`);
  }
  if (has('release', 'drop', 'single', 'album', 'put out', 'when should')) {
    const best = song ?? snap.vault?.[0];
    const plan = snap.dropPlan;
    const when = plan ? (plan.daysToFriday <= 2 ? 'this Friday' : `Friday (${plan.friday})`) : 'on a Friday';
    sayMgr(best
      ? best.quality >= 65
        ? `${plan?.wait ? `Not this week — ${plan.wait} Then` : 'Drop'} "${best.title}" ${plan?.wait ? 'the Friday after' : when} (${Math.round(best.quality)}).${best.status === 'recorded' ? ' Get it mixed first.' : ''}${snap.newest && snap.newest.days < 21 ? ` "${snap.newest.title}" is only ${snap.newest.days} days old, though — give it room first.` : ''}`
        : `The best thing in the vault is "${best.title}" at ${Math.round(best.quality)}. I'd make one more before we drop.`
      : `There's nothing in the vault to drop. Studio first.`);
    if (has('album', 'ep', 'project', 'tape')) sayMgr(snap.drafts?.length ? `"${snap.drafts[0].title}" has ${snap.drafts[0].tracks} tracks in the album vault. Two singles out first, then the project.` : `For a project: save a tracklist in the album vault and we'll plan the singles around it.`);
    say(crewOf(state, 'publicist'), `Give me three days' notice before a drop and I'll line up the posts and a couple of blogs.`);
    say(crewOf(state, 'engineer'), best && best.status === 'recorded' ? `"${best.title}" isn't mixed. Don't drop a rough recording — give me a few days.` : '');
    say(crewOf(state, 'dj'), best ? `Let me test "${best.title}" in the club first. The floor never lies.` : '');
  }
  if (has('post', 'social', 'followers', 'fans', 'press', 'image', 'brand', 'viral')) say(crewOf(state, 'publicist'), `${snap.daysSincePost > 3 ? `It's been ${snap.daysSincePost} days since your last post — start there. ` : ''}Reply to fans under your posts; it feeds the algorithm and builds loyalty. Momentum is ${Math.round(snap.momentum)} right now.`);
  if (has('tired', 'energy', 'sleep', 'rest', 'gym', 'health', 'burn', 'sick')) {
    say(crewOf(state, 'trainer'), snap.energy < 40 ? `You're at ${Math.round(snap.energy)} energy — too low to be pushing. Rest today.` : `Energy ${Math.round(snap.energy)}. You're fine to work, just don't stack three heavy days in a row.`);
    say(crewOf(state, 'personal_assistant'), snap.nextPlan ? `I can move the ${snap.nextPlan.label} if you need the time.` : 'Your diary is clear. Sleep.');
  }
  if (has('court', 'sue', 'lawyer', 'contract', 'legal', 'sign')) say(crewOf(state, 'lawyer'), snap.openCase ? `There's an open case (${usd(snap.openCase.claim)}). Don't miss the hearing and let me look at the facts before you answer anyone.` : `No open cases. Send me anything with money or a signature on it before you agree to it.`);
  if (!actions.some((a) => a.kind.startsWith('push')) && has('show', 'gig', 'book', 'tour', 'offer', 'interview', 'feature', 'deal')) sayMgr(snap.openOffers ? `I've got ${snap.openOffers} open on my desk${snap.desk?.length ? ` (${snap.desk.slice(0, 2).join('; ')})` : ''}. Check the desk on the Team page and I'll give you my read on each.` : `Nothing new on the desk. ${snap.managerKind ? `As ${snap.managerKind.toLowerCase().replace(/^the /, 'your ')}, ` : ''}I'm working on it — tell me to push for shows, features or deals and I'll focus there.`);
  if (has('award', 'nominat', 'ceremony')) sayMgr(snap.nextAward ? `${snap.nextAward.name} is in ${snap.nextAward.days} days. ${snap.nextAward.nominated ? `You're nominated ${snap.nextAward.nominated}× — let's campaign.` : snap.nextAward.entered ? 'Your entries are in.' : 'Entries aren\'t in yet — sort that out on the Awards page.'}` : 'No ceremony coming up soon.');
  if (has('plan', 'schedule', 'today', 'diary', 'calendar', 'busy')) say(crewOf(state, 'personal_assistant'), snap.nextPlan ? `Next up: ${snap.nextPlan.label} in ${snap.nextPlan.inMin < 120 ? `${Math.round(snap.nextPlan.inMin)} minutes` : `${Math.round(snap.nextPlan.inMin / 60)} hours`}.${snap.nextShow ? ` Then ${snap.nextShow.label} in ${snap.nextShow.days} days.` : ''}` : snap.nextShow ? `Nothing today. ${snap.nextShow.label} in ${snap.nextShow.days} days.` : `Your diary is clear.`);
  if (has('style', 'outfit', 'fit', 'drip', 'wear')) say(crewOf(state, 'stylist'), `Check your wardrobe before any show or shoot. A strong look is worth real fans. I can pull something for the next event.`);
  if (has('advice', 'what should', 'what do i', 'what next', 'strategy', 'how are we', 'how we doing', 'update', 'status')) {
    const tip = snap.money < snap.burn * 1.5 ? 'cash first — book shows and hold off on spending'
      : (snap.vault?.[0]?.quality ?? 0) >= 68 && (!snap.newest || snap.newest.days > 30) ? `release "${snap.vault![0].title}" — it's ready and you've been quiet`
      : snap.momentum >= 35 ? 'strike while it\'s hot: a video or a feature on the newest record'
      : !snap.vault?.length ? 'studio — we need records to work with'
      : snap.daysSincePost > 5 ? 'get back on socials and remind people you exist'
      : 'keep building: one strong record, one show, one post a week';
    sayMgr(`Honest read: fame ${Math.round(snap.fame)}, momentum ${Math.round(snap.momentum)}, ${usd(snap.money)} in the bank. My advice right now — ${tip}.`);
    say(crewOf(state, 'accountant'), `Money-wise: ${snap.money >= (snap.burn + (snap.payroll ?? 0)) * 3 ? 'we\'re fine' : 'tight — be careful'}.`);
  }

  if (!out.length) {
    const crew = state.crew ?? [];
    const c = crew.length ? crew[h(seed) % crew.length] : undefined;
    if (m && allowed(m.id)) sayMgr(pick([`Got it. What do you need from us on that — shows, features, a deal?`, `Noted. Tell me what the goal is and I'll get the right person on it.`, `Understood. Want me to push for something specific this month?`], seed));
    else if (c) say(c, pick([`Noted 👍🏾 anything you need from me?`, `Got it, ${me}.`, `On it — say the word.`], seed));
  }
  return out.slice(0, 3);
}

// ─── WHEN THE TEAM DOESN'T AGREE ───────────────────────────────────────────
//
// Real groups argue. A professional team mostly doesn't — they've done this
// before, they know their lane, and they settle it in a DM. A young,
// inexperienced squad argues all the time: about when to drop, who gets the
// credit, who's not pulling their weight, whether there's money for a video.
// Hotheads and egos make it worse; unhappy people make it worse. When it
// happens in the group, they want you to settle it — and whoever you side
// with, the other one remembers.

export interface Member {
  id: string;
  name: string;
  role: string;
  skill: number;
  morale: number;
  style: WorkStyle;
  /** Months on the team. */
  months: number;
  /** How their last week went. */
  last?: EffortKind;
  /** The manager is on a contract, not the payroll. */
  isManager?: boolean;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** How professional the room is, 0–1. */
export function teamPro(members: Member[]): number {
  if (!members.length) return 1;
  const one = (m: Member) => clamp01(m.skill / 100 + Math.min(0.2, m.months / 30) + (m.morale - 60) / 400
    + (m.style === 'hothead' ? -0.15 : m.style === 'diva' ? -0.1 : m.style === 'wildcard' ? -0.06 : m.style === 'loyalist' || m.style === 'steady' ? 0.05 : 0));
  return members.reduce((a, m) => a + one(m), 0) / members.length;
}

/** Odds the group has an argument today. */
export function disputeChance(members: Member[]): number {
  if (members.length < 2) return 0;
  let p = 0.16 * Math.pow(1 - teamPro(members), 2);
  if (members.some((m) => (m.style === 'hothead' || m.style === 'diva') && m.morale < 55)) p += 0.02;
  return Math.min(0.12, p);
}

export interface DisputeDraft {
  topic: string;
  about: string;
  a: Member;
  b: Member;
  lines: TeamLine[];
  options: TeamDispute['options'];
  songId?: string;
}

const at = (m: Member) => `@${first(m.name)}`;
const line = (m: Member, text: string): TeamLine => ({ from: m.id, name: m.name, role: m.role, text });

/** Build an argument from what's true today. Null if nothing is worth fighting about. */
export function draftDispute(snap: Snapshot, members: Member[], seed: string): DisputeDraft | null {
  const by = (...roles: string[]) => members.filter((m) => roles.includes(m.role));
  const mgr = members.find((m) => m.isManager);
  const best = snap.vault?.[0];
  const me = snap.me ? first(snap.me) : 'boss';
  const hot = (m: Member) => m.style === 'hothead' || (m.style === 'diva' && m.morale < 60);
  const cands: { w: number; build: () => DisputeDraft | null }[] = [];
  const pub = by('publicist')[0];
  const eng = by('engineer')[0];
  const prod = by('producer')[0];
  const acct = by('accountant')[0];
  const body = by('trainer', 'personal_assistant')[0];
  const dj = by('dj')[0];
  const spender = by('stylist', 'photographer', 'publicist').find((m) => m.id !== acct?.id) ?? mgr;

  if (mgr && best && (pub || eng)) cands.push({ w: 3, build: () => {
    const b = eng && best.status !== 'mastered' ? eng : pub ?? eng!;
    const lines = [
      line(mgr, `"${best.title}" is ready. We drop ${snap.dropPlan && snap.dropPlan.daysToFriday <= 3 ? 'this Friday' : 'next Friday'} — momentum is ${Math.round(snap.momentum)}, I'm not wasting it.`),
      line(b, b.role === 'engineer' ? `${at(mgr)} it's not ${best.status === 'recorded' ? 'even mixed' : 'mastered'}. If it goes out like this it sounds cheap on every phone.` : `${at(mgr)} Friday is too soon. No teaser, no blogs lined up. Give me two weeks and it lands properly.`),
      line(mgr, hot(mgr) ? `Every week it's "two more weeks". The moment doesn't wait.` : `Two weeks and the moment's gone. ${me}, your call.`),
    ];
    return { topic: 'drop_timing', about: `when "${best.title}" comes out`, a: mgr, b, lines, songId: best.id, options: [{ id: 'a', label: `Drop it Friday (${first(mgr.name)})` }, { id: 'b', label: `Wait (${first(b.name)})` }, { id: 'calm', label: 'Both of you, relax. I decide.' }] };
  } });
  if (acct && spender && spender.id !== acct.id) cands.push({ w: snap.money < snap.burn * 4 ? 3 : 1.2, build: () => ({
    topic: 'money', about: 'whether there\'s money to spend', a: acct, b: spender,
    lines: [
      line(spender, `We need a proper video${best ? ` for "${best.title}"` : ''}. Cheap visuals make us look small.`),
      line(acct, `${at(spender)} we've got ${usd(snap.money)} and ${usd(snap.burn)} going out every month. No big spends until a show pays.`),
      line(spender, hot(spender) ? `You can't make money without spending money. Basic.` : `It's an investment, not a cost. ${me}?`),
    ],
    options: [{ id: 'a', label: `Hold the money (${first(acct.name)})` }, { id: 'b', label: `Spend on it (${first(spender.name)})` }, { id: 'calm', label: 'Bring me numbers, both of you' }],
  }) });
  if (prod && eng) cands.push({ w: 1.5, build: () => {
    const t = best?.title ?? snap.newest?.title ?? 'the last record';
    return {
      topic: 'credit', about: `the mix on "${t}"`, a: prod, b: eng,
      lines: [
        line(prod, `${at(eng)} why are my drums buried on "${t}"? The kick was the whole record.`),
        line(eng, `Because the vocal is the record. Your kick was clipping — I saved it.`),
        line(prod, hot(prod) ? `Saved it? You flattened it.` : `Next time ask me before you touch the drums.`),
      ],
      options: [{ id: 'a', label: `Bring the drums up (${first(prod.name)})` }, { id: 'b', label: `Vocal first (${first(eng.name)})` }, { id: 'calm', label: 'Sit in a room and fix it together' }],
    };
  } });
  if (mgr && body && (snap.energy < 45 || (snap.nextShow && snap.nextShow.days <= 3))) cands.push({ w: 2.5, build: () => ({
    topic: 'schedule', about: 'how hard you\'re being worked', a: mgr, b: body,
    lines: [
      line(mgr, `I've got more dates coming in. We take them — this is when you build a name.`),
      line(body, `${at(mgr)} ${me} is on ${Math.round(snap.energy)} energy. Book more and they're sick by the weekend.`),
      line(mgr, `They can sleep when they're famous.`),
    ],
    options: [{ id: 'a', label: `Keep booking (${first(mgr.name)})` }, { id: 'b', label: `Slow down (${first(body.name)})` }, { id: 'calm', label: 'I\'ll decide what I can handle' }],
  }) });
  const slacker = members.find((m) => m.last === 'none' && !m.isManager);
  const grinder = members.find((m) => m.id !== slacker?.id && (m.style === 'grinder' || m.style === 'loyalist' || m.skill >= 60));
  if (slacker && grinder) cands.push({ w: 3.5, build: () => ({
    topic: 'slacker', about: `${first(slacker.name)}'s week`, a: grinder, b: slacker,
    lines: [
      line(grinder, `${at(slacker)} we waited all week on you. Nothing came. Again.`),
      line(slacker, slacker.style === 'hothead' ? `Don't @ me in front of everybody.` : slacker.style === 'wildcard' ? `I had stuff going on. It's handled now.` : `Relax. It'll get done.`),
      line(grinder, `"It'll get done" doesn't pay anybody. ${me}, say something.`),
    ],
    options: [{ id: 'a', label: `Back ${first(grinder.name)}: "pick it up"` }, { id: 'b', label: `Back ${first(slacker.name)}: "give them a break"` }, { id: 'calm', label: 'I\'ll talk to them myself' }],
  }) });
  if (mgr && prod && best) cands.push({ w: 1.2, build: () => ({
    topic: 'feature_pick', about: `who goes on "${best.title}"`, a: mgr, b: prod,
    lines: [
      line(mgr, `Let me get a big name on "${best.title}". It's the only way it travels.`),
      line(prod, `${at(mgr)} it doesn't need a name, it needs the right voice. A big name for the sake of it kills the record.`),
    ],
    options: [{ id: 'a', label: `Get a big name (${first(mgr.name)})` }, { id: 'b', label: `The right voice (${first(prod.name)})` }, { id: 'calm', label: 'I\'ll pick the feature' }],
    songId: best.id,
  }) });
  const pusher = mgr ?? pub;
  if (dj && pusher && snap.newest && snap.newest.days > 21) cands.push({ w: 1.5, build: () => ({
    topic: 'dj_rotation', about: 'what the clubs get next', a: dj, b: pusher,
    lines: [
      line(dj, `The clubs are tired of "${snap.newest!.title}". I need something new to play.`),
      line(pusher, `${at(dj)} we're still pushing it to radio. One more month.`),
      line(dj, `Radio is not the club. The club decides first.`),
    ],
    options: [{ id: 'a', label: `New music for the clubs (${first(dj.name)})` }, { id: 'b', label: `Keep pushing it (${first(pusher.name)})` }, { id: 'calm', label: 'Both — test the next one quietly' }],
  }) });
  if (mgr && pub && snap.beef) cands.push({ w: 3, build: () => ({
    topic: 'beef', about: `how to answer ${snap.beef}`, a: mgr, b: pub,
    lines: [
      line(mgr, `Respond to ${snap.beef}. A reply record does numbers — everybody is waiting for it.`),
      line(pub, `${at(mgr)} silence is the move. It dies in a week if we let it.`),
      line(mgr, `Silence is how you lose a beef.`),
    ],
    options: [{ id: 'a', label: `Answer them (${first(mgr.name)})` }, { id: 'b', label: `Stay quiet (${first(pub.name)})` }, { id: 'calm', label: 'I\'ll handle my own beef' }],
  }) });
  if (members.length >= 2) cands.push({ w: 0.8, build: () => {
    const x = members[h(seed + 'g1') % members.length];
    const y = members.filter((m) => m.id !== x.id)[h(seed + 'g2') % (members.length - 1)];
    return {
      topic: 'petty', about: 'something small that got big', a: x, b: y,
      lines: [
        line(x, pick([`Whoever keeps changing the settings in the studio — stop.`, `Who took the car last night and left it on empty?`, `Somebody posted the studio address on their story. Not cool.`], seed + 'g3')),
        line(y, pick([`Nobody touched your stuff 😂 relax`, `Wasn't me. Check the cameras.`, `It was one story, it's deleted.`], seed + 'g4')),
        line(x, hot(x) ? `Every time something goes wrong it "wasn't you".` : `Just saying. It keeps happening.`),
      ],
      options: [{ id: 'a', label: `${first(x.name)}'s right` }, { id: 'b', label: `${first(y.name)}'s right` }, { id: 'calm', label: 'Squash it. Both of you.' }],
    };
  } });
  if (!cands.length) return null;
  const total = cands.reduce((a, c) => a + c.w, 0);
  let r = (h(seed + 'pick') % 10000) / 10000 * total;
  for (const c of cands) { r -= c.w; if (r <= 0) return c.build(); }
  return cands[cands.length - 1].build();
}

/** How the loser of an argument takes it, by who they are. */
function loserLine(m: Member, seed: string): string {
  switch (m.style) {
    case 'hothead': return pick(['Whatever. Do what you want.', 'Cool. Remember I said it.'], seed);
    case 'diva': return pick(['Fine. When it flops, remember this.', 'Noted. Don\'t come to me after.'], seed);
    case 'loyalist': return 'Your call, boss. I\'m with you either way.';
    case 'coaster': return 'Cool.';
    case 'grinder': return 'Alright. I\'ll make it work.';
    case 'timer': return 'Fine — but watch the timing.';
    case 'mercenary': return 'You\'re paying, you\'re deciding.';
    case 'wildcard': return pick(['Ok.', '🤷🏾'], seed);
    default: return 'Understood.';
  }
}

export interface DisputeOutcome {
  lines: TeamLine[];
  /** Morale changes for people on the payroll, by npc id. */
  morale: { id: string; v: number }[];
  /** Relationship changes (the manager, mostly). */
  rel: { id: string; v: number }[];
  text: string;
  /** The slacker was warned. */
  warn?: string;
}

/** You settled it. */
export function settleDispute(d: TeamDispute, option: 'a' | 'b' | 'calm', members: Member[], seed: string): DisputeOutcome {
  const A = members.find((m) => m.id === d.a.id);
  const B = members.find((m) => m.id === d.b.id);
  const out: DisputeOutcome = { lines: [], morale: [], rel: [], text: '' };
  const hit = (m: Member | undefined, v: number) => { if (!m) return; (m.isManager ? out.rel : out.morale).push({ id: m.id, v }); };
  if (option === 'calm') {
    const pro = teamPro(members.filter((m) => m.id === d.a.id || m.id === d.b.id)) >= 0.55;
    hit(A, pro ? 1 : -2); hit(B, pro ? 1 : -2);
    if (A) out.lines.push(line(A, pro ? 'Fair. My bad for bringing it here.' : 'Ok.'));
    if (B) out.lines.push(line(B, pro ? `All love ${at(A ?? B)} 🤝🏾` : '👍🏾'));
    out.text = pro ? 'They shook hands on it. Professionals.' : 'It went quiet. Not solved — just quiet.';
    return out;
  }
  const win = option === 'a' ? A : B;
  const lose = option === 'a' ? B : A;
  if (win) { hit(win, win.style === 'diva' ? 9 : 6); out.lines.push(line(win, pick(['Thank you.', 'Appreciate that, boss.', 'Told you 😤'], seed + 'w'))); }
  if (lose) {
    const v = lose.style === 'hothead' ? -10 : lose.style === 'diva' ? -9 : lose.style === 'loyalist' ? -3 : lose.style === 'grinder' ? -5 : -6;
    hit(lose, v);
    out.lines.push(line(lose, loserLine(lose, seed + 'l')));
  }
  if (d.topic === 'slacker' && option === 'a') out.warn = d.b.id;
  out.text = `You sided with ${first(win?.name ?? 'them')}. ${first(lose?.name ?? 'The other one')} ${lose && (lose.style === 'hothead' || lose.style === 'diva') ? 'took it personally.' : 'will get over it.'}`;
  return out;
}

/** Nobody settled it. */
export function lapseDispute(d: TeamDispute, members: Member[], seed: string): DisputeOutcome {
  const A = members.find((m) => m.id === d.a.id);
  const B = members.find((m) => m.id === d.b.id);
  const out: DisputeOutcome = { lines: [], morale: [], rel: [], text: '' };
  const pro = teamPro([A, B].filter((x): x is Member => !!x)) >= 0.55;
  for (const m of [A, B]) if (m) (m.isManager ? out.rel : out.morale).push({ id: m.id, v: pro ? 0 : -3 });
  const who = A ?? B;
  if (who) out.lines.push(line(who, pro ? 'We sorted it between us, boss. All good.' : pick(['Guess we figure it out ourselves then.', 'Nobody\'s going to say anything? Ok.'], seed)));
  out.text = pro ? 'They sorted it out themselves.' : 'You never said anything. It\'s still there.';
  return out;
}

/** The tag on a member in the group: how they work, once you know. */
export function styleTag(style: WorkStyle, known: boolean): string {
  return known ? `${WORK_STYLE[style].emoji} ${WORK_STYLE[style].label}` : '';
}
