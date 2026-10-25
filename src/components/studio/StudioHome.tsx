// ─── STUDIO: HOME ──────────────────────────────────────────────────────────
// One look at everything that matters in the studio: start a song, the beats
// that are waiting, the masters that need finishing, who on your team does
// what in here, and the room itself.

import { useMemo } from 'react';
import { Button } from '../ui/kit';
import { useGameStore } from '../../store/gameStore';
import { buildingTier, gearBonus } from '../../sim/room';
import { ROLE_SPECS } from '../../sim/roles';
import type { OwnedBeat } from '../../sim/beats';
import { BeatTile } from './BeatsPanel';

type Go = 'single' | 'beats' | 'room' | 'vault' | 'album' | 'remix' | 'order' | 'guest';

const STUDIO_ROLES = ['producer', 'engineer', 'songwriter', 'vocal_coach'] as const;
const ROLE_DOES: Record<string, string> = {
  producer: 'Sends you a new beat every few days and builds custom beats to order — free. Using somebody else\'s beat upsets them.',
  engineer: 'Makes sessions shorter and cheaper, and sends you a clean beat about once a week.',
  songwriter: 'Sharpens your writing every week; the longer together, the closer to finished the songs come out.',
  vocal_coach: 'Improves your delivery and vocals every week — it shows in the booth.',
};

