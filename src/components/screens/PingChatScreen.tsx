// ─── PINGCHAT ──────────────────────────────────────────────────────────────
// Your DMs. With a manager, the business goes to their desk (pinned at the
// top) and your inbox stays personal. Delete a chat, clear everything you've
// read, and blocked accounts can't reach you.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { gradeLabel } from '../../sim/studio';
import { MomentCard } from '../moments/MomentCard';
import { ManagerDesk } from '../moments/ManagerDesk';
import { Avatar } from '../social/shared';

function getRelLabel(score: number) {
  if (score >= 60) return { label: 'Close', cls: 'bg-rise/15 text-rise' };
  if (score >= 20) return { label: 'Cool', cls: 'bg-[#4DA3FF]/15 text-[#4DA3FF]' };
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

const DESK = '__desk__';

export function PingChatScreen() {
  const npcs = useGameStore((s) => s.npcs);
  const dmThreads = useGameStore((s) => s.dmThreads);
  const songs = useGameStore((s) => s.songs);
  const sendDM = useGameStore((s) => s.sendDM);
  const markDMRead = useGameStore((s) => s.markDMRead);
  const setScreen = useGameStore((s) => s.setScreen);
  const openArtist = useGameStore((s) => s.openArtist);
  const focusedNPCId = useGameStore((s) => s.selectedNPCId);
  const moments = useGameStore((s) => s.moments);
  const desk = useGameStore((s) => s.managerDesk);
  const contracts = useGameStore((s) => s.contracts);
  const blocked = useGameStore((s) => s.blocked);
  const deleteThread = useGameStore((s) => s.deleteThread);
  const clearReadThreads = useGameStore((s) => s.clearReadThreads);
  const unblockAccount = useGameStore((s) => s.unblockAccount);
  const markDeskSeen = useGameStore((s) => s.markDeskSeen);

  const [selectedId, setSelectedId] = useState<string | null>(focusedNPCId);
  const [message, setMessage] = useState('');
  const [attachedSongId, setAttachedSongId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const npcById = useMemo(() => new Map(npcs.map((n) => [n.id, n])), [npcs]);
  const managerContract = contracts.find((c) => c.type === 'management' && c.active);
  const manager = managerContract ? npcById.get(managerContract.npcId) : undefined;
  const deskWaiting = (desk ?? []).filter((b) => b.status === 'new').length;
  const blockSet = new Set(blocked ?? []);

  const conversations = useMemo(() => {
    const rows = Object.values(dmThreads)
      .map((thread) => {
        const npc = npcById.get(thread.npcId);
        if (!npc || npc.role === 'fan_account') return null;
        return { thread, npc, last: thread.messages[thread.messages.length - 1] };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    rows.sort((a, b) => {
      if ((b.thread.unread > 0 ? 1 : 0) !== (a.thread.unread > 0 ? 1 : 0)) return (b.thread.unread > 0 ? 1 : 0) - (a.thread.unread > 0 ? 1 : 0);
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
  const thread = selectedNPC ? dmThreads[selectedNPC.id] : null;
  const isBlocked = selectedNPC ? blockSet.has(selectedNPC.id) : false;

  function select(id: string) {
    setSelectedId(id);
    setConfirmDelete(false);
    if (id === DESK) markDeskSeen();
    else markDMRead(id);
    setSearch('');
  }
  function send() {
    if (!selectedNPC || !message.trim()) return;
    sendDM(selectedNPC.id, message.trim(), attachedSongId ?? undefined);
    setMessage('');
    setAttachedSongId(null);
  }
  const rel = selectedNPC ? getRelLabel(selectedNPC.relationshipScore) : null;
  const showList = !selectedId;

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* Conversation list — full width on a phone until you open one. */}
      <div className={cn('w-full md:w-80 flex-shrink-0 flex-col rounded-[16px] border border-line bg-card overflow-hidden', showList ? 'flex' : 'hidden md:flex')}>
        <div className="px-4 pt-4 pb-3 border-b border-line">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-bold text-ink">PingChat</h1>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && <span className="px-2 h-[20px] rounded-full bg-amber/15 text-amber text-[11px] font-bold flex items-center">{totalUnread} new</span>}
              <button onClick={clearReadThreads} className="text-[11px] text-ink3 hover:text-ink" title="Delete every chat you've read">Clear read</button>
            </div>
          </div>
          <input className="mt-3 w-full h-9 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink placeholder:text-ink3 outline-none focus:border-amber" placeholder="Find anyone to message…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!search.trim() && (
            <button onClick={() => select(DESK)} className={cn('w-full text-left p-3 rounded-[12px] border transition', selectedId === DESK ? 'border-amber/50 bg-amber/10' : 'border-transparent hover:bg-white/[0.03]')}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber/15 flex items-center justify-center text-[18px] shrink-0">📋</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><span className="text-[13px] font-semibold text-ink">{manager ? `${manager.name.split(' ')[0]}'s desk` : 'Business'}</span>{deskWaiting > 0 && <span className="ml-auto px-1.5 h-[18px] rounded-full bg-amber text-black text-[10px] font-bold flex items-center">{deskWaiting}</span>}</div>
                  <div className="text-[11px] text-ink3 truncate">{manager ? 'Shows, features, interviews — briefed with advice' : 'No manager: offers come straight to your DMs'}</div>
                </div>
              </div>
            </button>
          )}
          {search.trim() ? (
            <>
              <p className="text-[10px] text-ink3 uppercase tracking-wider px-2 pt-1">{searchResults.length} match{searchResults.length === 1 ? '' : 'es'}</p>
              {searchResults.map((npc) => (
                <button key={npc.id} onClick={() => select(npc.id)} className="w-full text-left p-2.5 rounded-[12px] hover:bg-white/[0.03] flex items-center gap-3">
                  <Avatar name={npc.name} seed={npc.id} size={34} />
                  <div className="min-w-0 flex-1"><div className="text-[13px] text-ink truncate">{npc.name}</div><div className="text-[11px] text-ink3 truncate">{npc.role.replace(/_/g, ' ')} · {npc.city ?? npc.country}</div></div>
                </button>
              ))}
              {searchResults.length === 0 && <p className="text-[12px] text-ink3 text-center py-6">Nobody by that name.</p>}
            </>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-3 text-[12px] text-ink3">No conversations yet. Search a name to reach out.</div>
          ) : (
            conversations.map(({ npc, thread: t, last }) => {
              const r = getRelLabel(npc.relationshipScore);
              const waiting = (moments ?? []).some((m) => m.npcId === npc.id && m.channel === 'dm' && m.status === 'open');
              return (
                <button key={npc.id} onClick={() => select(npc.id)} className={cn('w-full text-left p-2.5 rounded-[12px] border transition', selectedId === npc.id ? 'border-amber/40 bg-amber/[0.06]' : 'border-transparent hover:bg-white/[0.03]')}>
                  <div className="flex items-center gap-3">
                    <Avatar name={npc.name} seed={npc.id} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[13px] truncate', t.unread > 0 ? 'text-ink font-bold' : 'text-ink2 font-medium')}>{npc.name}</span>
                        {npc.id === manager?.id && <span className="text-[9px] font-bold text-amber">MANAGER</span>}
                        <span className="text-[10px] text-ink3 ml-auto shrink-0">{last ? timeAgo(last.timestamp) : ''}</span>
                      </div>
                      <div className={cn('text-[12px] truncate', t.unread > 0 ? 'text-ink2' : 'text-ink3')}>{blockSet.has(npc.id) ? 'Blocked' : last ? `${last.fromPlayer ? 'You: ' : ''}${last.content}` : 'No messages yet'}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={cn('px-1.5 h-[16px] rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center', r.cls)}>{r.label}</span>
                        {waiting && <span className="px-1.5 h-[16px] rounded-full text-[9px] font-bold uppercase tracking-wide flex items-center bg-amber/15 text-amber">Needs answer</span>}
                      </div>
                    </div>
                    {t.unread > 0 && <span className="w-2.5 h-2.5 bg-amber rounded-full shrink-0" />}
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
          <div className="flex-1 overflow-y-auto rounded-[16px] border border-line bg-card p-4">
            <button onClick={() => setSelectedId(null)} className="md:hidden text-[13px] text-ink2 mb-3">← Chats</button>
            <ManagerDesk />
          </div>
        ) : !selectedNPC ? (
          <div className="flex-1 rounded-[16px] border border-line bg-card flex items-center justify-center p-6 text-center">
            <div><div className="text-4xl mb-2">💬</div><p className="text-ink2 text-sm">Pick a conversation, or search for someone new.</p><p className="text-ink3 text-xs mt-1">Your relationship decides how they answer.</p></div>
          </div>
        ) : (
          <>
            <div className="rounded-[16px] border border-line bg-card p-3 mb-3 flex items-center gap-3">
              <button onClick={() => setSelectedId(null)} className="md:hidden text-ink2 text-[18px] px-1" aria-label="Back">←</button>
              <Avatar name={selectedNPC.name} seed={selectedNPC.id} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{selectedNPC.name}</div>
                <div className="text-[12px] text-ink3 truncate">{selectedNPC.role.replace(/_/g, ' ')} · {selectedNPC.city ?? selectedNPC.country}{selectedNPC.team?.label ? ` · ${selectedNPC.team.label}` : ''}</div>
              </div>
              {rel && <span className={cn('px-2 h-[20px] rounded-full text-[10px] font-bold uppercase flex items-center shrink-0', rel.cls)}>{rel.label} {Math.round(selectedNPC.relationshipScore)}</span>}
              {thread && (
                confirmDelete
                  ? <div className="flex gap-1 shrink-0"><Button size="sm" variant="secondary" onClick={() => { deleteThread(selectedNPC.id); setSelectedId(null); }}>Delete</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button></div>
                  : <button onClick={() => setConfirmDelete(true)} className="w-8 h-8 rounded-full border border-line text-ink3 hover:text-fall shrink-0" title="Delete chat" aria-label="Delete chat">🗑</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-3 rounded-[16px] border border-line bg-[#0C0D12] p-4">
              {!thread || thread.messages.length === 0 ? (
                <div className="text-center py-8 text-[13px] text-ink3">{`You have never spoken to ${selectedNPC.name}.`}</div>
              ) : (
                thread.messages.map((msg) => {
                  const moment = msg.momentId ? (moments ?? []).find((m) => m.id === msg.momentId) : undefined;
                  if (!msg.fromPlayer && msg.content.startsWith('· ')) return <div key={msg.id} className="text-center text-[11px] text-ink3 italic">{msg.content.slice(2)}</div>;
                  return (
                    <div key={msg.id} className={cn('flex', msg.fromPlayer ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] sm:max-w-sm rounded-[18px] px-4 py-2 text-[14px] whitespace-pre-wrap', msg.fromPlayer ? 'bg-amber text-black font-medium rounded-br-[6px]' : 'bg-white/[0.07] text-ink rounded-bl-[6px]')}>
                        {msg.attachedSongId && <div className="text-xs opacity-70 mb-1 border-b border-current pb-1">🎵 {msg.attachedTitle ? `"${msg.attachedTitle}"` : 'Attached song'}</div>}
                        {msg.content}
                        {moment && <div className="mt-2 -mx-1"><MomentCard moment={moment} compact /></div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {isBlocked ? (
              <div className="rounded-[14px] border border-line bg-card p-3 flex items-center justify-between gap-3 text-[13px] text-ink2">
                You blocked {selectedNPC.name}. They can't message you.
                <Button size="sm" variant="secondary" onClick={() => unblockAccount(selectedNPC.id)}>Unblock</Button>
              </div>
            ) : (
              <>
                {songs.length > 0 && (
                  <select className="mb-2 w-full h-9 rounded-[10px] bg-card border border-line px-3 text-[13px] text-ink2" value={attachedSongId ?? ''} onChange={(e) => setAttachedSongId(e.target.value || null)}>
                    <option value="">Attach a song (optional)</option>
                    {songs.map((s) => <option key={s.id} value={s.id}>🎵 "{s.title}" — {gradeLabel(s.quality)}{s.masterStatus !== undefined && s.masterStatus !== 'released' ? ' (unreleased)' : ''}</option>)}
                  </select>
                )}
                <div className="flex gap-2">
                  <input className="flex-1 h-11 rounded-full bg-card border border-line px-4 text-[14px] text-ink placeholder:text-ink3 outline-none focus:border-amber" placeholder={`Message ${selectedNPC.name}…`} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                  <Button onClick={send} disabled={!message.trim()}>Send</Button>
                </div>
              </>
            )}
            <div className="mt-2 flex gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => openArtist(selectedNPC.id)}>👤 Profile</Button>
              <Button variant="ghost" size="sm" onClick={() => setScreen('studio')}>🤝 Request a feature</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
