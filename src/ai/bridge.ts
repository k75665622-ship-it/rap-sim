// ─── AI BRIDGE ─────────────────────────────────────────────────────────────
// Reads the game, asks Claude, writes the answer back through store actions.
// Everything here is optional and best-effort: if a call fails, the built-in
// writing takes over and the player never sees an error in the chat.

import { useGameStore, blendedFame, nowMinuteOf } from '../store/gameStore';
import { aiActiveFor, callAI as callClaude, parseJSON, mentionsAny, AIError } from '../sim/ai';
import { personaOf, styleNote } from '../sim/persona';
import { isSongReleased } from '../sim/release';
import type { GameState, NPC } from '../types/game';
import { isRealId } from '../sim/realPeople';
import { memoryContext } from '../sim/memories';
import { dateToSerial } from '../sim/gameClock';

// ─── THE RULES (cached on the API side) ────────────────────────────────────

export const RULES = `You write for RAP LIFE, a music-career simulation game set mostly in West Africa (Ghana, Nigeria) and the wider global scene. The player is an up-and-coming artist. Everyone you write for is a fictional character in the game's world: artists, producers, managers, bloggers, promoters, fans and the player's own team.

How to write:
- Write like a real person texting or posting in 2026: short, natural, one or two sentences. Lowercase and slang are fine when it fits the character. Emojis only if they fit the person.
- Ghanaian and Nigerian characters can use light pidgin and local expressions (e.g. "chale", "no wahala", "abeg", "e choke", "herh", "omo") where it is natural. Never overdo it.
- Stay in character. Match the personality, texting style, relationship and mood you are given. A person who dislikes the player is short or cold; a close friend is warm and teasing.
- React to what was actually said. If they sent a song, give an honest reaction that fits its quality.
- Never narrate, never describe actions in asterisks, never add quotation marks around the message, never mention being an AI or a game.
- Keep it PG-13. No slurs, no explicit sexual content, no instructions for anything dangerous or illegal.
- The game includes some real-world artists. Never write words for, quote, impersonate or make claims about any real person. Do not mention real artists, real celebrities or real companies by name.
- Never invent prices, chart positions or facts about the player beyond what you are told.
- Do not repeat the player's words back to them. Do not ask more than one question.
- Never repeat or rephrase something the character already said in the conversation. Move it forward: answer, react, joke, change the subject, or wrap up.
- Only talk about work, deals, songs, beats, mixes, verses, money or plans that are listed under "What is really going on between them". Never claim to have sent, mixed, mastered or finished anything that isn't listed. If nothing is listed, talk like a person: life, the scene, music in general, the player's released songs.
- If the character is upset with the player (ignored, stood up, owed something), they must say exactly what about, using the facts listed. Never complain about being ignored when nothing listed backs it up.
- When the player just says "ok", "cool", "bet" or similar to wrap things up, a short sign-off is fine — or no reply at all ("reply": "").
- Fit the reply to who they are: a producer talks beats and sessions, a manager talks business and schedule, a blogger wants a story, a fan is excited, a rival is guarded.
- Characters have memories. When the context lists what they remember about the player (a no-show, being left on read, a great session, a gift), let it colour how they talk — bring it up when it fits. Forgiving people let small things go; proud or petty people don't. Don't recite the list.

Game actions (only when the conversation clearly leads there):
- invite_studio / invite_linkup / invite_party: the character invites the player to a studio session, a hangout, or a party. Include a time like "20:00".
- If your message names a time to meet ("see you at 20:00", "pull up 9pm"), you MUST also set the matching action and "time", or the meeting will never happen. If a plan is already in the diary, use that time instead of inventing a new one.
- accept_studio / accept_linkup: the player asked to meet and the character agrees. Include the agreed time.
- offer_collab: the character wants the player on one of their songs.
- go_quiet: the player was rude or annoying enough that the character stops replying for a while.
- none: anything else (most of the time).

Relationship change ("rel"): an integer from -5 to 5. 0 for ordinary chat. Positive when the player is kind, respectful, funny or helpful; negative when rude, needy, spammy or disrespectful.

Always answer with JSON only, exactly in the format the request asks for, with no text before or after it.`;