export function StudioHome({ go, onRecord }: { go: (to: Go) => void; onUseBeat?: (b: OwnedBeat) => void; onRecord: (beatId?: string) => void }) {
  const songs = useGameStore((s) => s.songs);
  const crew = useGameStore((s) => s.crew);
  const beats = useGameStore((s) => s.beats);
  const studio = useGameStore((s) => s.studio);
  const workItems = useGameStore((s) => s.workItems);
  const setScreen = useGameStore((s) => s.setScreen);
  const inbound = useGameStore((s) => s.inboundRequests);
  const outbound = useGameStore((s) => s.featureRequests);

  const fresh = useMemo(() => (beats?.library ?? []).filter((b) => !b.usedOnSongId).sort((a, b) => b.quality - a.quality).slice(0, 3), [beats]);
  const unmixed = songs.filter((s) => s.masterStatus === 'recorded' && !s.archivedAt).length;
  const unreleased = songs.filter((s) => s.masterStatus === 'mastered' && !s.archivedAt).length;
  const recording = (workItems ?? []).filter((w) => w.kind === 'record');
  const tier = buildingTier(studio?.levels);
  const team = (crew ?? []).filter((c) => (STUDIO_ROLES as readonly string[]).includes(c.role));
  const owed = inbound.filter((r) => r.status === 'agreed').length;
  const coming = outbound.filter((r) => r.status === 'paid_waiting' || r.status === 'verse_ready').length;

  return (
    <div className="space-y-5">
      {/* Start */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
        <div className="flex flex-col gap-3">
          <button onClick={() => onRecord()} className="flex-1 text-left rounded-[18px] p-6 border border-fall/50 hover:border-fall transition group relative overflow-hidden" style={{ background: 'radial-gradient(90% 120% at 0% 0%, rgba(255,72,72,0.28), rgba(255,72,72,0.03) 70%)' }}>
            <div className="flex items-center gap-4">
              <span className="w-16 h-16 rounded-full bg-fall text-white flex flex-col items-center justify-center shadow-[0_0_0_6px_rgba(255,72,72,0.2)] group-hover:scale-105 transition"><span className="text-[20px] leading-none">●</span><span className="text-[10px] font-bold mt-0.5">REC</span></span>
              <div>
                <div className="text-[22px] font-bold text-ink">Record a song</div>
                <div className="text-[13px] text-ink2 mt-0.5 max-w-md">Pick a beat, put your headphones on and rap into your mic. Keep your best take — that's the song. No writing needed.</div>
              </div>
            </div>
          </button>
          <button onClick={() => go('single')} className="text-left rounded-[14px] px-5 py-3 border border-line bg-card hover:bg-cardhover transition flex items-center gap-3">
            <span className="text-[20px]">✍️</span>
            <span className="flex-1"><span className="block text-[14px] font-semibold text-ink">Write it & book a session</span><span className="block text-[11px] text-ink3">Write bars or hire a pen, set the performance, see the score before you pay.</span></span>
            <span className="text-[12px] text-amber font-semibold">Open →</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: 'vault' as Go, emoji: '🎚️', label: 'Masters', value: unmixed + unreleased, sub: unmixed ? `${unmixed} to mix` : unreleased ? `${unreleased} ready to drop` : 'All caught up' },
            { k: 'beats' as Go, emoji: '🎹', label: 'Beats', value: (beats?.library ?? []).filter((b) => !b.usedOnSongId).length, sub: (beats?.orders ?? []).length ? `${beats!.orders.length} on order` : 'in your library' },
            { k: 'album' as Go, emoji: '💿', label: 'Projects', value: null, sub: 'EP, album, mixtape' },
            { k: 'room' as Go, emoji: tier.emoji, label: 'My studio', value: `+${gearBonus(studio?.levels)}`, sub: tier.name },
            { k: 'guest' as Go, emoji: '🤝', label: 'Features', value: owed + coming, sub: owed ? `${owed} verse${owed > 1 ? 's' : ''} to write` : coming ? `${coming} coming to you` : 'Verse deals' },
          ].map((t) => (
            <button key={t.label} onClick={() => go(t.k)} className="text-left rounded-[14px] border border-line bg-card p-4 hover:bg-cardhover transition">
              <div className="flex items-center justify-between"><span className="text-[20px]">{t.emoji}</span>{t.value !== null && <span className="text-[18px] font-bold text-ink num">{t.value}</span>}</div>
              <div className="text-[13px] font-semibold text-ink mt-2">{t.label}</div>
              <div className="text-[11px] text-ink3">{t.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {recording.length > 0 && (
        <div className="rounded-[14px] border border-line bg-card p-4">
          <div className="text-[11px] font-semibold text-ink3 uppercase tracking-wider mb-2">In the booth now</div>
          {recording.map((w) => (
            <div key={w.id} className="flex items-center gap-3 py-1.5">
              <span className="text-[13px] text-ink flex-1 truncate">{w.label}</span>
              <div className="w-40 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-amber" style={{ width: `${Math.round((w.daysDone / Math.max(1, w.daysTotal)) * 100)}%` }} /></div>
              <span className="text-[11px] text-ink3 w-16 text-right">{w.daysTotal - w.daysDone}d left</span>
            </div>
          ))}
        </div>
      )}

      {/* Beats waiting */}
      <section>
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-[16px] font-semibold text-ink">Best beats in your library</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => go('order')}>Order a beat</Button>
            <Button size="sm" variant="secondary" onClick={() => go('beats')}>All beats</Button>
          </div>
        </div>
        {fresh.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line p-6 text-[13px] text-ink3">
            No beats waiting. {team.some((c) => c.role === 'producer' || c.role === 'engineer') ? 'Your team will send some soon.' : 'Hire a producer or engineer and they\'ll send beats every week — or check the beat store.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{fresh.map((b) => <BeatTile key={b.id} beat={b} onUse={() => onRecord(b.id)} />)}</div>
        )}
      </section>

      {/* Team */}
      <section>
        <div className="flex items-end justify-between mb-2">
          <h2 className="text-[16px] font-semibold text-ink">Your team in the studio</h2>
          <Button size="sm" variant="ghost" onClick={() => setScreen('team')}>Manage team</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {STUDIO_ROLES.map((role) => {
            const m = team.find((c) => c.role === role);
            const spec = ROLE_SPECS[role];
            return (
              <div key={role} className={m ? 'rounded-[14px] border border-line bg-card p-4' : 'rounded-[14px] border border-dashed border-line p-4'}>
                <div className="flex items-center gap-2"><span className="text-[18px]">{spec?.emoji}</span><span className="text-[13px] font-semibold text-ink">{spec?.title ?? role}</span></div>
                <div className="text-[12px] mt-1.5">{m ? <span className="text-ink">{m.npcName} <span className="text-ink3">· skill {m.skill}</span></span> : <span className="text-ink3">Empty seat</span>}</div>
                <div className="text-[11px] text-ink3 leading-snug mt-1.5">{ROLE_DOES[role]}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
