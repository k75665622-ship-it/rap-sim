// ─── AWARD NIGHT ───────────────────────────────────────────────────────────
// You're in the room: the red carpet, the show (and your set, if they asked
// you to perform), the envelopes one by one, and the speech if your name is
// read out.

import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { Avatar } from '../social/shared';
import { awardBodies } from '../../sim/awardSeasons';
import { cn } from '@/utils/cn';

export function CeremonyModal() {
  const a = useGameStore((s) => s.activeCeremony);
  const seasons = useGameStore((s) => s.awardSeasons);
  const country = useGameStore((s) => s.player?.country ?? 'Ghana');
  const act = useGameStore((s) => s.ceremonyAct);
  if (!a) return null;
  const s = seasons?.[a.key];
  if (!s) return null;
  const body = awardBodies(country).find((b) => b.id === s.bodyId);
  const shown = s.categories.slice(0, a.revealed);
  const current = s.categories[a.revealed];
  const myWins = s.categories.filter((c) => c.nominees.find((n) => n.id === c.winnerId)?.isPlayer);
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80 rl-fade" />
      <div className="relative w-full sm:max-w-[500px] max-h-[94vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] border border-amber/30 rl-rise" style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,184,0,0.3), rgba(10,11,16,0) 60%), linear-gradient(180deg, #1c1608, #0c0d12)' }}>
        <div className="p-5 text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-amber/80">{body?.venue}, {body?.city} · 7:00 PM</div>
          <div className="text-[44px] leading-none mt-3">{body?.emoji ?? '🏆'}</div>
          <div className="text-[22px] font-black text-ink mt-2">{body?.name} {s.year}</div>
        </div>
        <div className="px-5 pb-5 space-y-2.5">
          {a.notes.length > 0 && <div className="space-y-1.5">{a.notes.map((n, i) => <div key={i} className="rounded-[12px] bg-black/30 border border-white/10 px-3.5 py-2 text-[12px] text-ink2">{n}</div>)}</div>}

          {a.step === 'carpet' && (
            <>
              <div className="text-[14px] text-ink text-center">The red carpet. Cameras everywhere.</div>
              <Choice title="Work the carpet" sub="Your fit is about to be judged. Drip matters." onClick={() => act('carpet')} />
              <Choice title="Slip inside" sub="No photos, no risk." onClick={() => act('slip_in')} />
            </>
          )}
          {a.step === 'show' && (
            <>
              <div className="text-[14px] text-ink text-center">You're on after the second category.</div>
              <Choice title="Perform" sub="Stage presence and performance decide how it lands." onClick={() => act('perform')} />
              <Choice title="Pull out, just watch" sub="They won't ask twice." onClick={() => act('watch')} />
            </>
          )}
          {(a.step === 'results' || a.step === 'speech' || a.step === 'done') && (
            <div className="space-y-2">
              {shown.map((c) => {
                const w = c.nominees.find((n) => n.id === c.winnerId)!;
                const mine = c.nominees.some((n) => n.isPlayer);
                return (
                  <div key={c.id} className={cn('rounded-[14px] border px-3.5 py-2.5', w.isPlayer ? 'border-amber bg-amber/15' : mine ? 'border-white/20 bg-black/30' : 'border-white/10 bg-black/20')}>
                    <div className="text-[11px] uppercase tracking-wider text-ink3">{c.name}</div>
                    <div className="flex items-center gap-2 mt-1"><Avatar name={w.name} seed={w.isPlayer ? 'player' : w.id} size={26} /><span className="text-[14px] font-bold text-ink">{w.isPlayer ? 'YOU' : w.name}</span>{w.work && <span className="text-[12px] text-ink3 truncate">"{w.work}"</span>}</div>
                    {mine && !w.isPlayer && <div className="text-[11px] text-ink3 mt-0.5">Not this time.</div>}
                  </div>
                );
              })}
              {a.step === 'results' && current && (
                <button onClick={() => act('reveal')} className="w-full rounded-[14px] border border-amber/50 bg-black/40 hover:bg-black/60 px-4 py-4 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-amber">And the {current.name} goes to…</div>
                  <div className="flex justify-center -space-x-2 mt-2">{current.nominees.map((n) => <Avatar key={n.id} name={n.name} seed={n.isPlayer ? 'player' : n.id} size={30} />)}</div>
                  <div className="text-[12px] text-ink2 mt-2">{current.nominees.some((n) => n.isPlayer) ? 'You\'re in this one. ' : ''}Tap to open the envelope</div>
                </button>
              )}
            </div>
          )}
          {a.step === 'speech' && (
            <>
              <div className="text-[15px] text-ink text-center font-semibold mt-2">You won {myWins.length > 1 ? `${myWins.length} awards` : myWins[0]?.name}. The mic is yours.</div>
              <Choice title="Thank God, the team and the fans" sub="The room stands up." onClick={() => act('speech_grateful')} />
              <Choice title={'"To everyone who doubted me…"'} sub="The clip will go everywhere. Not everyone will love it." onClick={() => act('speech_hype')} />
              <Choice title="Keep it short" sub="Thank you, goodnight." onClick={() => act('speech_short')} />
            </>
          )}
          {a.step === 'done' && <Button className="w-full" onClick={() => act('close')}>Leave the venue</Button>}
        </div>
      </div>
    </div>
  );
}

function Choice({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-[14px] border border-white/10 bg-black/35 hover:bg-black/55 hover:border-amber/60 transition px-4 py-3">
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      <div className="text-[12px] text-ink3 mt-0.5">{sub}</div>
    </button>
  );
}
