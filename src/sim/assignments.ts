// ─── WHAT YOUR TEAM IS WORKING ON ──────────────────────────────────────────
//
// Everybody on the payroll has a job, and you decide what they spend the week
// on. The publicist can chase buzz, clean up a mess or book you press. The
// accountant can do the books, run your investments, or haggle on every big
// purchase. Each choice does something every week, and they tell you what.
//
// Pure: the store applies the result.

export interface Assignment { id: string; label: string; emoji: string; blurb: string }

export const ASSIGNMENTS: Record<string, Assignment[]> = {
  accountant: [
    { id: 'books', label: 'Books & tax', emoji: '📒', blurb: 'Finds money you were losing and shelters income from tax.' },
    { id: 'markets', label: 'Financial advisor', emoji: '📈', blurb: 'Reads the markets for you: buy/sell calls on every stock and coin, rug-pull warnings, and a monthly return on your portfolio.' },
    { id: 'deals', label: 'Deal-maker', emoji: '🤝', blurb: 'Haggles on every big purchase — 8% off businesses, upgrades, land and builds.' },
  ],
  lawyer: [
    { id: 'contracts', label: 'Contracts', emoji: '📜', blurb: 'Reviews every deal and claws back part of every cut.' },
    { id: 'disputes', label: 'Disputes', emoji: '⚖️', blurb: 'Fights fines and lawsuits against your businesses — they cost half.' },
    { id: 'royalties', label: 'Royalty chase', emoji: '💸', blurb: 'Chases unpaid royalties every week.' },
  ],
  publicist: [
    { id: 'buzz', label: 'Buzz', emoji: '📣', blurb: 'Places stories every week. Momentum up.' },
    { id: 'damage', label: 'Damage control', emoji: '🧯', blurb: 'Quietly repairs your reputation week by week.' },
    { id: 'press', label: 'Press bookings', emoji: '🎙️', blurb: 'Gets you more interview invitations.' },
    { id: 'socials', label: 'Social media manager', emoji: '📱', blurb: 'Runs your pages: posts for you a few times a week, answers fans, and keeps your accounts from going quiet. Followers grow.' },
  ],
  stylist: [
    { id: 'image', label: 'Your image', emoji: '🪞', blurb: 'Charisma and stage presence every week.' },
    { id: 'brands', label: 'Brand deals', emoji: '🏷️', blurb: 'Lands small paid brand posts every week.' },
    { id: 'merch', label: 'Your clothing line', emoji: '👕', blurb: 'Designs for your clothing brand — sales up 15%.' },
  ],
  photographer: [
    { id: 'covers', label: 'Covers & stills', emoji: '🖼️', blurb: 'Creativity every week; your covers look the part.' },
    { id: 'socials', label: 'Your socials', emoji: '📸', blurb: 'Content for every app — posts reach 15% further and followers grow.' },
  ],
  personal_assistant: [
    { id: 'diary', label: 'Diary', emoji: '🗓️', blurb: 'Keeps the days running — you recover energy faster.' },
    { id: 'errands', label: 'Business errands', emoji: '🏃', blurb: 'Sorts permits and paperwork for your builds — fees halved.' },
    { id: 'network', label: 'Networking', emoji: '🥂', blurb: 'Gets you into rooms. Networking up every week.' },
  ],
  trainer: [
    { id: 'stamina', label: 'Stamina', emoji: '🔋', blurb: 'A higher energy ceiling and better recovery.' },
    { id: 'stage', label: 'Stage fitness', emoji: '🕺', blurb: 'Stage presence and performance every week.' },
  ],
  producer: [
    { id: 'beats', label: 'Beats for you', emoji: '🎹', blurb: 'A new beat in your library every few days.' },
    { id: 'placements', label: 'Sell beats', emoji: '💰', blurb: 'Sells beats to other artists — weekly income, fewer beats for you.' },
    { id: 'mentor', label: 'Teach you', emoji: '🎓', blurb: 'Beat selection and production knowledge every week.' },
  ],
  engineer: [
    { id: 'sessions', label: 'Your sessions', emoji: '🎚️', blurb: 'Shorter, cheaper sessions and the odd beat.' },
    { id: 'rentals', label: 'Run the studio rentals', emoji: '🔑', blurb: 'Fills your studio when you\'re out — rent-out income +30%.' },
    { id: 'beatmaking', label: 'Make beats', emoji: '🥁', blurb: 'Spends the week making beats — more in your library.' },
  ],
  songwriter: [
    { id: 'yours', label: 'Your songs', emoji: '✍️', blurb: 'Songwriting and lyricism every week.' },
    { id: 'pitch', label: 'Write for others', emoji: '💵', blurb: 'Sells songs to other artists — weekly income.' },
  ],
  vocal_coach: [
    { id: 'voice', label: 'Your voice', emoji: '🎤', blurb: 'Vocals and delivery every week.' },
    { id: 'live', label: 'Live shows', emoji: '🔥', blurb: 'Performance every week.' },
    { id: 'freestyle', label: 'Freestyle drills', emoji: '🧠', blurb: 'Freestyle every week.' },
  ],
};

