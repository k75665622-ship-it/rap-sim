import { useGameStore } from '../../store/gameStore';
import { Card, StatBar, Badge } from '../ui/Card';
import { gradeLabel } from '../../sim/studio';

const STAT_GROUPS = [
  {
    id: 'craft',
    label: '🎵 Craft',
    desc: 'How good the music is',
    color: 'yellow',
    stats: ['lyricism', 'flow', 'delivery', 'vocalAbility', 'songwriting', 'freestyle'],
  },
  {
    id: 'performance',
    label: '🎭 Performance',
    desc: 'How good the show is',
    color: 'purple',
    stats: ['stagePresence', 'performance', 'charisma'],
  },
  {
    id: 'business',
    label: '💼 Business',
    desc: 'How good the career moves are',
    color: 'blue',
    stats: ['marketing', 'networking', 'businessKnowledge', 'discipline', 'beatSelection', 'productionKnowledge'],
  },
  {
    id: 'xfactor',
    label: '✨ X-Factor',
    desc: 'The hard-to-define stuff',
    color: 'green',
    stats: ['creativity', 'originality', 'consistency'],
  },
];

function statLabel(key: string): string {
  const labels: Record<string, string> = {
    lyricism: 'Lyricism',
    flow: 'Flow',
    delivery: 'Delivery',
    vocalAbility: 'Vocal Ability',
    songwriting: 'Songwriting',
    freestyle: 'Freestyle',
    stagePresence: 'Stage Presence',
    performance: 'Performance',
    charisma: 'Charisma',
    marketing: 'Marketing',
    networking: 'Networking',
    businessKnowledge: 'Business Knowledge',
    discipline: 'Discipline',
    beatSelection: 'Beat Selection',
    productionKnowledge: 'Production Knowledge',
    creativity: 'Creativity',
    originality: 'Originality',
    consistency: 'Consistency',
  };
  return labels[key] ?? key;
}

function getTier(val: number): { label: string; color: string } {
  if (val >= 85) return { label: 'Elite', color: 'yellow' };
  if (val >= 70) return { label: 'Pro', color: 'green' };
  if (val >= 50) return { label: 'Solid', color: 'blue' };
  if (val >= 30) return { label: 'Developing', color: 'gray' };
  return { label: 'Weak', color: 'red' };
}

export function StatsScreen() {
  const { player, shows, songs, certifications } = useGameStore();

  if (!player) return null;

  const totalShows = shows.filter(s => s.completed).length;
  const avgPerformance = shows.length > 0
    ? Math.round(shows.reduce((s, sh) => s + sh.performanceQuality, 0) / shows.length)
    : 0;
  // Only released records count toward career stats — a master still sitting in
  // the studio has not done anything yet.
  const releasedSongs = songs.filter(s => s.masterStatus === undefined || s.masterStatus === 'released');
  const bestSong = releasedSongs.reduce(
    (best, s) => s.quality > (best?.quality ?? 0) ? s : best,
    null as typeof songs[0] | null,
  );

  // Overall rating
  const allStats = Object.values(player.stats);
  const overallRating = Math.round(allStats.reduce((s, v) => s + v, 0) / allStats.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          📊 Artist Stats
        </h1>
        <p className="text-gray-500 text-sm">Your skills and career metrics</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Overall Rating', value: overallRating, max: 100, icon: '⭐' },
          { label: 'Total Streams', value: `${(player.career.totalStreams / 1000).toFixed(1)}K`, icon: '🎵' },
          { label: 'Shows Performed', value: totalShows, icon: '🎭' },
          { label: 'Certifications', value: certifications.length, icon: '🏆' },
        ].map(item => (
          <Card key={item.label} glass>
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="text-2xl font-black text-white">{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Stat Groups */}
        {STAT_GROUPS.map(group => (
          <Card key={group.id}>
            <div className="mb-4">
              <h3 className="font-bold text-white text-sm">{group.label}</h3>
              <p className="text-gray-600 text-xs">{group.desc}</p>
            </div>
            <div className="space-y-2.5">
              {group.stats.map(statKey => {
                const val = player.stats[statKey as keyof typeof player.stats];
                const tier = getTier(val);
                return (
                  <div key={statKey}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-400 text-xs">{statLabel(statKey)}</span>
                      <Badge color={tier.color as any}>{tier.label}</Badge>
                    </div>
                    <StatBar label="" value={val} color={group.color} />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
              Avg: {Math.round(
                group.stats.reduce((s, k) => s + (player.stats[k as keyof typeof player.stats] ?? 0), 0) / group.stats.length
              )}/100
            </div>
          </Card>
        ))}
      </div>

      {/* Career Highlights */}
      <Card>
        <h3 className="font-bold text-white text-sm mb-4">🎖️ Career Highlights</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-yellow-400">{player.career.fanbase.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Fans</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-green-400">${Math.floor(player.career.totalEarnings).toLocaleString()}</div>
            <div className="text-xs text-gray-500">Total Earned</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-purple-400">{avgPerformance}</div>
            <div className="text-xs text-gray-500">Avg Show Quality</div>
          </div>
        </div>

        {bestSong && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <span className="text-xs text-yellow-500 font-bold uppercase tracking-wider">Best Song</span>
            <div className="text-white font-bold mt-1">"{bestSong.title}"</div>
            <div className="text-xs text-gray-400">
              {gradeLabel(bestSong.quality)} · {bestSong.totalStreams.toLocaleString()} total streams
            </div>
          </div>
        )}
      </Card>

      {/* Fame breakdown */}
      <Card>
        <h3 className="font-bold text-white text-sm mb-4">🌍 Fame Breakdown</h3>
        <div className="space-y-3">
          <StatBar label="Local Fame" value={player.career.localFame} color="yellow" />
          <StatBar label="National Fame" value={player.career.nationalFame} color="orange" />
          <StatBar label="International Fame" value={player.career.internationalFame} color="red" />
          <StatBar label="Reputation" value={player.career.reputation} color="purple" />
          <StatBar label="Momentum" value={player.career.momentum} color="blue" />
        </div>
      </Card>
    </div>
  );
}