// ─── CONTEXT ───────────────────────────────────────────────────────────────

function fameWord(f: number): string {
  return f >= 85 ? 'a global superstar' : f >= 65 ? 'a major star' : f >= 45 ? 'well known nationally' : f >= 25 ? 'known in their city' : f >= 10 ? 'an underground name' : 'unknown';
}

function relWord(r: number): string {
  return r >= 60 ? 'close friends' : r >= 25 ? 'friendly' : r >= -10 ? 'neutral / barely know each other' : r >= -50 ? 'cold, some tension' : 'hostile';
}

function timeWord(state: GameState): string {
  const m = (state.clockMinute ?? 600) % 1440;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} (${h < 5 ? 'late night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night'})`;
}

function realNames(state: GameState): string[] {
  return state.npcs.filter((n) => isRealId(n.id)).map((n) => n.name);
}

function playerBlock(state: GameState): string {
  const p = state.player!;
  const latest = [...state.songs].filter((s) => isSongReleased(s)).sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))[0];
  const beefs = state.beefs.filter((b) => !b.resolution).map((b) => b.npcName);
  return [
    `THE PLAYER: ${p.artistName} (${p.gender}), ${p.genre.replace(/_/g, ' ')} artist from ${p.city}, ${p.country}. ${fameWord(blendedFame(p))}.`,
    latest ? `Latest release: "${latest.title}".` : 'No releases yet.',
    beefs.length ? `In beef with: ${beefs.join(', ')}.` : '',
    `Game time: ${timeWord(state)}.`,
  ].filter(Boolean).join(' ');
}

function npcBlock(state: GameState, npc: NPC): string {
  const persona = personaOf(npc);
  const crew = state.crew.find((c) => c.npcId === npc.id);
  const manager = state.contracts.some((c) => c.type === 'management' && c.active && c.npcId === npc.id);
  return [
    `THE CHARACTER: ${npc.name}, ${npc.age}, ${npc.gender}, ${npc.role.replace(/_/g, ' ')}${npc.genre ? ` (${npc.genre.replace(/_/g, ' ')})` : ''} from ${npc.city ?? npc.country}. ${fameWord(npc.fame)}.`,
    `Personality: ${(npc.personality ?? []).join(', ').replace(/_/g, ' ')}. Temperament: ${persona.temperament}. Texting style: ${styleNote(persona.style)}.`,
    `Relationship with the player: ${relWord(npc.relationshipScore)} (${Math.round(npc.relationshipScore)}/100).${crew ? ` Works for the player as their ${crew.role.replace(/_/g, ' ')}.` : ''}${manager ? ' Is the player\'s manager.' : ''}`,
    state.beefs.some((b) => b.npcId === npc.id && !b.resolution) ? 'There is an active beef between them and the player.' : '',
    npc.memoryLog?.length ? `What happened between them recently: ${npc.memoryLog.slice(-6).join(' | ')}` : '',
    // The player's journal: what this person remembers, and the career's big moments.
    // They should act on it (bring up being stood up, thank them for showing up).
    memoryContext(state.memories, dateToSerial(state.gameDate), npc.id, state.player?.artistName),
    (() => { const b = openBusiness(state, npc); return `What is really going on between them (facts — don't invent others):\n${b.length ? b.map((x) => `- ${x}`).join('\n') : '- Nothing open right now: no plans, no deals, no work in progress.'}`; })(),
  ].filter(Boolean).join('\n');
}

function daysWord(d: number): string {
  return d <= 0 ? 'today' : d === 1 ? '1 day' : `${d} days`;
}