export function assignmentsFor(role: string): Assignment[] {
  return ASSIGNMENTS[role] ?? [];
}
export function currentAssignment(role: string, id?: string): Assignment | undefined {
  const list = assignmentsFor(role);
  return list.find((a) => a.id === id) ?? list[0];
}

export interface WorkResult {
  stats?: Record<string, number>;
  money?: number;
  momentum?: number;
  rep?: number;
  energy?: number;
  followers?: number;
  /** Posts the social media manager puts up for you this week. */
  posts?: number;
  line: string;
}

/** A week of work. `skill` 0-100, `morale` 0-100. Only the EXTRA from the assignment; the role's base effect is applied elsewhere. */
export function weekOfWork(role: string, assignment: string | undefined, skill: number, morale: number, ctx: { fame: number; weeklyStreamIncome: number; studioLevel: number; npcName: string; special?: string }): WorkResult | null {
  const base = baseWeek(role, assignment, skill, morale, ctx);
  return base && ctx.special ? withSpecial(base, role, currentAssignment(role, assignment)?.id ?? '', ctx.special, skill, morale, ctx) : base;
}

/** What their special skill adds on top of the week. */
function withSpecial(r: WorkResult, role: string, job: string, special: string, skill: number, morale: number, ctx: { weeklyStreamIncome: number; studioLevel: number; npcName: string }): WorkResult {
  const out: WorkResult = { ...r, stats: { ...(r.stats ?? {}) } };
  const q = (skill / 100) * (0.6 + morale / 250);
  const mult = (k: 'money' | 'rep' | 'followers' | 'momentum', m: number) => { if (out[k]) out[k] = Math.round((out[k] as number) * m * 10) / 10; };
  const addStat = (k: string, v: number) => { out.stats![k] = (out.stats![k] ?? 0) + v; };
  switch (`${special}:${role}:${job}`) {
    case 'shark:lawyer:royalties': mult('money', 1.6); break;
    case 'spin_doctor:publicist:damage': mult('rep', 2); break;
    case 'hype_machine:publicist:buzz': out.momentum = (out.momentum ?? 0) + 1; break;
    case 'deal_closer:stylist:brands': mult('money', 1.4); break;
    case 'viral_eye:photographer:socials': mult('followers', 1.5); break;
    case 'hitmaker:producer:placements': mult('money', 1.4); break;
    case 'golden_ears:engineer:rentals': mult('money', 1.4); break;
    case 'hook_genius:songwriter:pitch': mult('money', 1.5); break;
  }
  if (special === 'tax_wizard') { const m = Math.round(ctx.weeklyStreamIncome * 0.015); if (m > 0) { out.money = (out.money ?? 0) + m; out.line += ` Clawed back $${m.toLocaleString()} in tax.`; } }
  if (special === 'studio_hustler' && job !== 'rentals' && ctx.studioLevel >= 2) { const m = Math.round((100 + skill * 5) * (0.6 + q)); out.money = (out.money ?? 0) + m; out.line += ` Rented your room out on the side: $${m.toLocaleString()}.`; }
  if (special === 'ghost_pen') { addStat('songwriting', 0.25 * q); addStat('lyricism', 0.25 * q); }
  if (special === 'voice_doctor') { addStat('vocalAbility', 0.3 * q); addStat('delivery', 0.25 * q); }
  if (special === 'drill_sergeant') { addStat('stagePresence', 0.3 * q); addStat('performance', 0.25 * q); }
  if (special === 'cover_artist') addStat('creativity', 0.25 * q);
  if (!Object.keys(out.stats!).length) delete out.stats;
  return out;
}

