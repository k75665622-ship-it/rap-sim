import { useState } from 'react';
import { useGameStore, COACHES, TRAINING_COST, TRAINING_DAYS, trainingGain } from '../../store/gameStore';
import { Card, Badge, Button } from '../ui/Card';
import type { ArtistStats } from '../../types/game';
import { trainingEnergy, energyShortfallMessage } from '../../sim/energy';

const GROUPS: Array<{ label: string; emoji: string; stats: Array<keyof ArtistStats> }> = [
  { label: 'Craft', emoji: '🎵', stats: ['lyricism', 'flow', 'delivery', 'vocalAbility', 'songwriting', 'freestyle'] },
  { label: 'Performance', emoji: '🎭', stats: ['stagePresence', 'performance', 'charisma'] },
  { label: 'Business', emoji: '💼', stats: ['marketing', 'networking', 'businessKnowledge', 'discipline', 'beatSelection', 'productionKnowledge'] },
  { label: 'X-Factor', emoji: '✨', stats: ['creativity', 'originality', 'consistency'] },
];

const CRAFT_STATS: Array<keyof ArtistStats> = ['lyricism', 'flow', 'delivery', 'vocalAbility', 'songwriting', 'freestyle', 'creativity', 'originality', 'beatSelection'];

function prettyStat(key: string): string {
  const map: Record<string, string> = {
    lyricism: 'Lyricism', flow: 'Flow', delivery: 'Delivery', vocalAbility: 'Vocal Ability',
    songwriting: 'Songwriting', freestyle: 'Freestyle', stagePresence: 'Stage Presence',
    performance: 'Performance', charisma: 'Charisma', marketing: 'Marketing',
    networking: 'Networking', businessKnowledge: 'Business Knowledge', discipline: 'Discipline',
    beatSelection: 'Beat Selection', productionKnowledge: 'Production Knowledge',
    creativity: 'Creativity', originality: 'Originality', consistency: 'Consistency',
  };
  return map[key] ?? key;
}

export function TrainingScreen() {
  const { player, trainStat } = useGameStore();
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [notice, setNotice] = useState<string | null>(null);

  if (!player) return null;

  const money = player.career.money;
  const cost = TRAINING_COST[intensity];
  const days = TRAINING_DAYS[intensity];
  const canAfford = money >= cost;
  const energyNeeded = trainingEnergy(intensity);
  const hasEnergy = player.energy >= energyNeeded;

  const craftAvg = CRAFT_STATS.reduce((s, k) => s + player.stats[k], 0) / CRAFT_STATS.length;

  function handleTrain(stat: keyof ArtistStats) {
    const current = player!.stats[stat];
    if (current >= 100) {
      setNotice(`${prettyStat(stat)} is already maxed out.`);
      return;
    }
    if (!canAfford) {
      setNotice(`Not enough money. ${intensity === 3 ? 'Elite' : intensity === 2 ? 'Standard' : 'Light'} training costs $${cost.toLocaleString()} — you have $${Math.floor(money).toLocaleString()}.`);
      return;
    }
    if (!hasEnergy) {
      setNotice(energyShortfallMessage(energyNeeded, player!.energy));
      return;
    }
    const gain = trainingGain(current, intensity);
    trainStat(stat, intensity);
    setNotice(
      gain > 0
        ? `Trained ${prettyStat(stat)}: +${gain} points over ${days} days ($${cost.toLocaleString()}, ⚡${energyNeeded}).`
        : `${prettyStat(stat)} is too developed to improve much — no points gained.`,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          🏋️ Training Camp
        </h1>
        <p className="text-gray-500 text-sm">
          Higher skills make better records. Craft skills feed directly into song quality.
        </p>
      </div>

      {/* What training does */}
      <Card glass>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Craft Score</div>
            <div className="text-3xl font-black text-yellow-400">{craftAvg.toFixed(1)}<span className="text-lg text-gray-600">/100</span></div>
            <div className="text-xs text-gray-500 mt-1">
              Drives the quality ceiling of everything you release.
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cash Available</div>
            <div className="text-3xl font-black text-white">${Math.floor(money).toLocaleString()}</div>
          </div>
        </div>
      </Card>

      {/* Intensity picker */}
      <Card>
        <h3 className="font-bold text-white text-sm mb-3">Session Intensity</h3>
        <div className="grid grid-cols-3 gap-3">
          {([1, 2, 3] as const).map(i => {
            const active = intensity === i;
            const label = i === 1 ? 'Light' : i === 2 ? 'Standard' : 'Elite';
            const emoji = i === 1 ? '🌱' : i === 2 ? '⚡' : '🔥';
            return (
              <button
                key={i}
                onClick={() => setIntensity(i)}
                className={`rounded-xl p-3 text-left transition-all border ${
                  active ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="text-lg">{emoji}</div>
                <div className={`font-bold text-sm ${active ? 'text-yellow-400' : 'text-white'}`}>{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {TRAINING_DAYS[i]} days · ${TRAINING_COST[i].toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Gains shrink as a skill approaches 100. Training costs real days on the calendar —
          your career keeps moving while you're in the lab.
        </p>
      </Card>

      {notice && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {notice}
        </div>
      )}

      {/* Stat groups */}
      <div className="grid grid-cols-2 gap-4">
        {GROUPS.map(group => (
          <Card key={group.label}>
            <h3 className="font-bold text-white text-sm mb-3">
              {group.emoji} {group.label}
              <span className="text-gray-600 font-normal ml-2 text-xs">
                {group.stats.some(s => CRAFT_STATS.includes(s)) ? 'feeds song quality' : ''}
              </span>
            </h3>
            <div className="space-y-2">
              {group.stats.map(stat => {
                const value = player.stats[stat];
                const gain = trainingGain(value, intensity);
                const maxed = value >= 100;
                const isCraft = CRAFT_STATS.includes(stat);
                const coach = COACHES[stat];
                return (
                  <div key={stat} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">
                            {coach ? coach.emoji : ''} {prettyStat(stat)}
                          </span>
                          {isCraft && <Badge color="yellow">Craft</Badge>}
                        </div>
                        {coach && <div className="text-xs text-gray-600 mt-0.5 truncate">{coach.blurb}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-white leading-none">{value}</div>
                        {!maxed && (
                          <div className={`text-xs ${gain > 0 ? 'text-green-400' : 'text-gray-600'}`}>
                            +{gain}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* bar */}
                    <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isCraft ? 'bg-yellow-500' : 'bg-blue-500'}`}
                        style={{ width: `${value}%` }}
                      />
                    </div>

                    <Button
                      variant={maxed ? 'secondary' : canAfford && hasEnergy ? 'gold' : 'secondary'}
                      size="sm"
                      className="mt-2 w-full"
                      disabled={maxed || !canAfford || !hasEnergy}
                      onClick={() => handleTrain(stat)}
                    >
                      {maxed
                        ? 'Maxed'
                        : !hasEnergy
                          ? `⚡ Needs ${energyNeeded} energy`
                          : `Train (+${gain}) · $${cost.toLocaleString()} · ⚡${energyNeeded}`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