/** The real, open business between the player and this person — what the AI may talk about. */
export function openBusiness(state: GameState, npc: NPC): string[] {
  const out: string[] = [];
  const now = nowMinuteOf(state);
  const today = dateToSerial(state.gameDate);
  const first = npc.name.split(' ')[0];
  const crew = state.crew.find((c) => c.npcId === npc.id);
  if (crew) out.push(`${first} is on the player's team as their ${crew.role.replace(/_/g, ' ')}.`);
  for (const a of (state.appointments ?? []).filter((x) => x.npcId === npc.id)) {
    const h = ((a.atMinute % 1440) + 1440) % 1440;
    const clock = `${String(Math.floor(h / 60)).padStart(2, '0')}:${String(h % 60).padStart(2, '0')}`;
    const day = Math.floor(a.atMinute / 1440) - Math.floor(now / 1440);
    const when = `${day <= 0 ? 'today' : day === 1 ? 'tomorrow' : `in ${day} days`} at ${clock}`;
    if (a.status === 'confirmed') out.push(`In the diary: ${a.kind} with ${first} ${when} at ${a.place}.`);
    else if (a.status === 'proposed') out.push(`${a.from === 'npc' ? `${first} invited the player` : `The player asked ${first}`} to a ${a.kind} ${when}; no answer yet.`);
    else if (a.status === 'missed' && Math.floor(a.atMinute / 1440) >= today - 10) out.push(`The player did not show up to the ${a.kind} with ${first} ${daysWord(today - Math.floor(a.atMinute / 1440))} ago.`);
    else if (a.status === 'done' && Math.floor(a.atMinute / 1440) >= today - 5) out.push(`They had a ${a.kind} together ${daysWord(today - Math.floor(a.atMinute / 1440))} ago${a.outcome ? `: ${a.outcome.slice(0, 90)}` : ''}.`);
  }
  for (const r of (state.inboundRequests ?? []).filter((x) => x.npcId === npc.id)) {
    if (r.status === 'open') out.push(`${first} asked the player for a verse on their song "${r.npcSongTitle}" and offered $${Math.round(r.offer).toLocaleString()}; the player hasn't answered.`);
    else if (r.status === 'agreed') {
      const due = r.dueSerial !== undefined ? r.dueSerial - today : undefined;
      out.push(`Deal agreed: the player owes ${first} a verse for "${r.npcSongTitle}"${r.agreedFee ? ` ($${Math.round(r.agreedFee).toLocaleString()})` : ''}. ${due === undefined ? 'Not sent yet.' : due >= 0 ? `Due in ${daysWord(due)}.` : `It is ${daysWord(-due)} late.`}`);
    } else if (r.status === 'delivered' && r.balanceDue) out.push(`The player delivered the verse for "${r.npcSongTitle}"; ${first} still owes $${Math.round(r.balanceDue).toLocaleString()}.`);
  }
  for (const f of (state.featureRequests ?? []).filter((x) => x.npcId === npc.id)) {
    if (f.status === 'sent') out.push(`The player asked ${first} for a verse on "${f.songTitle}"; ${first} hasn't decided.`);
    else if (f.status === 'terms') out.push(`${first} will do a verse on "${f.songTitle}" for $${Math.round(f.fee).toLocaleString()}; waiting on the player.`);
    else if (f.status === 'paid_waiting') out.push(`${first} owes the player a verse on "${f.songTitle}"${f.verseDueSerial !== undefined ? ` (due in ${daysWord(Math.max(0, f.verseDueSerial - today))})` : ''}.`);
  }
  const beats = state.beats;
  for (const o of (beats?.orders ?? []).filter((x) => x.producerId === npc.id)) out.push(`${first} is making a beat for the player${o.forTitle ? ` for "${o.forTitle}"` : ''}, due in ${daysWord(Math.max(0, o.dueSerial - today))}.`);
  const theirBeats = (beats?.library ?? []).filter((b) => b.producerId === npc.id);
  if (theirBeats.length) out.push(`The player has ${theirBeats.length} beat${theirBeats.length > 1 ? 's' : ''} from ${first}: ${theirBeats.slice(0, 3).map((b) => `"${b.name}"${b.usedOnTitle ? ` (used on "${b.usedOnTitle}")` : ' (not used yet)'}`).join(', ')}.`);
  // Messages of theirs the player never answered.
  const t = state.dmThreads[npc.id];
  if (t) {
    const msgs = t.messages.filter((m) => !m.system);
    let i = msgs.length - 1;
    const unanswered: string[] = [];
    while (i >= 0 && !msgs[i].fromPlayer) { unanswered.unshift(msgs[i].content); i--; }
    if (unanswered.length >= 2) out.push(`The player hasn't replied to ${first}'s last ${unanswered.length} messages (latest: "${unanswered[unanswered.length - 1].slice(0, 80)}").`);
  }
  return out.slice(0, 8);
}

