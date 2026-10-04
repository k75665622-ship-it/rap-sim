import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Button, Badge } from '../ui/Card';
import { cn } from '@/utils/cn';
import { gradeLabel } from '../../sim/studio';

function getRelLabel(score: number) {
  if (score >= 60) return { label: 'Close', color: 'green' };
  if (score >= 20) return { label: 'Cool', color: 'blue' };
  if (score >= -20) return { label: 'Neutral', color: 'gray' };
  if (score >= -60) return { label: 'Cold', color: 'orange' };
  return { label: 'Hostile', color: 'red' };
}

/** Relative time for the conversation list, so the order is legible. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function PingChatScreen() {
  const { npcs, dmThreads, songs, sendDM, markDMRead, setScreen, selectedNPCId: focusedNPCId } = useGameStore();
  // Arriving here from an artist's profile should open that conversation, not
  // an empty panel. The store's selection is the seed; after that the screen
  // owns it.
  const [selectedNPCId, setSelectedNPCId] = useState<string | null>(focusedNPCId);
  const [message, setMessage] = useState('');
  const [attachedSongId, setAttachedSongId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // ─── Conversations you actually have ──────────────────────────────────
  // PingChat used to list the entire roster, which is ~12,000 people and
  // useless. It now shows your inbox: only threads that exist, most recent
  // first. Everyone else is one search away.
  const conversations = useMemo(() => {
    const rows = Object.values(dmThreads)
      .map(thread => {
        const npc = npcs.find(n => n.id === thread.npcId);
        if (!npc || npc.role === 'fan_account') return null;
        const last = thread.messages[thread.messages.length - 1];
        return { thread, npc, last };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    rows.sort((a, b) => {
      // Unread first, then by most recent message.
      if ((b.thread.unread > 0 ? 1 : 0) !== (a.thread.unread > 0 ? 1 : 0)) {
        return (b.thread.unread > 0 ? 1 : 0) - (a.thread.unread > 0 ? 1 : 0);
      }
      const at = a.last ? new Date(a.last.timestamp).getTime() : 0;
      const bt = b.last ? new Date(b.last.timestamp).getTime() : 0;
      return bt - at;
    });

    return rows;
  }, [dmThreads, npcs]);

  const totalUnread = conversations.reduce((s, c) => s + c.thread.unread, 0);

  // ─── Search the whole roster to start something new ───────────────────
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return npcs
      .filter(n =>
        n.role !== 'fan_account' &&
        (n.name.toLowerCase().includes(q) ||
          (n.realName ?? '').toLowerCase().includes(q) ||
          (n.city ?? '').toLowerCase().includes(q) ||
          n.country.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.fame - a.fame)
      .slice(0, 25);
  }, [npcs, search]);

  const selectedNPC = npcs.find(n => n.id === selectedNPCId);
  const thread = selectedNPCId ? dmThreads[selectedNPCId] : null;
  const hasThread = !!(selectedNPCId && dmThreads[selectedNPCId]);

  function handleSelect(npcId: string) {
    setSelectedNPCId(npcId);
    markDMRead(npcId);
    setSearch('');
  }

  function handleSend() {
    if (!selectedNPCId || !message.trim()) return;
    sendDM(selectedNPCId, message.trim(), attachedSongId ?? undefined);
    setMessage('');
    setAttachedSongId(null);
  }

  const relInfo = selectedNPC ? getRelLabel(selectedNPC.relationshipScore) : null;

  return (
    <div className="h-[calc(100vh-100px)] flex gap-4">
      {/* ── Conversation list ─────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0">
        <Card className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white text-sm">💬 PingChat</h3>
            {totalUnread > 0 && <Badge color="yellow">{totalUnread} new</Badge>}
          </div>

          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 text-sm mb-3"
            placeholder="Find anyone to message…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {search.trim() ? (
              <>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                  {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
                </p>
                {searchResults.map(npc => (
                  <button
                    key={npc.id}
                    onClick={() => handleSelect(npc.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl transition-all',
                      selectedNPCId === npc.id ? 'bg-yellow-500/10 border border-yellow-500/30' : 'hover:bg-gray-800',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {npc.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-medium truncate">{npc.name}</div>
                        <div className="text-gray-600 text-[11px] truncate">
                          {npc.role.replace(/_/g, ' ')} · {npc.city ?? npc.country}
                        </div>
                      </div>
                      {dmThreads[npc.id] && (
                        <span className="text-[10px] text-gray-500 shrink-0">in inbox</span>
                      )}
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-6">Nobody by that name.</p>
                )}
              </>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-3">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-gray-500 text-xs">No conversations yet.</p>
                <p className="text-gray-600 text-[11px] mt-1">
                  Search a name above to reach out to anyone in the scene.
                </p>
              </div>
            ) : (
              conversations.map(({ npc, thread: t, last }) => {
                const rel = getRelLabel(npc.relationshipScore);
                return (
                  <button
                    key={npc.id}
                    onClick={() => handleSelect(npc.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl transition-all',
                      selectedNPCId === npc.id
                        ? 'bg-yellow-500/10 border border-yellow-500/30'
                        : 'hover:bg-gray-800 border border-transparent',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-black text-white shrink-0">
                        {npc.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className={cn('text-xs truncate', t.unread > 0 ? 'text-white font-bold' : 'text-gray-300 font-medium')}>
                            {npc.name}
                          </span>
                          <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                            {last ? timeAgo(last.timestamp) : ''}
                          </span>
                        </div>
                        <div className={cn('text-[11px] truncate', t.unread > 0 ? 'text-gray-300' : 'text-gray-600')}>
                          {last
                            ? `${last.fromPlayer ? 'You: ' : ''}${last.content}`
                            : 'No messages yet'}
                        </div>
                      </div>
                      {t.unread > 0 && <span className="w-2 h-2 bg-yellow-500 rounded-full shrink-0" />}
                    </div>
                    <div className="mt-1.5">
                      <Badge color={rel.color as never}>{rel.label}</Badge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {!selectedNPC ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-gray-500 text-sm">Pick a conversation, or search for someone new</p>
              <p className="text-gray-600 text-xs mt-1">
                Your relationship score decides how they answer you.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center text-black font-black text-sm">
                {selectedNPC.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{selectedNPC.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {selectedNPC.role.replace(/_/g, ' ')} · {selectedNPC.city ?? selectedNPC.country}
                  {selectedNPC.team?.label ? ` · ${selectedNPC.team.label}` : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge color={relInfo?.color as never}>{relInfo?.label}</Badge>
                <div className="text-xs text-gray-600 mt-1">Score: {selectedNPC.relationshipScore}</div>
              </div>
            </div>

            {/* Bio */}
            {selectedNPC.bio && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2 mb-3 text-xs text-gray-500 italic">
                {selectedNPC.bio}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-3 bg-gray-900 border border-gray-800 rounded-2xl p-4">
              {!thread || thread.messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 text-sm">
                    {hasThread ? 'No messages yet. Say something.' : `You have never spoken to ${selectedNPC.name}.`}
                  </p>
                  <p className="text-gray-700 text-xs mt-1">
                    Relationship: {selectedNPC.relationshipScore >= 0 ? '+' : ''}{selectedNPC.relationshipScore}
                  </p>
                </div>
              ) : (
                thread.messages.map(msg => (
                  <div
                    key={msg.id}
                    className={cn('flex', msg.fromPlayer ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-xs rounded-2xl px-4 py-2 text-sm',
                        msg.fromPlayer ? 'bg-yellow-500 text-black font-medium' : 'bg-gray-800 text-white',
                      )}
                    >
                      {msg.attachedSongId && (
                        <div className="text-xs opacity-70 mb-1 border-b border-current pb-1">
                          🎵 Attached song
                        </div>
                      )}
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Song attach */}
            {songs.length > 0 && (
              <div className="mb-2">
                <select
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-yellow-500"
                  value={attachedSongId ?? ''}
                  onChange={e => setAttachedSongId(e.target.value || null)}
                >
                  <option value="">Attach a song (optional)</option>
                  {songs.map(s => (
                    <option key={s.id} value={s.id}>
                      🎵 "{s.title}" — {gradeLabel(s.quality)}
                      {s.masterStatus !== undefined && s.masterStatus !== 'released' ? ' (unreleased)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message input */}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 text-sm"
                placeholder={`Message ${selectedNPC.name}...`}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <Button variant="gold" onClick={handleSend} disabled={!message.trim()}>
                Send
              </Button>
            </div>

            {/* Cross-links */}
            <div className="mt-3 flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => setScreen('npc_profile')}>
                👤 Full profile
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setScreen('studio')}>
                🤝 Request a feature
              </Button>
            </div>

            {/* Memory log */}
            {selectedNPC.memoryLog.length > 0 && (
              <div className="mt-3 bg-gray-900/50 border border-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-600 font-bold mb-1 uppercase tracking-wider">History</p>
                {selectedNPC.memoryLog.slice(-3).map((entry, i) => (
                  <p key={i} className="text-xs text-gray-600 leading-relaxed">{entry}</p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
