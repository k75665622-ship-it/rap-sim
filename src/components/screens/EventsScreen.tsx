// ─── STADIUM, ARENA AND THE TV LOT ─────────────────────────────────────────
// Match day, wrestling night, and the casting desk at Gold Coast Studios.

import { useState } from 'react';
import { useGameStore, heatNow } from '../../store/gameStore';
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

type Move = 'strike' | 'grapple' | 'taunt';
const BEATS: Record<Move, Move> = { strike: 'grapple', grapple: 'taunt', taunt: 'strike' };
const ICON: Record<Move, string> = { strike: '👊 Strike', grapple: '🤼 Grapple', taunt: '📣 Taunt' };

/** Best of three: Strike beats Grapple, Grapple beats Taunt, Taunt beats Strike. Your rival's body language gives away his move — usually. */
function Bout({ opponent, seed, onDone }: { opponent: string; seed: number; onDone: (wins: number) => void }) {
  const [round, setRound] = useState(0);
  const [wins, setWins] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const moves: Move[] = ['strike', 'grapple', 'taunt'];
  const theirs = (r: number): Move => moves[Math.abs(seed * 3 + r * 5 + r * r) % 3];
  const tell = (r: number): Move => (Math.abs(seed + r * 7) % 10 < 7 ? theirs(r) : moves[(moves.indexOf(theirs(r)) + 1) % 3]);
  const hint: Record<Move, string> = { strike: 'He is winding up his arm.', grapple: 'He is crouching low, hands open.', taunt: 'He is playing to the crowd.' };
  const play = (m: Move) => {
    const t = theirs(round);
    const w = BEATS[m] === t ? 1 : 0;
    const l = BEATS[t] === m ? 1 : 0;
    const nw = wins + w;
    setLog((x) => [...x, `Round ${round + 1}: you used ${ICON[m].slice(3)}, ${opponent} used ${ICON[t].slice(3)} — ${w ? 'you take it' : l ? 'he takes it' : 'a draw, nobody scores'}.`]);
    setWins(nw);
    if (round === 2) onDone(nw); else setRound(round + 1);
  };
  return (
    <div className="rounded-[14px] border border-line p-4 space-y-2">
      <div className="text-[11px] tracking-widest text-ink3 font-bold">BOUT · ROUND {Math.min(3, round + 1)} OF 3 · YOU {wins}</div>
      {round <= 2 && log.length === round ? (
        <>
          <div className="text-[13px] text-ink2">{hint[tell(round)]}</div>
          <div className="grid grid-cols-3 gap-2">{moves.map((m) => <button key={m} onClick={() => play(m)} className="h-12 rounded-[12px] border border-line text-[13px] font-bold text-ink active:bg-white/10">{ICON[m]}</button>)}</div>
        </>
      ) : null}
      {log.map((l) => <div key={l} className="text-[12px] text-ink2">{l}</div>)}
    </div>
  );
}

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
  const role = useGameStore((s) => s.tvRole);
  const quit = useGameStore((s) => s.quitTvRole);
  const heat = useGameStore((s) => heatNow(s.ringHeat, dateToSerial(s.gameDate)));
  const settle = useGameStore((s) => s.ringMatch);
  const [bout, setBout] = useState(false);
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
          <div className="rounded-[12px] border border-line px-3 py-2">
            <div className="flex justify-between text-[11px] text-ink3 font-bold"><span>YOUR HEAT WITH THE CROWD</span><span>{Math.round(heat)} / 100</span></div>
            <div className="bg-line rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full bg-amber" style={{ width: `${heat}%` }} /></div>
            <div className="text-[11px] text-ink3 mt-1">At 30 the promoter books you a bout. Win promos to build it; it fades a point a day.</div>
          </div>
          {heat >= 30 && !bout ? <button className={btn} onClick={() => setBout(true)}>🥊 Step through the ropes · vs {pick(RINGNAMES, seed * 11 + 3)}</button> : null}
          {bout ? <Bout opponent={pick(RINGNAMES, seed * 11 + 3)} seed={seed} onDone={(w) => { setMsg(settle(w, pick(RINGNAMES, seed * 11 + 3)).message); setTimeout(() => setBout(false), 2500); }} /> : null}
        </div>
      ) : null}
      {tab === 'tv' ? (
        <div className="space-y-2">
          {role ? (
            <div className="rounded-[14px] border border-amber/40 bg-amber/5 p-3 mb-2">
              <div className="text-[11px] tracking-widest text-amber font-bold">YOUR CONTRACT</div>
              <div className="text-[15px] font-black text-ink">{role.show} · {role.role}</div>
              <div className="text-[12px] text-ink2">Season {role.seasons} · {role.weeksLeft} episode{role.weeksLeft === 1 ? '' : 's'} left · {money(role.pay)} per episode · {role.episodes} aired</div>
              <button className="mt-2 h-9 px-3 rounded-full border border-line text-[12px] font-semibold text-ink" onClick={() => setMsg(quit().message)}>Walk away</button>
            </div>
          ) : null}
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