function transcript(state: GameState, npcId: string, npcName: string, limit = 14): string {
  const t = state.dmThreads[npcId];
  if (!t) return '(no messages yet)';
  const lines: string[] = [];
  for (const m of t.messages.slice(-limit)) {
    if (m.system) { if (m.content !== 'Seen') lines.push(`[${m.content}]`); continue; }
    const song = m.attachedSongId ? state.songs.find((s) => s.id === m.attachedSongId) : undefined;
    const songNote = song ? ` [sent their song "${song.title}", quality ${Math.round(song.quality)}/100]` : '';
    lines.push(`${m.fromPlayer ? state.player?.artistName ?? 'Player' : npcName}: ${m.content}${songNote}`);
  }
  return lines.join('\n');
}

// ─── CHAT ──────────────────────────────────────────────────────────────────

interface ChatOut { reply: string; rel?: number; action?: string; time?: string }

async function chatReply(npcId: string): Promise<void> {
  const st = useGameStore.getState();
  const npc = st.npcs.find((n) => n.id === npcId);
  if (!npc || !st.player) return;
  const context = `${playerBlock(st)}\n\n${npcBlock(st, npc)}`;
  const songs = st.songs.filter((x) => isSongReleased(x)).slice(-4).map((x) => `"${x.title}"`);
  const ask = `Conversation so far (oldest first):\n${transcript(st, npcId, npc.name, 18)}\n\n${songs.length ? `The player's released songs: ${songs.join(', ')}.\n` : ''}Write ${npc.name}'s next message to ${st.player.artistName}, answering the player's last message directly. One or two short texts' worth. Don't say anything ${npc.name.split(' ')[0]} already said above. Answer as JSON: {"reply": "...", "rel": 0, "action": "none", "time": ""}`;
  const text = await callClaude({ json: true, feature: 'dms', rules: RULES, context, messages: [{ role: 'user', content: ask }], maxTokens: 260 });
  const out = parseJSON<ChatOut>(text);
  if (out && typeof out.reply === 'string' && !out.reply.trim()) { useGameStore.getState().applyAIChat(npcId, { ...out, reply: '' }); return; }
  if (!out?.reply || mentionsAny(out.reply, realNames(st))) throw new AIError('Unusable reply', 'bad');
  useGameStore.getState().applyAIChat(npcId, out);
}

async function momentReply(npcId: string, momentId: string): Promise<void> {
  const st = useGameStore.getState();
  const npc = st.npcs.find((n) => n.id === npcId);
  const m = (st.moments ?? []).find((x) => x.id === momentId);
  if (!npc || !m || !st.player) return;
  const context = `${playerBlock(st)}\n\n${npcBlock(st, npc)}`;
  const ask = `Conversation so far:\n${transcript(st, npcId, npc.name, 10)}\n\nWhat the player decided: "${m.resolution?.label ?? ''}". What it led to: ${m.resolution?.text ?? ''}\n\nWrite ${npc.name}'s short reply to the player's last message, reacting naturally to that outcome. Answer as JSON: {"reply": "..."}`;
  const text = await callClaude({ json: true, feature: 'moments', rules: RULES, context, messages: [{ role: 'user', content: ask }], maxTokens: 120 });
  const out = parseJSON<{ reply: string }>(text);
  if (!out?.reply || mentionsAny(out.reply, realNames(st))) throw new AIError('Unusable reply', 'bad');
  useGameStore.getState().applyAIMomentReply(npcId, momentId, out.reply);
}

// ─── THE RUNNER ────────────────────────────────────────────────────────────
// One pass over every chat waiting on an answer. Safe to call often.

const inFlight = new Set<string>();

