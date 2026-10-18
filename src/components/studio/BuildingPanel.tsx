// ─── STUDIO: THE BUILDING ──────────────────────────────────────────────────
// The room you own, from a bedroom corner to a flagship complex. Each step up
// costs a lot once and a little every month, takes better gear, and makes the
// team faster. Rent it out and other artists pay some of the bills.

import { cn } from '@/utils/cn';
import { Button } from '../ui/kit';
import { useGameStore, blendedFame } from '../../store/gameStore';
import { HOME_STUDIO_TIERS, buildingLevel, gearBonus, rentOutIncome } from '../../sim/room';

export function BuildingPanel({ onFlash }: { onFlash: (r: { ok: boolean; message: string }) => void }) {
  const studio = useGameStore((s) => s.studio);
  const player = useGameStore((s) => s.player);
  const upgrade = useGameStore((s) => s.upgradeStudioBuilding);
  const setRentOut = useGameStore((s) => s.setStudioRentOut);
  const level = buildingLevel(studio?.levels);
  const tier = HOME_STUDIO_TIERS[level];
  const next = HOME_STUDIO_TIERS[level + 1];
  const money = player?.career.money ?? 0;
  const fame = player ? blendedFame(player) : 0;
  const estRent = rentOutIncome(tier, fame, 0.5);

  return (
    <div className="space-y-4">
      <div className="rounded-[16px] border border-line bg-card overflow-hidden">
        <div className="p-5 flex items-center gap-4" style={{ background: 'linear-gradient(120deg, rgba(245,179,1,0.12), transparent 60%)' }}>
          <div className="w-16 h-16 rounded-[14px] bg-black/30 flex items-center justify-center text-[34px]">{tier.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-ink3">Your studio</div>
            <div className="text-[22px] font-bold text-ink leading-tight">{tier.name}</div>
            <div className="text-[12px] text-ink2 mt-0.5">{tier.blurb}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] uppercase tracking-wider text-ink3">Room + gear</div>
            <div className="text-[24px] font-bold text-amber num">+{gearBonus(studio?.levels)}</div>
            <div className="text-[11px] text-ink3">production</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-line">
          {[
            ['Upkeep', tier.upkeep ? `$${tier.upkeep.toLocaleString()}/mo` : 'Free'],
            ['Best gear', tier.gearCap === 1 ? 'Entry' : tier.gearCap === 2 ? 'Mid-range' : 'Top-end'],
            ['Beat speed', tier.beatSpeed === 1 ? 'Normal' : `${tier.beatSpeed}×`],
            ['Rent-out', tier.rentOut ? `~$${estRent.toLocaleString()}/mo` : '—'],
          ].map(([l, v]) => (
            <div key={l} className="px-4 py-3 border-r border-line last:border-0">
              <div className="text-[10px] uppercase tracking-wider text-ink3">{l}</div>
              <div className="text-[14px] font-semibold text-ink mt-0.5">{v}</div>
            </div>
          ))}
        </div>
        {tier.rentOut > 0 && (
          <div className="px-5 py-3 border-t border-line flex items-center justify-between gap-3">
            <div className="text-[12px] text-ink2">Rent the room to other artists when you're not using it. Covers part of the upkeep{level >= 3 ? ', and the people who book it get to know you' : ''}.</div>
            <button onClick={() => setRentOut(!studio?.rentOut)} className={cn('relative w-11 h-6 rounded-full transition shrink-0', studio?.rentOut ? 'bg-rise' : 'bg-white/15')} aria-label="Rent out">
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', studio?.rentOut ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {HOME_STUDIO_TIERS.slice(1).map((t) => {
          const owned = t.level <= level;
          const isNext = t.level === level + 1;
          return (
            <div key={t.level} className={cn('rounded-[14px] border p-4 flex flex-col', owned ? 'border-rise/40 bg-rise/[0.04]' : isNext ? 'border-amber/50 bg-card' : 'border-line bg-card opacity-70')}>
              <div className="flex items-center gap-2">
                <span className="text-[22px]">{t.emoji}</span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{t.name}</div>
                  <div className="text-[11px] text-ink3">{owned ? 'Built' : `$${t.build.toLocaleString()} · $${t.upkeep.toLocaleString()}/mo`}</div>
                </div>
              </div>
              <div className="text-[12px] text-ink2 mt-2 leading-snug">{t.blurb}</div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-ink3 flex-1">
                {t.perks.map((p) => <li key={p}>• {p}</li>)}
              </ul>
              {isNext && (
                <Button className="mt-3" disabled={money < t.build} onClick={() => onFlash(upgrade())}>
                  {money < t.build ? `Need $${(t.build - money).toLocaleString()} more` : `Build for $${t.build.toLocaleString()}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {next && <div className="text-[12px] text-ink3">Gear goes inside the building — a {tier.name.toLowerCase()} takes {tier.gearCap === 1 ? 'entry-level' : tier.gearCap === 2 ? 'mid-range' : 'any'} gear. Buy gear below.</div>}
    </div>
  );
}
