// ─── PINGCHAT ──────────────────────────────────────────────────────────────
// Your DMs, reading like real DMs: they text, you answer (or leave them on
// read), they answer back. Plans become cards with a time. With a manager the
// business goes to their desk (pinned at the top).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore, nowMinuteOf } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { gradeLabel } from '../../sim/studio';
import { ManagerDesk } from '../moments/ManagerDesk';
import { Avatar } from '../social/shared';
import { personaOf } from '../../sim/persona';
import { KIND_LABEL, whenLabel, slotChoices, DAY } from '../../sim/appointments';
import { aiSettings } from '../../sim/ai';
import { kickAI } from '../../ai/bridge';
import type { Appointment, DMMessage, Moment, NPC } from '../../types/game';
import { isRealId } from '../../sim/realPeople';

function relChip(score: number) {
  if (score >= 60) return { label: 'Close', cls: 'bg-rise/15 text-rise' };
  if (score >= 20) return { label: 'Cool', cls: 'bg-new/15 text-new' };
  if (score >= -20) return { label: 'Neutral', cls: 'bg-white/10 text-ink3' };
  if (score >= -60) return { label: 'Cold', cls: 'bg-amber/15 text-amber' };
  return { label: 'Hostile', cls: 'bg-fall/15 text-fall' };
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

function preview(m?: DMMessage): string {
  if (!m) return 'No messages yet';
  if (m.system) return m.content === 'Seen' ? 'Seen' : m.content;
  return `${m.fromPlayer ? 'You: ' : ''}${m.content}`;
}

const DESK = '__desk__';

export function PingChatScreen() {
  const npcs = useGameStore((s) => s.npcs);
  const dmThreads = useGameStore((s) => s.dmThreads);
  const markDMRead = useGameStore((s) => s.markDMRead);
  const focusedNPCId = useGameStore((s) => s.selectedNPCId);
  const moments = useGameStore((s) => s.moments);
  const desk = useGameStore((s) => s.managerDesk);
  const contracts = useGameStore((s) => s.contracts);
  const blocked = useGameStore((s) => s.blocked);
  const clearReadThreads = useGameStore((s) => s.clearReadThreads);
  const markDeskSeen = useGameStore((s) => s.markDeskSeen);

  const [selectedId, setSelectedId] = useState<string | null>(focusedNPCId);
  const [search, setSearch] = useState('');

  const npcById = useMemo(() => new Map(npcs.map((n) => [n.id, n])), [npcs]);
  const managerContract = contracts.find((c) => c.type === 'management' && c.active);
  const manager = managerContract ? npcById.get(managerContract.npcId) : undefined;
  const deskWaiting = (desk ?? []).filter((b) => b.status === 'new').length;
  const blockSet = useMemo(() => new Set(blocked ?? []), [blocked]);

  const conversations = useMemo(() => {
    const rows = Object.values(dmThreads)
      .map((thread) => {
        const npc = npcById.get(thread.npcId);
        if (!npc || npc.role === 'fan_account' || thread.messages.length === 0) return null;
        const last = [...thread.messages].reverse().find((m) => !m.system) ?? thread.messages[thread.messages.length - 1];
        return { thread, npc, last };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    rows.sort((a, b) => {
      const ua = a.thread.unread > 0 ? 1 : 0;
      const ub = b.thread.unread > 0 ? 1 : 0;
      if (ub !== ua) return ub - ua;
      return (b.last ? new Date(b.last.timestamp).getTime() : 0) - (a.last ? new Date(a.last.timestamp).getTime() : 0);
    });
    return rows;
  }, [dmThreads, npcById]);
  const totalUnread = conversations.reduce((s, c) => s + c.thread.unread, 0);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return npcs.filter((n) => n.role !== 'fan_account' && (n.name.toLowerCase().includes(q) || (n.city ?? '').toLowerCase().includes(q))).sort((a, b) => b.fame - a.fame).slice(0, 25);
  }, [npcs, search]);

  const selectedNPC = selectedId && selectedId !== DESK ? npcById.get(selectedId) : undefined;

  function select(id: string) {
    setSelectedId(id);
    if (id === DESK) markDeskSeen();
    else markDMRead(id);
    setSearch('');
  }
  const showList = !selectedId;

  return (
    <div className="h-[calc(100dvh-72px)] md:h-[calc(100dvh-48px)] flex gap-4 -mb-3 md:mb-0">
      {/* Conversation list — full width on a phone until you open one. */}
      <div className={cn('w-full md:w-[320px] flex-shrink-0 flex-col rounded-[18px] border border-line bg-card overflow-hidden', showList ? 'flex' : 'hidden md:flex')}>
        <div className="px-4 pt-4 pb-3 border-b border-line">
          <div className="flex items-center justify-between">
            <h1 className="text-[22px] font-bold text-ink">PingChat</h1>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && <span className="px-2 h-[20px] rounded-full bg-amber text-black text-[11px] font-bold flex items-center">{totalUnread}</span>}
              <button onClick={clearReadThreads} className="text-[11px] text-ink3 hover:text-ink" title="Delete every chat you've read">Clear read</button>
            </div>
          </div>
          <input className="mt-3 w-full h-10 rounded-full bg-sidebar border border-line px-4 text-[13px] text-ink placeholder:text-ink3 outline-none focus:border-amber" placeholder="Search anyone to message…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {aiSettings().enabled && <div className="mt-2 text-[10px] text-re font-semibold">✦ AI brain on — people write their own replies</div>}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {!search.trim() && (
            <button onClick={() => select(DESK)} className={cn('w-full text-left p-3 rounded-[14px] transition', selectedId === DESK ? 'bg-amber/10' : 'hover:bg-white/[0.03]')}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-amber/15 flex items-center justify-center text-[20px] shrink-0">📋</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="text-[14px] font-semibold text-ink">{manager ? `${manager.name.split(' ')[0]}'s desk` : 'Business'}</span>{deskWaiting > 0 && <span className="ml-auto px-1.5 h-[18px] rounded-full bg-amber text-black text-[10px] font-bold flex items-center">{deskWaiting}</span>}</div>
                  <div className="text-[12px] text-ink3 truncate">{manager ? 'Shows, features, interviews — with advice' : 'No manager: offers come straight to your DMs'}</div>
                </div>
              </div>
            </button>
          )}
          {search.trim() ? (
            <>
              <p className="text-[10px] text-ink3 uppercase tracking-wider px-2 pt-1">{searchResults.length} match{searchResults.length === 1 ? '' : 'es'}</p>
              {searchResults.map((npc) => (
                <button key={npc.id} onClick={() => select(npc.id)} className="w-full text-left p-2.5 rounded-[14px] hover:bg-white/[0.03] flex items-center gap-3">
                  <Avatar name={npc.name} seed={npc.id} size={40} />
                  <div className="min-w-0 flex-1"><div className="text-[14px] text-ink truncate">{npc.name}</div><div className="text-[12px] text-ink3 truncate">{npc.role.replace(/_/g, ' ')} · {npc.city ?? npc.country}</div></div>
                </button>
              ))}
              {searchResults.length === 0 && <p className="text-[12px] text-ink3 text-center py-6">Nobody by that name.</p>}
            </>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-3 text-[12px] text-ink3">No conversations yet. Search a name to reach out.</div>
          ) : (
            conversations.map(({ npc, thread: t, last }) => {
              const waiting = (moments ?? []).some((m) => m.npcId === npc.id && m.channel === 'dm' && m.status === 'open');
              const typing = !!t.pendingAI;
              return (
                <button key={npc.id} onClick={() => select(npc.id)} className={cn('w-full text-left p-2.5 rounded-[14px] transition', selectedId === npc.id ? 'bg-amber/[0.08]' : 'hover:bg-white/[0.03]')}>
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar name={npc.name} seed={npc.id} size={46} />
                      {waiting && <span className="absolute -right-0.5 -bottom-0.5 w-4 h-4 rounded-full bg-amber border-2 border-card" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[14px] truncate', t.unread > 0 ? 'text-ink font-bold' : 'text-ink font-medium')}>{npc.name}</span>
                        {npc.id === manager?.id && <span className="text-[9px] font-bold text-amber">MANAGER</span>}
                        <span className="text-[11px] text-ink3 ml-auto shrink-0">{last ? timeAgo(last.timestamp) : ''}</span>
                      </div>
                      <div className={cn('text-[13px] truncate', typing ? 'text-rise' : t.unread > 0 ? 'text-ink2 font-medium' : 'text-ink3')}>{blockSet.has(npc.id) ? 'Blocked' : typing ? 'typing…' : preview(last)}</div>
                    </div>
                    {t.unread > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber text-black text-[11px] font-bold flex items-center justify-center shrink-0">{t.unread}</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat / desk */}
      <div className={cn('flex-1 min-w-0 flex-col', showList ? 'hidden md:flex' : 'flex')}>
        {selectedId === DESK ? (
          <div className="flex-1 overflow-y-auto rounded-[18px] border border-line bg-card p-4">
            <button onClick={() => setSelectedId(null)} className="md:hidden text-[13px] text-ink2 mb-3">← Chats</button>
            <ManagerDesk />
          </div>
        ) : !selectedNPC ? (
          <div className="flex-1 rounded-[18px] border border-line bg-card flex items-center justify-center p-6 text-center">
            <div><div className="text-4xl mb-2">💬</div><p className="text-ink2 text-sm">Pick a conversation, or search for someone new.</p><p className="text-ink3 text-xs mt-1">Who they are decides how they answer.</p></div>
          </div>
        ) : (
          <Conversation npc={selectedNPC} isManager={selectedNPC.id === manager?.id} blocked={blockSet.has(selectedNPC.id)} onBack={() => setSelectedId(null)} />
        )}
      </div>
    </div>
  );
}

// ─── ONE CONVERSATION ──────────────────────────────────────────────────────

function Conversation({ npc, isManager, blocked, onBack }: { npc: NPC; isManager: boolean; blocked: boolean; onBack: () => void }) {
  const thread = useGameStore((s) => s.dmThreads[npc.id]);
  const moments = useGameStore((s) => s.moments);
  const appointments = useGameStore((s) => s.appointments);
  const songs = useGameStore((s) => s.songs);
  const sendDM = useGameStore((s) => s.sendDM);
  const deleteThread = useGameStore((s) => s.deleteThread);
  const unblockAccount = useGameStore((s) => s.unblockAccount);
  const openArtist = useGameStore((s) => s.openArtist);
  const markDMRead = useGameStore((s) => s.markDMRead);
  const [message, setMessage] = useState('');
  const [song, setSong] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'none' | 'song' | 'plan' | 'menu'>('none');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const persona = personaOf(npc);
  const rel = relChip(npc.relationshipScore);
  const real = isRealId(npc.id);
  const msgs = thread?.messages ?? [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, thread?.pendingAI, npc.id]);
  useEffect(() => { if (thread?.unread) markDMRead(npc.id); }, [thread?.unread, npc.id, markDMRead]);

  function send() {
    if (!message.trim()) return;
    sendDM(npc.id, message.trim(), song ?? undefined);
    setMessage('');
    setSong(null);
    setSheet('none');
    setTimeout(kickAI, 50);
  }

  const momentById = useMemo(() => new Map((moments ?? []).map((m) => [m.id, m])), [moments]);
  const apptById = useMemo(() => new Map((appointments ?? []).map((a) => [a.id, a])), [appointments]);
  const hasNote = useMemo(() => new Set(msgs.filter((m) => m.system && m.momentId).map((m) => m.momentId!)), [msgs]);
  // Only the newest card for each plan shows its buttons.
  const lastCard = useMemo(() => { const out = new Map<string, string>(); for (const m of msgs) if (m.appointmentId) out.set(m.appointmentId, m.id); return out; }, [msgs]);
  const attached = song ? songs.find((s) => s.id === song) : undefined;

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-[18px] border border-line bg-[#0C0D12] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-line bg-card">
        <button onClick={onBack} className="md:hidden text-ink2 text-[20px] w-8 h-8 flex items-center justify-center" aria-label="Back">←</button>
        <button onClick={() => openArtist(npc.id)} className="shrink-0"><Avatar name={npc.name} seed={npc.id} size={40} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-ink text-[15px] truncate">{npc.name}</span>
            <span className={cn('shrink-0 px-1.5 h-[17px] rounded-full text-[9px] font-bold uppercase flex items-center', rel.cls)}>{rel.label}</span>
          </div>
          <div className="text-[11px] text-ink3 truncate">{thread?.pendingAI ? <span className="text-rise">typing…</span> : <>{isManager ? 'Your manager · ' : ''}{npc.role.replace(/_/g, ' ')} · {persona.temperament}{persona.tags[0] ? ` · ${persona.tags[0]}` : ''}</>}</div>
        </div>
        {!blocked && !real && <button onClick={() => setSheet(sheet === 'plan' ? 'none' : 'plan')} className="w-9 h-9 rounded-full border border-line text-[16px] hover:bg-white/5 shrink-0" title="Make plans" aria-label="Make plans">📅</button>}
        <button onClick={() => setSheet(sheet === 'menu' ? 'none' : 'menu')} className="w-9 h-9 rounded-full border border-line text-ink2 hover:bg-white/5 shrink-0" aria-label="More">⋯</button>
      </div>

      {sheet === 'menu' && (
        <div className="px-3 py-2 border-b border-line bg-card flex flex-wrap gap-2 rl-fade">
          <Button size="sm" variant="secondary" onClick={() => openArtist(npc.id)}>👤 Profile</Button>
          {persona.tags.map((t) => <span key={t} className="h-8 px-3 rounded-full bg-white/5 text-[11px] text-ink2 flex items-center">{t}</span>)}
          {thread && (confirmDelete
            ? <><Button size="sm" variant="secondary" onClick={() => { deleteThread(npc.id); onBack(); }}>Delete chat</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button></>
            : <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>🗑 Delete chat</Button>)}
        </div>
      )}
      {sheet === 'plan' && <PlanSheet npc={npc} onDone={() => setSheet('none')} />}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1.5">
        {msgs.length === 0 && <div className="text-center py-10 text-[13px] text-ink3">You have never spoken to {npc.name}. Say something.</div>}
        {msgs.map((msg, i) => {
          const prev = msgs[i - 1];
          const moment = msg.momentId && !msg.system ? momentById.get(msg.momentId) : undefined;
          if (msg.appointmentId) {
            const a = apptById.get(msg.appointmentId);
            return <PlanCard key={msg.id} text={msg.content} a={a} live={lastCard.get(msg.appointmentId) === msg.id} />;
          }
          if (msg.system) {
            if (msg.content === 'Seen') return <div key={msg.id} className="text-right text-[10px] text-ink3 pr-1 -mt-0.5">Seen ✓</div>;
            return (
              <div key={msg.id} className="flex flex-col items-center gap-1 py-1.5">
                <div className="max-w-[88%] text-center text-[11px] text-ink3 italic leading-snug">{msg.content}</div>
                {!!msg.chips?.length && <div className="flex flex-wrap gap-1 justify-center">{msg.chips.map((c) => <span key={c} className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', /^[−-]/.test(c) || / -\d|−/.test(c) ? 'bg-fall/10 text-fall' : 'bg-rise/10 text-rise')}>{c}</span>)}</div>}
              </div>
            );
          }
          const mine = msg.fromPlayer;
          const grouped = prev && !prev.system && prev.fromPlayer === mine;
          return (
            <div key={msg.id}>
              <div className={cn('flex', mine ? 'justify-end' : 'justify-start', grouped ? 'mt-0.5' : 'mt-2')}>
                <div className={cn('max-w-[82%] sm:max-w-[420px] px-3.5 py-2 text-[14px] leading-snug whitespace-pre-wrap break-words rl-pop',
                  mine ? 'bg-amber text-black rounded-[18px] rounded-br-[6px]' : 'bg-white/[0.08] text-ink rounded-[18px] rounded-bl-[6px]')}>
                  {msg.attachedSongId && <div className="text-[12px] opacity-75 mb-1 pb-1 border-b border-current/20">🎵 {msg.attachedTitle ? `"${msg.attachedTitle}"` : 'A song'}</div>}
                  {msg.content}
                </div>
              </div>
              {moment && <MomentReplies moment={moment} legacy={moment.status !== 'open' && !hasNote.has(moment.id) && !moment.data?.inChat} />}
            </div>
          );
        })}
        {thread?.pendingAI && (
          <div className="flex justify-start mt-2">
            <div className="bg-white/[0.08] rounded-[18px] rounded-bl-[6px] px-4 py-3 flex gap-1">
              {[0, 1, 2].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-ink3 rl-live-dot" style={{ animationDelay: `${d * 0.18}s` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {blocked ? (
        <div className="p-3 border-t border-line bg-card flex items-center justify-between gap-3 text-[13px] text-ink2">
          You blocked {npc.name}.
          <Button size="sm" variant="secondary" onClick={() => unblockAccount(npc.id)}>Unblock</Button>
        </div>
      ) : (
        <div className="border-t border-line bg-card p-2.5 space-y-2">
          {sheet === 'song' && songs.length > 0 && (
            <div className="max-h-44 overflow-y-auto rounded-[12px] border border-line bg-sidebar p-1 rl-fade">
              {songs.slice(-30).reverse().map((s) => (
                <button key={s.id} onClick={() => { setSong(s.id); setSheet('none'); }} className="w-full text-left px-3 py-2 rounded-[10px] hover:bg-white/5 text-[13px] text-ink truncate">🎵 {s.title} <span className="text-ink3 text-[11px]">· {gradeLabel(s.quality)}{s.masterStatus !== undefined && s.masterStatus !== 'released' ? ' · unreleased' : ''}</span></button>
              ))}
            </div>
          )}
          {attached && <div className="flex items-center gap-2 text-[12px] text-ink2 px-1">🎵 Sending “{attached.title}” <button onClick={() => setSong(null)} className="text-ink3 hover:text-ink">✕</button></div>}
          <div className="flex items-center gap-2">
            {songs.length > 0 && <button onClick={() => setSheet(sheet === 'song' ? 'none' : 'song')} className={cn('w-10 h-10 rounded-full border text-[16px] shrink-0', song ? 'border-amber bg-amber/10' : 'border-line hover:bg-white/5')} aria-label="Attach a song">🎵</button>}
            <input className="flex-1 min-w-0 h-11 rounded-full bg-sidebar border border-line px-4 text-[15px] text-ink placeholder:text-ink3 outline-none focus:border-amber" placeholder={`Message ${npc.name.split(' ')[0]}…`} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button onClick={send} disabled={!message.trim()} className="w-11 h-11 rounded-full bg-amber text-black font-bold text-[16px] disabled:opacity-30 shrink-0" aria-label="Send">➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUICK REPLIES UNDER A MESSAGE THAT WANTS AN ANSWER ────────────────────

function MomentReplies({ moment, legacy }: { moment: Moment; legacy: boolean }) {
  const answerMoment = useGameStore((s) => s.answerMoment);
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const energy = useGameStore((s) => s.player?.energy ?? 0);
  const [err, setErr] = useState<string | null>(null);
  if (legacy) {
    return <div className="text-[11px] text-ink3 italic mt-1 ml-2 max-w-[82%]">{moment.resolution?.label ? `You chose "${moment.resolution.label}". ` : ''}{moment.resolution?.text}</div>;
  }
  if (moment.status !== 'open') return null;
  return (
    <div className="mt-1.5 ml-1 flex flex-wrap gap-1.5 max-w-[92%]">
      {moment.options.map((o) => {
        const silent = o.id === 'ignore' || o.id === 'nothing' || o.id === 'silent';
        const broke = !!o.cost && money < o.cost;
        const tired = !!o.energy && energy < o.energy && !(moment.kind === 'studio_invite' && o.id === 'go');
        return (
          <button
            key={o.id}
            disabled={broke || tired}
            title={o.hint}
            onClick={() => { const r = answerMoment(moment.id, o.id); if (!r.ok) setErr(r.message); else { setErr(null); setTimeout(kickAI, 50); } }}
            className={cn('text-left rounded-[16px] border px-3 py-1.5 transition disabled:opacity-40',
              silent ? 'border-dashed border-line text-ink3 hover:text-ink2' : 'border-amber/50 text-amber bg-amber/[0.06] hover:bg-amber/15')}
          >
            <div className="text-[13px] font-semibold leading-tight">{silent ? '👀 ' : ''}{o.label}</div>
            {(o.hint || o.energy || broke || tired) && <div className="text-[10px] opacity-70 leading-tight mt-0.5">{[o.hint, o.energy ? `⚡${o.energy}` : '', broke ? 'not enough money' : '', tired ? 'too tired' : ''].filter(Boolean).join(' · ')}</div>}
          </button>
        );
      })}
      {err && <div className="w-full text-[11px] text-fall">{err}</div>}
    </div>
  );
}

// ─── A PLAN IN THE CHAT ────────────────────────────────────────────────────

function PlanCard({ text, a, live }: { text: string; a?: Appointment; live: boolean }) {
  const now = useGameStore((s) => nowMinuteOf(s));
  const respond = useGameStore((s) => s.respondToPlan);
  const reschedule = useGameStore((s) => s.rescheduleAppointment);
  const cancel = useGameStore((s) => s.cancelAppointment);
  const [pick, setPick] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!a) return <div className="text-center text-[11px] text-ink3 py-1">{text}</div>;
  const label = KIND_LABEL[a.kind];
  const status = a.status === 'proposed' ? { t: 'Invite', c: 'text-amber' } : a.status === 'confirmed' ? { t: 'In your diary', c: 'text-rise' } : a.status === 'done' ? { t: 'Done', c: 'text-ink3' } : a.status === 'live' ? { t: 'Happening now', c: 'text-amber' } : a.status === 'missed' ? { t: 'Missed', c: 'text-fall' } : { t: 'Cancelled', c: 'text-ink3' };
  const slots = slotChoices(now, a.kind);
  return (
    <div className="flex justify-center py-1.5">
      <div className="w-full max-w-[360px] rounded-[16px] border border-line bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div className="w-11 h-11 rounded-[12px] bg-white/[0.06] flex items-center justify-center text-[22px] shrink-0">{label.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-ink truncate">{label.label}</div>
            <div className="text-[12px] text-ink2 truncate">{whenLabel(a.atMinute, now)} · {a.place}</div>
          </div>
          <span className={cn('text-[10px] font-bold uppercase shrink-0', status.c)}>{status.t}</span>
        </div>
        {live && (a.status === 'proposed' || a.status === 'confirmed') && (
          <div className="px-3.5 pb-3 space-y-2">
            {pick ? (
              <div className="flex flex-wrap gap-1.5">
                {slots.map((t) => <button key={t} onClick={() => { setMsg((a.status === 'proposed' ? respond(a.id, true, t) : reschedule(a.id, t)).message); setPick(false); }} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink hover:bg-white/5">{whenLabel(t, now)}</button>)}
                <button onClick={() => setPick(false)} className="h-8 px-2 text-[12px] text-ink3">Back</button>
              </div>
            ) : a.status === 'proposed' ? (
              <div className="grid grid-cols-3 gap-1.5">
                <Button size="sm" onClick={() => setMsg(respond(a.id, true).message)}>I'm in</Button>
                <Button size="sm" variant="secondary" onClick={() => setPick(true)}>Other time</Button>
                <Button size="sm" variant="ghost" onClick={() => setMsg(respond(a.id, false).message)}>Decline</Button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setPick(true)}>Move it</Button>
                <Button size="sm" variant="ghost" onClick={() => setMsg(cancel(a.id).message)}>Cancel</Button>
                <span className="ml-auto text-[11px] text-ink3 self-center">{Math.max(0, Math.round((a.atMinute - now) / 60))}h away</span>
              </div>
            )}
            {msg && <div className="text-[11px] text-ink3">{msg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAKE PLANS WITH THEM ──────────────────────────────────────────────────

function PlanSheet({ npc, onDone }: { npc: NPC; onDone: () => void }) {
  const now = useGameStore((s) => nowMinuteOf(s));
  const plan = useGameStore((s) => s.planAppointment);
  const [kind, setKind] = useState<Appointment['kind']>('studio');
  const [day, setDay] = useState(0);
  const [hour, setHour] = useState(20);
  const [msg, setMsg] = useState<string | null>(null);
  const base = Math.floor(now / DAY) * DAY;
  const at = base + day * DAY + hour * 60;
  const tooSoon = at - now < 45;
  return (
    <div className="px-3 py-3 border-b border-line bg-card space-y-2.5 rl-fade">
      <div className="text-[12px] font-semibold text-ink">Make plans with {npc.name.split(' ')[0]}</div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(Object.keys(KIND_LABEL) as Appointment['kind'][]).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={cn('shrink-0 h-8 px-3 rounded-full border text-[12px] font-semibold', kind === k ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink2')}>{KIND_LABEL[k].emoji} {KIND_LABEL[k].label}</button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {['Today', 'Tomorrow', 'In 2 days'].map((l, i) => <button key={l} onClick={() => setDay(i)} className={cn('h-8 px-3 rounded-full border text-[12px] font-semibold', day === i ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink2')}>{l}</button>)}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {[10, 12, 14, 16, 18, 19, 20, 21, 22, 23].map((h) => <button key={h} onClick={() => setHour(h)} className={cn('shrink-0 h-8 px-2.5 rounded-full border text-[12px] num', hour === h ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink2')}>{h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}</button>)}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={tooSoon} onClick={() => { const r = plan(npc.id, kind, at); setMsg(r.message); if (r.ok) setTimeout(onDone, 1200); }}>Invite · {whenLabel(at, now)}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Close</Button>
        {tooSoon && <span className="text-[11px] text-ink3">Give them an hour's notice.</span>}
      </div>
      {msg && <div className="text-[12px] text-ink2">{msg}</div>}
    </div>
  );
}