export function kickAI(): void {
  const st = useGameStore.getState();
  for (const [npcId, t] of Object.entries(st.dmThreads)) {
    if (!t.pendingAI || inFlight.has(npcId)) continue;
    const age = Date.now() - t.pendingAI.since;
    const feature = t.pendingAI.momentId ? 'moments' : 'dms';
    if (age > 30000 || !aiActiveFor(feature)) { st.fallbackAI(npcId); continue; }
    inFlight.add(npcId);
    const job = t.pendingAI.momentId ? momentReply(npcId, t.pendingAI.momentId) : chatReply(npcId);
    job.catch(() => useGameStore.getState().fallbackAI(npcId)).finally(() => inFlight.delete(npcId));
  }
}

// ─── SOCIAL: COMMENTS ON YOUR POSTS ────────────────────────────────────────

export async function commentsForPost(postId: string): Promise<void> {
  if (!aiActiveFor('social')) return;
  const st = useGameStore.getState();
  const post = st.socialPosts.find((x) => x.id === postId);
  if (!post || !st.player) return;
  const friends = st.npcs.filter((n) => !isRealId(n.id) && n.relationshipScore >= 30 && n.role === 'artist').slice(0, 3);
  const rivals = st.beefs.filter((b) => !b.resolution).map((b) => b.npcName).filter((n) => !mentionsAny(n, realNames(st))).slice(0, 2);
  const context = `${playerBlock(st)}\nThe player just posted on ${post.platform}: "${post.content}".${friends.length ? `\nFriends who might comment (use their exact names): ${friends.map((f) => f.name).join(', ')}.` : ''}${rivals.length ? `\nRivals whose fans might troll: ${rivals.join(', ')}.` : ''}`;
  const ask = 'Write 8 comments under this post from a realistic mix: excited fans with believable usernames (like "kwame_vibes" or "naija_queen23"), a couple of jokers, one hater or troll, and at most one or two of the friends listed (by name). React to what the post actually says. Answer as JSON: {"comments":[{"name":"...","text":"...","tone":"stan|love|neutral|hater|troll|artist"}]}';
  try {
    const text = await callClaude({ json: true, feature: 'social', rules: RULES, context, messages: [{ role: 'user', content: ask }], maxTokens: 500 });
    const out = parseJSON<{ comments: { name: string; text: string; tone?: string }[] }>(text);
    const names = realNames(st);
    const ok = (out?.comments ?? []).filter((c) => c?.name && c?.text && !mentionsAny(`${c.name} ${c.text}`, names));
    if (!ok.length) return;
    const tones = ['stan', 'love', 'neutral', 'hater', 'troll', 'artist'] as const;
    useGameStore.getState().addAIComments(postId, ok.map((c) => {
      const f = friends.find((x) => x.name === c.name);
      return { name: c.name, text: c.text, tone: (tones as readonly string[]).includes(c.tone ?? '') ? c.tone as typeof tones[number] : 'neutral', npcId: f?.id };
    }));
  } catch { /* the built-in comments are already there */ }
}

// ─── SOCIAL: REPLIES UNDER WHAT YOU SAID ───────────────────────────────────

export async function repliesForComment(postId: string): Promise<void> {
  if (!aiActiveFor('social')) return;
  const st = useGameStore.getState();
  const post = st.socialPosts.find((x) => x.id === postId);
  if (!post || !st.player) return;
  const all = [...post.comments, ...post.comments.flatMap((c) => c.replies ?? [])];
  const mine = [...all].reverse().find((c) => c.authorId === 'player');
  if (!mine) return;
  const parent = post.comments.find((c) => c.replies?.some((r) => r.id === mine.id));
  const names = realNames(st);
  if (mentionsAny(`${post.authorName} ${post.content} ${parent?.content ?? ''}`, names)) return;
  const who = post.authorId.startsWith('fan:') ? `a fan (${post.authorName})` : post.isPlayerPost ? 'the player' : `${post.authorName}`;
  const context = `${playerBlock(st)}\nOn ${post.platform}, ${who} posted: "${post.content.slice(0, 200)}".${parent ? `\n${parent.authorName} commented: "${parent.content.slice(0, 140)}"` : ''}\nThe player (${st.player.artistName}) just replied: "${mine.content.slice(0, 200)}".`;
  const count = Math.max(5, Math.min(10, Math.round(5 + blendedFame(st.player) / 15)));
  const ask = `Write ${count} replies that pile up under the player's comment, the way a real comment section reacts when an artist shows up: excited fans with believable usernames (like "kwame_vibes" or "naija_queen23"), people tagging friends, someone begging for a reply too, someone asking about new music, a joker, and at most one hater. React to what the player actually wrote. Answer as JSON: {"replies":[{"name":"...","text":"...","tone":"stan|love|neutral|hater|troll"}]}`;
  try {
    const text = await callClaude({ json: true, feature: 'social', rules: RULES, context, messages: [{ role: 'user', content: ask }], maxTokens: 600 });
    const out = parseJSON<{ replies: { name: string; text: string; tone?: string }[] }>(text);
    const ok = (out?.replies ?? []).filter((c) => c?.name && c?.text && !mentionsAny(`${c.name} ${c.text}`, names));
    if (ok.length) useGameStore.getState().addAIReplies(postId, mine.id, ok.map((c) => ({ name: c.name, text: c.text, tone: c.tone })));
  } catch { /* the built-in replies are already there */ }
}