function baseWeek(role: string, assignment: string | undefined, skill: number, morale: number, ctx: { fame: number; weeklyStreamIncome: number; studioLevel: number; npcName: string }): WorkResult | null {
  const a = currentAssignment(role, assignment);
  if (!a) return null;
  const q = (skill / 100) * (0.6 + morale / 250);
  const n = ctx.npcName.split(' ')[0];
  switch (`${role}:${a.id}`) {
    case 'accountant:books': return { line: `${n} went through your books and your tax.` };
    case 'lawyer:contracts': return { line: `${n} read every contract on your desk.` };
    case 'photographer:covers': return { line: `${n} shot new stills for your covers.` };
    case 'personal_assistant:diary': return { line: `${n} kept your diary tight — you rest better.` };
    case 'trainer:stamina': return { line: `${n} ran your conditioning sessions.` };
    case 'producer:beats': return { line: `${n} cooked up beats for you.` };
    case 'engineer:sessions': return { line: `${n} kept your sessions running on time.` };
    case 'songwriter:yours': return { line: `${n} wrote with you all week.` };
    case 'vocal_coach:voice': return { line: `${n} worked on your voice.` };
    case 'accountant:markets': return { line: `${n} reviewed your portfolio and the markets.` };
    case 'accountant:deals': return { line: `${n} is ready to haggle on your next big purchase.` };
    case 'lawyer:royalties': { const m = Math.round(80 + ctx.weeklyStreamIncome * 0.06 * q); return { money: m, line: `${n} chased down $${m.toLocaleString()} in unpaid royalties.` }; }
    case 'lawyer:disputes': return { line: `${n} is watching your businesses for trouble.` };
    case 'publicist:buzz': { const v = Math.round(1 + q * 2.5); return { momentum: v, line: `${n} placed ${v > 2 ? 'two stories' : 'a story'} about you (+${v} momentum).` }; }
    case 'publicist:damage': { const v = Math.round((0.3 + q * 0.9) * 10) / 10; return { rep: v, line: `${n} smoothed things over with the press (+${v} reputation).` }; }
    case 'publicist:press': return { line: `${n} pitched you to producers and hosts all week.` };
    case 'publicist:socials': { const posts = 2 + Math.round(q * 2); const f = Math.round((40 + ctx.fame * 22) * (0.5 + q)); return { posts, followers: f, line: `${n} ran your pages: ${posts} posts, replies to fans (+${f.toLocaleString()} followers).` }; }
    case 'stylist:image': return { stats: { charisma: 0.2 * q, stagePresence: 0.2 * q }, line: `${n} worked on your look.` };
    case 'stylist:brands': { const m = Math.round((150 + ctx.fame * 45) * (0.5 + q)); return { money: m, line: `${n} landed a paid brand post: $${m.toLocaleString()}.` }; }
    case 'stylist:merch': return { line: `${n} designed new pieces for your clothing line.` };
    case 'photographer:socials': { const f = Math.round((60 + ctx.fame * 30) * (0.5 + q)); return { followers: f, line: `${n} shot a week of content (+${f.toLocaleString()} followers).` }; }
    case 'personal_assistant:network': return { stats: { networking: 0.4 * q }, line: `${n} got you into two rooms that matter.` };
    case 'personal_assistant:errands': return { line: `${n} chased permits and paperwork.` };
    case 'trainer:stage': return { stats: { stagePresence: 0.35 * q, performance: 0.3 * q }, line: `${n} ran stage-fitness sessions.` };
    case 'producer:placements': { const m = Math.round((120 + skill * 14) * (0.6 + morale / 200)); return { money: m, line: `${n} sold beats to other artists: $${m.toLocaleString()}.` }; }
    case 'producer:mentor': return { stats: { beatSelection: 0.45 * q, productionKnowledge: 0.4 * q }, line: `${n} taught you how they build a beat.` };
    case 'engineer:rentals': { const m = ctx.studioLevel >= 2 ? Math.round((200 + skill * 10) * (0.6 + q)) : 0; return { money: m, line: m ? `${n} booked your room for other artists: $${m.toLocaleString()}.` : `${n} has no room to rent out — build a project studio.` }; }
    case 'engineer:beatmaking': return { line: `${n} spent the week making beats.` };
    case 'songwriter:pitch': { const m = Math.round((140 + skill * 16) * (0.6 + morale / 200)); return { money: m, line: `${n} sold a song to another artist: $${m.toLocaleString()}.` }; }
    case 'vocal_coach:live': return { stats: { performance: 0.45 * q }, line: `${n} drilled your live vocals.` };
    case 'vocal_coach:freestyle': return { stats: { freestyle: 0.55 * q }, line: `${n} ran freestyle drills with you.` };
    default: return { line: `${n}: ${a.label.toLowerCase()}.` };
  }
}
