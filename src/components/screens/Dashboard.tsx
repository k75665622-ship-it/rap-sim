import { MomentsInbox } from '../moments/MomentCard';
import { useGameStore } from '../../store/gameStore';
import { Card, Badge, Button } from '../ui/Card';
import { WorkInProgress } from '../ui/WorkInProgress';
import type { GameDate } from '../../types/game';

function formatDate(d: GameDate) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.month - 1]} ${d.day}, ${d.year}`;
}

function formatMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.floor(n)}`;
}

export function Dashboard() {
  const {
    player, songs, gameDate, advanceTurn, lastEventLog,
    weeklyStatements, certifications, contracts, openThreads,
    dmThreads, mailbox, setScreen,
  } = useGameStore();

  if (!player) return null;

  const totalUnread = Object.values(dmThreads).reduce((sum, t) => sum + t.unread, 0);
  const unreadMail = mailbox.filter(m => !m.read).length;
  const activeSongs = songs.filter(s => s.weeklyStreams > 0);
  const totalWeeklyStreams = songs.reduce((s, song) => s + song.weeklyStreams, 0);
  const lastStatement = weeklyStatements[0];
  const activeThreads = openThreads.filter(t => !t.resolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {player.artistName}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {player.city}, {player.country} · Age {player.age} · {player.genre.replace('_', '-')}
          </p>
          <p className="text-gray-600 text-xs mt-1">{formatDate(gameDate)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => advanceTurn('day')}>+1 Day</Button>
          <Button variant="secondary" size="sm" onClick={() => advanceTurn('week')}>+1 Week</Button>
          <Button variant="gold" size="sm" onClick={() => advanceTurn('month')}>+1 Month</Button>
        </div>
      </div>

      <MomentsInbox />

      {/* Notifications */}
      {(totalUnread > 0 || unreadMail > 0) && (
        <div className="flex gap-3">
          {totalUnread > 0 && (
            <button
              onClick={() => setScreen('pingchat')}
              className="flex-1 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-left hover:bg-yellow-500/20 transition-colors"
            >
              <span className="text-yellow-400 font-bold text-sm">💬 {totalUnread} unread DMs</span>
            </button>
          )}
          {unreadMail > 0 && (
            <button
              onClick={() => setScreen('mailbox')}
              className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-left hover:bg-blue-500/20 transition-colors"
            >
              <span className="text-blue-400 font-bold text-sm">📬 {unreadMail} new mail</span>
            </button>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Money', value: formatMoney(player.career.money), sub: `Total: ${formatMoney(player.career.totalEarnings)}`, color: 'text-green-400' },
          { label: 'Fanbase', value: player.career.fanbase.toLocaleString(), sub: 'followers', color: 'text-blue-400' },
          { label: 'Local Fame', value: `${Math.round(player.career.localFame)}/100`, sub: `National: ${Math.round(player.career.nationalFame)}`, color: 'text-yellow-400' },
          { label: 'Momentum', value: `${Math.round(player.career.momentum)}/100`, sub: `Rep: ${Math.round(player.career.reputation)}`, color: 'text-purple-400' },
        ].map(stat => (
          <Card key={stat.label} glass>
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{stat.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Streams + Songs */}
        <div className="col-span-2 space-y-4">
          {/* Weekly Streams */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">📊 Streaming This Week</h3>
              <span className="text-yellow-400 font-mono text-sm">{totalWeeklyStreams.toLocaleString()} streams</span>
            </div>
            {activeSongs.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">No songs released yet. Hit the Studio!</p>
            ) : (
              <div className="space-y-2">
                {activeSongs.slice(0, 5).map(song => (
                  <div key={song.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-white font-medium">"{song.title}"</span>
                      {song.certifications.length > 0 && (
                        <span className="ml-2 text-xs text-yellow-500">🏆 {song.certifications[0].split(':')[1]}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-mono text-xs">{song.weeklyStreams.toLocaleString()}/wk</div>
                      <div className="text-gray-600 text-xs">{song.totalStreams.toLocaleString()} total</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-800 flex gap-3">
              <Button variant="gold" size="sm" onClick={() => setScreen('studio')}>
                🎤 Make a Song
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setScreen('charts')}>
                📈 View Charts
              </Button>
            </div>
          </Card>

          {/* Last Royalty Statement */}
          {lastStatement && (
            <Card>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white text-sm">💰 Last Royalty Statement</h3>
                <span className="text-xs text-gray-600">{lastStatement.weekStartDate}</span>
              </div>
              <div className="text-2xl font-black text-green-400 mb-1">
                +${lastStatement.totalPayout.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {lastStatement.totalStreams.toLocaleString()} streams @ $0.003/stream
              </div>
              <p className="text-xs text-gray-400 italic">"{lastStatement.flavorText}"</p>
            </Card>
          )}

          {/* Active Story Threads */}
          {activeThreads.length > 0 && (
            <Card>
              <h3 className="font-bold text-white text-sm mb-3">🕵️ Open Storylines</h3>
              <div className="space-y-2">
                {activeThreads.slice(0, 4).map(thread => (
                  <div key={thread.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">
                      {thread.type === 'beef' ? '🔥' : thread.type === 'romance' ? '💕' : thread.type === 'deal' ? '💼' : thread.type === 'legal' ? '⚖️' : '📌'}
                    </span>
                    <span className="text-gray-300 flex-1">{thread.description}</span>
                    <Badge color={thread.priority >= 7 ? 'red' : 'yellow'}>
                      P{thread.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* IN PROGRESS — a session is days in a room, not a click */}
          <WorkInProgress />

          {/* Certifications */}
          {certifications.length > 0 && (
            <Card>
              <h3 className="font-bold text-white text-sm mb-3">🏆 Certifications</h3>
              <div className="space-y-1">
                {certifications.slice(0, 5).map(cert => (
                  <div key={cert.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 truncate">{cert.songTitle}</span>
                    <span className={`font-bold ml-2 ${
                      cert.level === 'diamond' ? 'text-blue-400' :
                      cert.level === 'platinum' ? 'text-gray-300' :
                      cert.level === 'gold' ? 'text-yellow-400' : 'text-orange-400'
                    }`}>
                      {cert.level.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Active Contracts */}
          {contracts.length > 0 && (
            <Card>
              <h3 className="font-bold text-white text-sm mb-3">📋 Active Contracts</h3>
              <div className="space-y-2">
                {contracts.filter(c => c.active).map(c => (
                  <div key={c.id} className="text-xs">
                    <div className="text-white font-medium">{c.npcName}</div>
                    <div className="text-gray-500">{c.type} · {c.terms.percentage}% cut · exp. {c.expiresAt}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <h3 className="font-bold text-white text-sm mb-3">⚡ Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: '🎤', label: 'Go to Studio', screen: 'studio' as const },
                { icon: '💬', label: 'Check DMs', screen: 'pingchat' as const },
                { icon: '🐦', label: 'Post on Chirp', screen: 'social_chirp' as const },
                { icon: '🎭', label: 'Book a Show', screen: 'shows' as const },
                { icon: '👥', label: 'Browse Artists', screen: 'npc_profile' as const },
              ].map(action => (
                <button
                  key={action.screen}
                  onClick={() => setScreen(action.screen)}
                  className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-white py-1 transition-colors"
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* WHILE YOU WERE GONE */}
          {lastEventLog.length > 0 && (
            <Card>
              <h3 className="font-bold text-white text-sm mb-3">📰 While You Were Gone</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {lastEventLog.map((entry, idx) => (
                  <p key={idx} className="text-xs text-gray-400 leading-relaxed">{entry}</p>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