// ─── THE FEED: THE SCENE TALKING ───────────────────────────────────────────
// Once a game day: fictional artists, fans and blogs post about their lives,
// the scene and the player's music, and comment on each other.

let lastFeedDay = -1;
let lastFeedAt = 0;

export async function runFeed(): Promise<void> {
  if (!aiActiveFor('social')) return;
  const st = useGameStore.getState();
  if (!st.player) return;
  const day = Math.floor(nowMinuteOf(st) / 1440);
  if (day === lastFeedDay || Date.now() - lastFeedAt < 200000) return;
  lastFeedDay = day;
  lastFeedAt = Date.now();
  const p = st.player;
  const blocked = new Set(st.blocked ?? []);
  const artists = st.npcs.filter((n) => !isRealId(n.id) && !blocked.has(n.id) && n.role === 'artist' && (n.country === p.country || n.relationshipScore >= 20))
    .sort(() => Math.random() - 0.5).slice(0, 7);
  const pages = st.npcs.filter((n) => !isRealId(n.id) && (n.role === 'blogger' || n.role === 'media' || n.role === 'fan_account') && n.country === p.country).slice(0, 2);
  const people = [...artists, ...pages];
  if (!people.length) return;
  const codes = people.map((n, i) => ({ code: `A${i + 1}`, n }));
  const names = realNames(st);
  const headlines = st.headlines.slice(0, 5).map((h) => h.text).filter((t) => !mentionsAny(t, names));
  const npcSongs = st.npcSongs.filter((x) => codes.some((c) => c.n.id === x.ownerId)).slice(-6).map((x) => `"${x.title}" by ${people.find((n) => n.id === x.ownerId)?.name}`);
  const latest = st.songs.filter((x) => isSongReleased(x)).slice(-3).map((x) => `"${x.title}"`);
  const context = `${playerBlock(st)}${latest.length ? ` The player's recent songs: ${latest.join(', ')}.` : ''}\nNews this week: ${headlines.join(' | ') || 'quiet week'}.${npcSongs.length ? `\nSongs out from the scene: ${npcSongs.join(', ')}.` : ''}\n\nAccounts:\n${codes.map(({ code, n }) => { const pp = personaOf(n); return `${code}: ${n.name}, ${n.role.replace(/_/g, ' ')}, ${fameWord(n.fame)}, ${pp.temperament.toLowerCase()}, ${styleNote(pp.style)}${st.beefs.some((b) => b.npcId === n.id && !b.resolution) ? ', in beef with the player' : ''}`; }).join('\n')}`;
  const ask = `Write today's timeline: 6 to 9 posts. Most from the accounts above (by code), 2 or 3 from fans with invented usernames ("who": "fan", "name": "kofi_vibes"). Mix it up: studio life, a song they dropped, a question to followers, a hot take about the scene, jokes, a night out, shout-outs, and a few about the player (praise, a question, or shade from a rival). Each post gets 2 or 3 comments from other accounts above (by code) or fans (by name). Answer as JSON: {"posts":[{"who":"A1|fan","name":"","app":"chirp|snapgram|clip","text":"...","comments":[{"who":"A2|fan","name":"","text":"..."}]}]}`;
  try {
    const text = await callClaude({ json: true, feature: 'social', rules: RULES, context, messages: [{ role: 'user', content: ask }], maxTokens: 1400 });
    const out = parseJSON<{ posts: { who: string; name?: string; app?: string; text: string; comments?: { who: string; name?: string; text: string }[] }[] }>(text);
    const resolve = (who: string, name?: string) => {
      const c = codes.find((x) => x.code === who);
      if (c) return { id: c.n.id, name: c.n.name };
      const handle = (name || '').replace(/^@/, '').replace(/\s+/g, '_').slice(0, 24);
      return handle ? { id: `fan:${handle.toLowerCase()}`, name: handle } : null;
    };
    const posts = (out?.posts ?? []).flatMap((x) => {
      const a = x?.text ? resolve(x.who, x.name) : null;
      if (!a || mentionsAny(`${a.name} ${x.text}`, names)) return [];
      const comments = (x.comments ?? []).flatMap((c) => { const b = c?.text ? resolve(c.who, c.name) : null; return b && !mentionsAny(`${b.name} ${c.text}`, names) ? [{ authorId: b.id, authorName: b.name, text: c.text }] : []; });
      return [{ authorId: a.id, authorName: a.name, app: x.app === 'snapgram' || x.app === 'clip' ? x.app : 'chirp', text: x.text, comments }];
    });
    if (posts.length) useGameStore.getState().addAIFeed(posts);
  } catch { /* the built-in feed keeps going */ }
}

