import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Card, Badge } from '../ui/Card';

function CertBadge({ level }: { level: string }) {
  const styles: Record<string, { color: string; emoji: string }> = {
    silver: { color: 'text-gray-300', emoji: '🥈' },
    gold: { color: 'text-yellow-400', emoji: '🥇' },
    platinum: { color: 'text-blue-300', emoji: '💿' },
    diamond: { color: 'text-cyan-400', emoji: '💎' },
    legendary: { color: 'text-purple-400', emoji: '👑' },
  };
  const s = styles[level] ?? { color: 'text-white', emoji: '🏅' };
  return (
    <span className={`${s.color} font-black text-sm`}>{s.emoji} {level.toUpperCase()}</span>
  );
}

export function TrophyRoomScreen() {
  const { player, certifications, awards, npcs } = useGameStore();
  const [tab, setTab] = useState<'certs' | 'awards' | 'creator'>('certs');

  if (!player) return null;

  const totalCerts = certifications.length;
  const totalAwards = awards.filter(a => a.winner === player.id).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          🏆 Trophy Room
        </h1>
        <p className="text-gray-500 text-sm">Your legacy in numbers</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Certifications', value: totalCerts, icon: '💿', color: 'text-yellow-400' },
          { label: 'Awards Won', value: totalAwards, icon: '🏆', color: 'text-yellow-400' },
          { label: 'Total Streams', value: `${(player.career.totalStreams / 1_000_000).toFixed(1)}M`, icon: '🎵', color: 'text-green-400' },
          { label: 'Total Earned', value: `$${(player.career.totalEarnings / 1000).toFixed(1)}K`, icon: '💰', color: 'text-blue-400' },
        ].map(item => (
          <Card key={item.label} glass glow>
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          ['certs', '💿 Certifications'],
          ['awards', '🏆 Awards'],
          ['creator', '🎬 Creator Milestones'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === id ? 'bg-yellow-500 text-black font-bold' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Certifications */}
      {tab === 'certs' && (
        <div className="space-y-3">
          {certifications.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-5xl mb-3">💿</div>
                <h3 className="text-white font-bold text-lg">No Certifications Yet</h3>
                <p className="text-gray-500 text-sm mt-2">
                  Release music and rack up streams. Certifications unlock at stream milestones.
                </p>
                <div className="mt-4 text-xs text-gray-600">
                  <p>Silver: 100K units · Gold: 500K · Platinum: 1M · Diamond: 10M</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {certifications.map(cert => (
                <Card key={cert.id} glass>
                  <div className="flex items-start justify-between">
                    <div>
                      <CertBadge level={cert.level} />
                      {cert.multiplier > 1 && (
                        <span className="text-gray-400 text-sm ml-1">× {cert.multiplier}</span>
                      )}
                      <div className="font-bold text-white mt-1">"{cert.songTitle}"</div>
                      <div className="text-xs text-gray-500">{cert.country} · {cert.awardedDate}</div>
                      <div className="text-xs text-gray-600 mt-1">{cert.units.toLocaleString()} certified units</div>
                    </div>
                    <div className="text-4xl">
                      {cert.level === 'diamond' ? '💎' :
                       cert.level === 'platinum' ? '🔷' :
                       cert.level === 'gold' ? '🥇' :
                       cert.level === 'legendary' ? '👑' : '🥈'}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Awards */}
      {tab === 'awards' && (
        <div className="space-y-4">
          {awards.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🏆</div>
                <h3 className="text-white font-bold text-lg">No Award Ceremonies Yet</h3>
                <p className="text-gray-500 text-sm mt-2">
                  Award season runs every December. Winners are decided by that year's
                  <br />actual chart performance, streams and critical reception.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto text-xs">
                  {[
                    { name: 'Ghana Music Awards', desc: 'Country · December', color: 'green' },
                    { name: 'African Music Awards', desc: 'Regional · December', color: 'blue' },
                    { name: 'Gold Note Awards', desc: 'Global · December', color: 'yellow' },
                  ].map(award => (
                    <div key={award.name} className="bg-gray-800 rounded-xl p-3">
                      <Badge color={award.color as 'green' | 'blue' | 'yellow'}>{award.desc}</Badge>
                      <p className="text-white font-bold mt-2">{award.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* Player wins */}
              {awards.filter(a => a.winner === player.id).length > 0 && (
                <Card glass glow>
                  <h3 className="font-bold text-yellow-400 text-sm mb-3">🏆 Your Awards</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {awards.filter(a => a.winner === player.id).map(a => (
                      <div key={a.id} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <div className="text-3xl mb-1">🏆</div>
                        <div className="font-bold text-white text-sm">{a.category}</div>
                        <div className="text-xs text-gray-400 mt-1">{a.name.split(' — ')[0]}</div>
                        <div className="text-xs text-yellow-500 mt-1 font-bold">{a.year}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Full ceremony history — including awards the player did not win */}
              <Card>
                <h3 className="font-bold text-white text-sm mb-3">Every Ceremony</h3>
                <div className="space-y-2">
                  {[...awards].reverse().map(a => {
                    const isPlayer = a.winner === player.id;
                    const winnerName = isPlayer
                      ? player.artistName
                      : (npcs.find(n => n.id === a.winner)?.name ?? 'Unknown Artist');
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          isPlayer ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-800/50'
                        }`}
                      >
                        <span className="text-xl">{isPlayer ? '🏆' : '🎖️'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium">{a.category}</div>
                          <div className="text-xs text-gray-500">{a.name.split(' — ')[0]} · {a.year}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${isPlayer ? 'text-yellow-400' : 'text-gray-300'}`}>
                            {winnerName}
                          </div>
                          {isPlayer && <Badge color="yellow">You</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Creator */}
      {tab === 'creator' && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-bold text-white text-sm mb-4">🎬 VidStream Creator Awards</h3>
            {[
              { label: '100K Subscribers', icon: '🥉', req: 100_000, color: 'orange', title: 'Bronze Creator' },
              { label: '1M Subscribers', icon: '🥈', req: 1_000_000, color: 'gray', title: 'Silver Creator' },
              { label: '10M Subscribers', icon: '🥇', req: 10_000_000, color: 'yellow', title: 'Gold Creator' },
              { label: '100M Subscribers', icon: '💎', req: 100_000_000, color: 'blue', title: 'Diamond Creator' },
            ].map(milestone => {
              const totalViews = useGameStore.getState().songs.reduce((s, song) => s + (song.videoViews ?? 0), 0);
              const unlocked = totalViews >= milestone.req;
              return (
                <div
                  key={milestone.label}
                  className={`flex items-center gap-4 p-4 rounded-xl mb-2 ${
                    unlocked ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-gray-800 opacity-50'
                  }`}
                >
                  <div className="text-3xl">{milestone.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-white">{milestone.title}</div>
                    <div className="text-xs text-gray-500">{milestone.label}</div>
                  </div>
                  {unlocked ? (
                    <Badge color="yellow">✅ Unlocked</Badge>
                  ) : (
                    <Badge color="gray">🔒 Locked</Badge>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-gray-600 mt-2">
              Total video views: {useGameStore.getState().songs.reduce((s, song) => s + (song.videoViews ?? 0), 0).toLocaleString()}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
