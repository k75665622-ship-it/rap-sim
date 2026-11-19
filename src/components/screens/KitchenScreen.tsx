// ─── MAMA'S KITCHEN ────────────────────────────────────────────────────────
//
// The chop bar on the strip. Eat to get energy back (cheaper than a nap, but
// it costs money and time, and you can only eat so much), and see who's at
// the tables — the people of the city eat here at lunch and dinner, so this
// is where you bump into the producer you've been meaning to message.

import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Avatar } from '../social/shared';
import { money } from '@/utils/format';
import { formatClockTime } from '../../sim/gameClock';
import { peopleAt, stepPeople, cast } from '../../world/people';
import { energyColor } from '../../sim/energy';
import { cn } from '@/utils/cn';

const MENU = [
  { id: 'kelewele', name: 'Kelewele & groundnuts', blurb: 'Spicy fried plantain. A snack.', price: 6, energy: 6, minutes: 15 },
  { id: 'sobolo', name: 'Sobolo & a meat pie', blurb: 'Cold hibiscus drink, warm pie.', price: 5, energy: 5, minutes: 10 },
  { id: 'waakye', name: 'Waakye special', blurb: 'Rice and beans, wele, egg, gari, shito.', price: 14, energy: 14, minutes: 30 },
  { id: 'jollof', name: 'Jollof & grilled chicken', blurb: 'The house plate. The jollof war ends here.', price: 22, energy: 22, minutes: 40 },
  { id: 'banku', name: 'Banku & tilapia', blurb: 'Whole grilled fish, pepper, onions. Takes a while.', price: 35, energy: 32, minutes: 55 },
];

const ROLE: Record<string, string> = {
  artist: 'Artist', producer: 'Producer', engineer: 'Engineer', songwriter: 'Songwriter', manager: 'Manager', label_ceo: 'Label boss',
  ar: 'A&R', dj: 'DJ', radio_owner: 'Radio', media: 'Journalist', blogger: 'Blogger', publicist: 'Publicist', promoter: 'Promoter',
  stylist: 'Stylist', photographer: 'Photographer', lawyer: 'Lawyer', investor: 'Investor', venue_owner: 'Venue owner',
};

export function KitchenScreen() {
  const player = useGameStore((s) => s.player);
  const minute = useGameStore((s) => s.clockMinute ?? 0);
  const eat = useGameStore((s) => s.eatMeal);
  const meet = useGameStore((s) => s.meetInCity);
  const selectNPC = useGameStore((s) => s.selectNPC);
  const setScreen = useGameStore((s) => s.setScreen);
  const npcs = useGameStore((s) => s.npcs);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [, tick] = useState(0);

  // The city keeps living while you sit here: people come and go.
  useEffect(() => {
    cast();
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      stepPeople(Math.min(0.5, (now - last) / 1000), useGameStore.getState().clockMinute ?? 720, null);
      last = now;
      tick((x) => x + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  if (!player) return null;
  const here = peopleAt('food');
  const named = here.filter((r) => r.npcId);
  const locals = here.filter((r) => !r.npcId);
  const h = minute / 60;
  const busy = (h >= 12 && h < 13.5) || (h >= 18 && h < 19.5);

  return (
    <div className="max-w-[760px] mx-auto space-y-4">
      <section className="rounded-[22px] border border-line overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 0% 0%, #ff475744, transparent 55%), radial-gradient(100% 120% at 100% 100%, #ffb80022, transparent 60%), #14161e' }}>
        <div className="p-5 sm:p-6">
          <div className="text-[11px] tracking-widest text-fall font-bold">CHOP BAR · ON THE STRIP</div>
          <h1 className="text-[28px] sm:text-[34px] font-black leading-tight">Mama's Kitchen</h1>
          <p className="text-[13px] text-ink2 mt-1">Jollof, waakye, grilled fish. {formatClockTime(minute)} · {busy ? 'Busy — the city is eating.' : here.length ? 'A few tables taken.' : 'Quiet right now.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 max-w-[360px]">
            <div className="rounded-[12px] bg-black/30 border border-line px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-ink3">Energy</div>
              <div className="text-[16px] font-bold num">{Math.round(player.energy)} / {Math.round(player.maxEnergy)}</div>
              <div className="h-1.5 rounded-full bg-line mt-1"><div className={cn('h-1.5 rounded-full', energyColor(player.energy, player.maxEnergy))} style={{ width: `${Math.min(100, (player.energy / Math.max(1, player.maxEnergy)) * 100)}%` }} /></div>
            </div>
            <div className="rounded-[12px] bg-black/30 border border-line px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-ink3">Cash</div>
              <div className="text-[16px] font-bold num text-rise">{money(player.career.money)}</div>
            </div>
          </div>
        </div>
      </section>

      {note ? (
        <div className={cn('rounded-[12px] border px-4 py-3 text-[13px]', note.ok ? 'border-rise/40 bg-rise/10' : 'border-fall/40 bg-fall/10')}>{note.text}</div>
      ) : null}

      <section className="rounded-[18px] border border-line bg-card p-4">
        <div className="text-[13px] font-bold mb-3">Menu</div>
        <div className="space-y-2">
          {MENU.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-[12px] bg-white/[0.03] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold truncate">{m.name}</div>
                <div className="text-[12px] text-ink3 truncate">{m.blurb} · +{m.energy} energy · {m.minutes} min</div>
              </div>
              <button
                disabled={player.career.money < m.price}
                onClick={() => { const r = eat(m.price, m.energy, m.minutes, m.name); setNote({ ok: r.ok, text: r.message }); }}
                className="shrink-0 h-9 px-3.5 rounded-[10px] bg-amber text-black text-[13px] font-bold disabled:opacity-40 disabled:cursor-not-allowed num"
              >
                {money(m.price)}
              </button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink3 mt-3">Eating takes time on the clock. A second plate within four hours doesn't do much — you're full.</p>
      </section>

      <section className="rounded-[18px] border border-line bg-card p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-[13px] font-bold">At the tables</div>
          <div className="text-[11px] text-ink3">Busiest 12:00–13:30 and 18:00–19:30</div>
        </div>
        {named.length === 0 ? (
          <p className="text-[13px] text-ink3">{locals.length ? 'Just locals right now.' : 'Nobody in. Come back at lunch or dinner.'}</p>
        ) : (
          <div className="space-y-1.5">
            {named.map((r) => {
              const n = npcs.find((x) => x.id === r.npcId);
              if (!n) return null;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-[12px] bg-white/[0.03] px-3 py-2">
                  <Avatar name={n.name} seed={n.id} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold truncate">{n.name}</div>
                    <div className="text-[12px] text-ink3 truncate">{ROLE[n.role] ?? n.role.replace(/_/g, ' ')} · fame {Math.round(n.fame)}</div>
                  </div>
                  <button
                    onClick={() => { const res = meet(n.id, "at Mama's Kitchen"); setNote({ ok: res.ok, text: res.ok ? `You sat with ${n.name.split(' ')[0]} for a bit. ${res.message}.` : res.message }); }}
                    className="h-8 px-3 rounded-[10px] border border-line text-[12px] font-semibold hover:border-amber/60"
                  >
                    Say hi
                  </button>
                  <button onClick={() => { selectNPC(n.id); setScreen('npc_profile'); }} className="h-8 px-3 rounded-[10px] border border-line text-[12px] text-ink2 hover:text-ink">Profile</button>
                </div>
              );
            })}
          </div>
        )}
        {locals.length ? <p className="text-[12px] text-ink3 mt-2.5">Also eating: {locals.map((r) => r.name).join(', ')}.</p> : null}
      </section>
    </div>
  );
}