// ─── THE DIRECTOR: PEOPLE ACTING ON THEIR OWN ──────────────────────────────
// Once per game day (and at most every few real minutes), the people around
// you decide what to do: text you, post, invite you somewhere, gossip.

let lastDirectorDay = -1;
let lastDirectorAt = 0;

export async function runDirector(): Promise<void> {
  if (!aiActiveFor('director')) return;
  const st = useGameStore.getState();
  if (!st.player) return;
  const day = Math.floor(nowMinuteOf(st) / 1440);
  if (day === lastDirectorDay || Date.now() - lastDirectorAt < 150000) return;
  lastDirectorDay = day;
  lastDirectorAt = Date.now();

  const blocked = new Set(st.blocked ?? []);
  const pool = st.npcs.filter((n) => !isRealId(n.id) && !blocked.has(n.id) && n.role !== 'fan_account');
  const pickBy = (f: (n: NPC) => boolean, k: number) => pool.filter(f).sort(() => Math.random() - 0.5).slice(0, k);
  const beefIds = new Set(st.beefs.filter((b) => !b.resolution).map((b) => b.npcId));
  const people = [
    ...pickBy((n) => n.relationshipScore >= 30, 3),
    ...pickBy((n) => beefIds.has(n.id), 1),
    ...pickBy((n) => n.role === 'artist' && n.country === st.player!.country && Math.abs(n.relationshipScore) < 30, 2),
    ...pickBy((n) => (n.role === 'blogger' || n.role === 'media') && n.country === st.player!.country, 1),
    ...pickBy((n) => n.role === 'producer' && n.country === st.player!.country, 1),
    ...st.crew.slice(0, 2).map((c) => pool.find((n) => n.id === c.npcId)).filter((n): n is NPC => !!n),
  ];
  const unique = [...new Map(people.map((n) => [n.id, n])).values()].slice(0, 9);
  if (!unique.length) return;
  const codes = unique.map((n, i) => ({ code: `N${i + 1}`, n }));
  const headlines = st.headlines.slice(0, 4).map((h) => h.text).filter((t) => !mentionsAny(t, realNames(st)));
  const context = `${playerBlock(st)}\nRecent news: ${headlines.join(' | ') || 'quiet week'}.\n\nPeople around the player:\n${codes.map(({ code, n }) => {
    const p = personaOf(n);
    return `${code}: ${n.name}, ${n.role.replace(/_/g, ' ')}, ${fameWord(n.fame)}, ${p.temperament.toLowerCase()}, texting style: ${styleNote(p.style)}; relationship ${relWord(n.relationshipScore)}${beefIds.has(n.id) ? ', IN BEEF with the player' : ''}${n.memoryLog?.length ? `; recently: ${n.memoryLog.slice(-2).join(' | ')}` : ''}${(st.memories ?? []).filter((m) => m.npcIds?.includes(n.id)).slice(0, 2).map((m) => `; remembers: ${m.text.replace(/\bYou\b/g, 'the player')}`).join('')}${(() => { const b = openBusiness(st, n); const last = st.dmThreads[n.id]?.messages.filter((m) => !m.system).slice(-2).map((m) => `${m.fromPlayer ? 'player' : 'them'}: "${m.content.slice(0, 70)}"`).join(' / '); return `${b.length ? `\n   facts: ${b.join(' ')}` : '\n   facts: nothing open between them.'}${last ? `\n   last texts: ${last}` : ''}`; })()}`;
  }).join('\n')}`;
  const ask = 'Decide what 3 to 6 of these people do today, each acting from their own personality and their facts with the player. Options: "dm" (text the player — about something real from their facts, or just life/the scene; never invent deals, sessions or work that isn\'t in their facts, and never say "you ignored me" unless the facts show unanswered messages or a missed plan — then say what about), "post" (a public post on "chirp" or "snapgram" about their own life, music, the scene, or the player\'s songs — most days most people post rather than text), "invite" (invite the player to a "studio" session, "linkup" or "party" at a time like "21:00", with the message they send), "gossip" (only bloggers/media: a short headline about the player). Keep it believable and varied. Answer as JSON: {"events":[{"who":"N1","type":"dm|post|invite|gossip","text":"...","kind":"studio|linkup|party","time":"21:00","app":"chirp|snapgram"}]}';
  try {
    const text = await callClaude({ json: true, feature: 'director', rules: RULES, context, messages: [{ role: 'user', content: ask }], maxTokens: 900 });
    const out = parseJSON<{ events: { who: string; type: string; text?: string; kind?: string; time?: string; app?: string }[] }>(text);
    const names = realNames(st);
    const events = (out?.events ?? [])
      .map((e) => ({ ...e, npcId: codes.find((c) => c.code === e.who)?.n.id ?? '' }))
      .filter((e) => e.npcId && (!e.text || !mentionsAny(e.text, names)));
    if (events.length) useGameStore.getState().applyAIDirector(events);
  } catch { /* the built-in world keeps running */ }
}

