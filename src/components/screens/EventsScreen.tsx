// ─── STADIUM, ARENA AND THE TV LOT ─────────────────────────────────────────
// Match day, wrestling night, and the casting desk at Gold Coast Studios.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { dateToSerial } from '../../sim/gameClock';
import { currentCountry } from '../../world/layout';
import { money } from '@/utils/format';

export type EventsTab = 'football' | 'wrestling' | 'tv';
let tab0: EventsTab = 'football';
export const setEventsTab = (t: EventsTab) => { tab0 = t; };

const CLUBS = ['Lions', 'Eagles', 'Stars', 'Rovers', 'United', 'Atletico', 'City', 'Hearts', 'Warriors', 'Sharks', 'Panthers', 'Falcons'];
const RINGNAMES = ['The Accra Anvil', 'Madame Thunder', 'Kojo "Cobra" Mensah', 'Iron Esi', 'El Fuego', 'Big Baobab', 'The Phantom', 'Sister Lightning'];
const SHOWS = [
  { name: 'Rhythm Nation', role: 'Guest judge on the talent show', fee: 800 },
  { name: 'Late Night with Kofi', role: 'Live talk-show performance', fee: 2500 },
  { name: 'Compound Life', role: 'Cameo in the hit sitcom', fee: 600 },
  { name: 'Sunrise Special', role: 'Music segment on morning TV', fee: 1200 },
];
const pick = <T,>(a: T[], n: number) => a[Math.abs(n) % a.length];

export function EventsScreen() {
  const [tab, setTab] = useState<EventsTab>(tab0);
  const [msg, setMsg] = useState('');
  const day = useGameStore((s) => dateToSerial(s.gameDate));
  const cash = useGameStore((s) => s.player?.career.money ?? 0);
  const setScreen = useGameStore((s) => s.setScreen);
  const act = useGameStore((s) => s.eventAct);
  const seed = day * 7 + [...currentCountry()].reduce((a, c) => a + c.charCodeAt(0), 0);
  const home = pick(CLUBS, seed), away = pick(CLUBS, seed * 3 + 5);
  const homeName = home === away ? pick(CLUBS, seed + 1) : home;
  const run = (kind: Parameters<typeof act>[0], idx?: number) => setMsg(act(kind, idx).message);
  const btn = 'w-full min-h-11 rounded-[12px] border border-line px-3 py-2 text-left text-[13px] font-semibold text-ink active:bg-white/10';
  return (
    <div className="p-4 pb-10 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[20px] font-bold text-ink">Tonight in town</div>
        <button onClick={() => setScreen('city')} className="h-10 px-4 rounded-full border border-line text-[13px] font-semibold text-ink">Back</button>
      </div>
      <div className="flex gap-2 mb-4">
        {([['football', '⚽ Football'], ['wrestling', '🤼 Wrestling'], ['tv', '📺 TV auditions']] as const).map(([t, l]) => (
          <button key={t} onClick={() => { setTab(t); setMsg(''); }} className={`flex-1 h-10 rounded-full text-[12px] font-bold border ${tab === t ? 'bg-amber text-black border-amber' : 'border-line text-ink'}`}>{l}</button>
        ))}
      </div>
      <div className="text-[12px] text-ink3 mb-3">Cash {money(cash)}</div>
      {msg ? <div className="mb-3 rounded-[10px] bg-white/[0.06] border border-line px-3 py-2 text-[13px] text-ink">{msg}</div> : null}
      {tab === 'football' ? (
        <div className="space-y-2">
          <div className="rounded-[14px] border border-line p-4 text-center">
            <div className="text-[11px] tracking-widest text-ink3 font-bold">MATCH DAY · NATIONAL STADIUM</div>
            <div className="text-[22px] font-black text-ink mt-1">{homeName} <span className="text-ink3">vs</span> {pick(CLUBS.filter((c) => c !== homeName), seed * 5 + 2)}</div>
            <div className="text-[12px] text-ink2 mt-1">Kick-off at 19:00 · the whole city is talking about it.</div>
          </div>
          <button className={btn} onClick={() => run('watch')}>🎟️ Watch from the stands · 2 h · free</button>
          <button className={btn} onClick={() => setScreen('investments')}>⚽ Put money on it (Money → Betting)</button>
        </div>
      ) : null}
      {tab === 'wrestling' ? (
        <div className="space-y-2">
          <div className="rounded-[14px] border border-line p-4">
            <div className="text-[11px] tracking-widest text-ink3 font-bold">IRON RING ARENA · TONIGHT</div>
            <div className="text-[17px] font-black text-ink mt-1">{pick(RINGNAMES, seed)} vs {pick(RINGNAMES, seed * 3 + 1)}</div>
            <div className="text-[12px] text-ink2 mt-1">Main event: {pick(RINGNAMES, seed * 7 + 2)} defends the belt.</div>
          </div>
          <button className={btn} onClick={() => run('ringside')}>🪑 Ringside seats · {money(40)} · 2.5 h</button>
          <button className={btn} onClick={() => run('promo')}>🎤 Ask to cut a promo before the main event · risky, pays if the crowd loves it</button>
        </div>
      ) : null}
      {tab === 'tv' ? (
        <div className="space-y-2">
          <div className="text-[12px] text-ink2 mb-1">Casting at Gold Coast Studios. Fame and stage presence get you in the room; luck gets you the part. One try per show every few days.</div>
          {SHOWS.map((s, i) => (
            <button key={s.name} className={btn} onClick={() => run('audition', i)}>
              <span className="block">📺 {s.name}</span>
              <span className="block text-[11px] text-ink3 font-normal">{s.role} · pays {money(s.fee)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