// ─── INTERVIEWS: THE HOST FOLLOWS YOUR ANSWER ──────────────────────────────

const rewritten = new Set<string>();

export async function interviewFollowUp(): Promise<void> {
  if (!aiActiveFor('interviews')) return;
  const st = useGameStore.getState();
  const live = st.activeInterview;
  if (!live || !st.player) return;
  const key = `${live.id}|${live.idx}`;
  const q = live.questions[live.idx];
  if (!q || rewritten.has(key)) return;
  const names = realNames(st);
  if (mentionsAny(q.host, names) || q.surprise) return; // surprises and real names stay as written
  rewritten.add(key);
  const last = live.transcript[live.transcript.length - 1];
  const context = `${playerBlock(st)}\nInterview: ${live.outletName}, host ${live.host}, format: ${live.format.replace(/_/g, ' ')}.`;
  const ask = `${last ? `The host asked: "${last.q}"\nThe player answered: "${last.a}"\nHow it landed: ${last.reaction}\n\n` : ''}The host's next question (keep its meaning and topic, because the player's answer options are written for it): "${q.host}"\nThe player's possible answers: ${q.options.map((o) => `"${o.text}"`).join(' / ')}\n\nRewrite the host's next line so it sounds live and natural: ${last ? 'a quick, in-character reaction to the last answer, then ' : 'a short on-air welcome, then '}the question. Two or three sentences at most. Answer as JSON: {"host": "..."}`;
  try {
    const text = await callClaude({ json: true, feature: 'interviews', rules: RULES, context, messages: [{ role: 'user', content: ask }], maxTokens: 160 });
    const out = parseJSON<{ host: string }>(text);
    if (out?.host && !mentionsAny(out.host, names)) useGameStore.getState().rewriteInterviewQuestion(live.idx, out.host);
  } catch { /* keep the written question */ }
}
