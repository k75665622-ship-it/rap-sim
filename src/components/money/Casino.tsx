// ─── MONEY: THE CASINO ─────────────────────────────────────────────────────
// Blackjack, roulette, slots, dice and the sports book. Real odds: the house
// edge is the house edge.

import { useState } from 'react';
import { useGameStore, casinoLimitOf } from '../../store/gameStore';
import { handTotal, isRed, vipTier, type Card as PlayingCard, type RouletteBet, type DiceBet } from '../../sim/casino';
import { dateToSerial } from '../../sim/gameClock';
import { Button } from '../ui/kit';
import { Card, Chips, Flash, Label, usd } from './shared';

type Game = 'blackjack' | 'roulette' | 'slots' | 'dice';
type Msg = { ok: boolean; message: string } | null;

export function CasinoPanel() {
  const casino = useGameStore((s) => s.casino);
  const gameDate = useGameStore((s) => s.gameDate);
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const energy = useGameStore((s) => s.player?.energy ?? 0);
  const enterCasino = useGameStore((s) => s.enterCasino);
  const [game, setGame] = useState<Game>('blackjack');
  const [msg, setMsg] = useState<Msg>(null);
  const [stake, setStake] = useState(100);
  const serial = dateToSerial(gameDate);
  const inside = casino?.visitSerial === serial;
  const vip = casino?.vipPoints ?? 0;
  const crew = useGameStore((s) => s.crew);
  const limit = casinoLimitOf({ crew, casino });
  const today = casino?.day.serial === serial ? casino.day.net : 0;
  const stakes = [10, 50, 100, 500, 1000, 5000, 10_000, 50_000, 250_000].filter((s) => s <= limit);

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] p-5 border border-line relative overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(46,213,115,0.22), rgba(10,11,16,0) 60%), linear-gradient(135deg, #0f1a14, #14161e)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold text-rise uppercase tracking-wider">The Golden Palm Casino</div>
            <div className="text-[22px] font-bold text-ink mt-1">{vipTier(vip)} member</div>
            <div className="text-[12px] text-ink2">Table limit {usd(limit)} · {usd(vip)} wagered all-time</div>
          </div>
          <div className="text-right">
            <Label>Tonight</Label>
            <div className={`text-[20px] font-bold num ${today >= 0 ? 'text-rise' : 'text-fall'}`}>{today >= 0 ? '+' : ''}{usd(today)}</div>
            <div className="text-[11px] text-ink3">All-time {(casino?.net ?? 0) >= 0 ? '+' : ''}{usd(casino?.net ?? 0)}</div>
          </div>
        </div>
        {!inside && (
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={energy < 3} onClick={() => setMsg(enterCasino())}>Walk in · ⚡3</Button>
            <span className="text-[12px] text-ink2">Football betting is in the ⚽ Betting tab — no need to go in.</span>
          </div>
        )}
      </div>

      <Chips
        options={[
          { id: 'blackjack' as Game, label: '🃏 Blackjack' },
          { id: 'roulette' as Game, label: '🎡 Roulette' },
          { id: 'slots' as Game, label: '🎰 Slots' },
          { id: 'dice' as Game, label: '🎲 Dice' },
        ]}
        value={game}
        onChange={(g) => { setGame(g); setMsg(null); }}
      />

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2"><Label>Your bet</Label><span className="text-[11px] text-ink3">Cash {usd(money)}</span></div>
        <Chips options={stakes.map((s) => ({ id: s, label: usd(s) }))} value={stake} onChange={setStake} />
      </Card>

      <Flash msg={msg} onClose={() => setMsg(null)} />

      {!inside ? (
        <Card className="p-6 text-center text-[13px] text-ink2">Walk in to sit at the tables.</Card>
      ) : game === 'blackjack' ? <Blackjack stake={stake} onMsg={setMsg} />
        : game === 'roulette' ? <Roulette stake={stake} onMsg={setMsg} />
        : game === 'slots' ? <Slots stake={stake} onMsg={setMsg} />
        : <Dice stake={stake} onMsg={setMsg} />}

      {(casino?.history ?? []).length > 0 && (
        <Card className="p-4">
          <Label className="mb-2">Recent</Label>
          <div className="space-y-1">{casino!.history.slice(0, 8).map((h, i) => <div key={i} className="text-[12px] text-ink2 leading-snug">{h}</div>)}</div>
        </Card>
      )}
      <div className="text-[11px] text-ink3 text-center leading-snug">Every game here is built so the house wins over time. Lose big while you're famous and the blogs will post it.</div>
    </div>
  );
}

function PlayingCardView({ c, hidden }: { c?: PlayingCard; hidden?: boolean }) {
  if (hidden || !c) return <div className="w-[52px] h-[74px] rounded-[8px] border border-white/20 shadow-md" style={{ background: 'repeating-linear-gradient(45deg, #7a1d2c, #7a1d2c 6px, #8f2335 6px, #8f2335 12px)' }} />;
  const red = c.suit === '♥' || c.suit === '♦';
  return (
    <div className="rl-pop w-[52px] h-[74px] rounded-[8px] bg-white shadow-md flex flex-col justify-between p-1.5" style={{ color: red ? '#d62839' : '#111' }}>
      <div className="text-[14px] font-bold leading-none">{c.rank}</div>
      <div className="text-[22px] leading-none self-center">{c.suit}</div>
      <div className="text-[14px] font-bold leading-none self-end rotate-180">{c.rank}</div>
    </div>
  );
}

function Blackjack({ stake, onMsg }: { stake: number; onMsg: (m: Msg) => void }) {
  const hand = useGameStore((s) => s.casino?.blackjack ?? null);
  const play = useGameStore((s) => s.casinoBlackjack);
  const live = !!hand && !hand.done;
  return (
    <Card className="p-4" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #135c3a, #0c3322)' }}>
      {hand ? (
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">Dealer {hand.done ? `· ${handTotal(hand.dealer)}` : ''}</div>
            <div className="flex gap-2 flex-wrap">{hand.dealer.map((c, i) => <PlayingCardView key={i} c={c} hidden={!hand.done && i === 1} />)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1.5">You · {handTotal(hand.player)} · bet {usd(hand.bet)}</div>
            <div className="flex gap-2 flex-wrap">{hand.player.map((c, i) => <PlayingCardView key={i} c={c} />)}</div>
          </div>
          {hand.done && <div className={`rl-pop text-[18px] font-bold ${hand.result === 'lose' ? 'text-fall' : hand.result === 'push' ? 'text-white' : 'text-amber'}`}>{hand.result === 'blackjack' ? 'BLACKJACK! Paid 3 to 2' : hand.result === 'win' ? `You win ${usd((hand.payout ?? 0) - hand.bet)}` : hand.result === 'push' ? 'Push — stake back' : 'Dealer wins'}</div>}
        </div>
      ) : (
        <div className="text-[13px] text-white/80 py-6 text-center">Get closer to 21 than the dealer without going over. Blackjack pays 3 to 2. The dealer stands on 17.</div>
      )}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {live ? (
          <>
            <Button onClick={() => onMsg(play('hit'))}>Hit</Button>
            <Button variant="secondary" onClick={() => onMsg(play('stand'))}>Stand</Button>
            <Button variant="secondary" disabled={hand!.player.length !== 2} onClick={() => onMsg(play('double'))}>Double</Button>
          </>
        ) : (
          <Button className="col-span-3" onClick={() => onMsg(play('deal', stake))}>Deal · {usd(stake)}</Button>
        )}
      </div>
    </Card>
  );
}

const ROULETTE_BETS: { id: RouletteBet; label: string; pays: string; cls?: string }[] = [
  { id: 'red', label: 'Red', pays: '1:1', cls: 'bg-[#c0283a] text-white border-[#c0283a]' },
  { id: 'black', label: 'Black', pays: '1:1', cls: 'bg-black text-white border-white/20' },
  { id: 'odd', label: 'Odd', pays: '1:1' },
  { id: 'even', label: 'Even', pays: '1:1' },
  { id: 'low', label: '1–18', pays: '1:1' },
  { id: 'high', label: '19–36', pays: '1:1' },
  { id: 'dozen1', label: '1st 12', pays: '2:1' },
  { id: 'dozen2', label: '2nd 12', pays: '2:1' },
  { id: 'dozen3', label: '3rd 12', pays: '2:1' },
];

function Roulette({ stake, onMsg }: { stake: number; onMsg: (m: Msg) => void }) {
  const spin = useGameStore((s) => s.casinoRoulette);
  const [bet, setBet] = useState<RouletteBet>('red');
  const [num, setNum] = useState(17);
  const [last, setLast] = useState<number | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-center py-3">
        <div key={spinKey} className={`rl-pop w-24 h-24 rounded-full border-4 border-amber/70 flex items-center justify-center text-[34px] font-black text-white shadow-lg ${last === null ? 'bg-white/5' : last === 0 ? 'bg-[#159a4b]' : isRed(last) ? 'bg-[#c0283a]' : 'bg-black'}`}>{last ?? '?'}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ROULETTE_BETS.map((b) => (
          <button key={b.id} onClick={() => setBet(b.id)} className={`h-12 rounded-[10px] border text-[13px] font-bold transition ${bet === b.id ? 'ring-2 ring-amber' : ''} ${b.cls ?? 'bg-card border-line text-ink'}`}>
            {b.label}<div className="text-[9px] font-semibold opacity-70">pays {b.pays}</div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setBet(`n${num}` as RouletteBet)} className={`h-10 px-3 rounded-[10px] border text-[13px] font-bold ${bet.startsWith('n') ? 'border-amber text-amber bg-amber/10' : 'border-line text-ink bg-card'}`}>Single number · pays 35:1</button>
        <input type="number" min={0} max={36} value={num} onChange={(e) => { const n = Math.max(0, Math.min(36, Math.round(Number(e.target.value) || 0))); setNum(n); setBet(`n${n}` as RouletteBet); }} className="w-16 h-10 rounded-[10px] bg-sidebar border border-line px-2 text-center text-[15px] text-ink num" />
      </div>
      <Button className="w-full" onClick={() => { const r = spin(bet, stake); onMsg(r); if (r.n !== undefined) { setLast(r.n); setSpinKey((k) => k + 1); } }}>Spin · {usd(stake)} on {bet.startsWith('n') ? `#${bet.slice(1)}` : ROULETTE_BETS.find((b) => b.id === bet)?.label}</Button>
    </Card>
  );
}

function Slots({ stake, onMsg }: { stake: number; onMsg: (m: Msg) => void }) {
  const spin = useGameStore((s) => s.casinoSlots);
  const [reels, setReels] = useState(['🍒', '🔔', '7️⃣']);
  const [k, setK] = useState(0);
  return (
    <Card className="p-4 space-y-4" style={{ background: 'linear-gradient(180deg, #2a1440, #14161e)' }}>
      <div className="flex justify-center gap-2.5 py-2">
        {reels.map((r, i) => <div key={`${k}-${i}`} className="rl-pop w-20 h-24 rounded-[14px] bg-white flex items-center justify-center text-[44px] shadow-inner" style={{ animationDelay: `${i * 90}ms` }}>{r}</div>)}
      </div>
      <div className="text-[11px] text-ink2 text-center">Three 7️⃣ ×200 · 💎 ×75 · ⭐ ×30 · 🔔 ×15 · 🍋 ×8 · 🍒 ×5 · two cherries ×1.5 · a pair, half back</div>
      <Button className="w-full" onClick={() => { const r = spin(stake); onMsg(r); if (r.reels) { setReels(r.reels); setK((x) => x + 1); } }}>Pull · {usd(stake)}</Button>
    </Card>
  );
}

const PIPS = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
function Dice({ stake, onMsg }: { stake: number; onMsg: (m: Msg) => void }) {
  const roll = useGameStore((s) => s.casinoDice);
  const [dice, setDice] = useState<[number, number] | null>(null);
  const [k, setK] = useState(0);
  const go = (b: DiceBet) => { const r = roll(b, stake); onMsg(r); if (r.dice) { setDice(r.dice); setK((x) => x + 1); } };
  return (
    <Card className="p-4 space-y-4">
      <div className="flex justify-center gap-4 py-2">
        {(dice ?? [0, 0]).map((d, i) => <div key={`${k}-${i}`} className="rl-pop text-[72px] leading-none text-white">{d ? PIPS[d] : '🎲'}</div>)}
      </div>
      {dice && <div className="text-center text-[15px] font-bold text-ink">Total {dice[0] + dice[1]}</div>}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" onClick={() => go('under')}>Under 7<span className="text-[10px] opacity-60 ml-1">1:1</span></Button>
        <Button onClick={() => go('seven')}>Lucky 7<span className="text-[10px] opacity-60 ml-1">4:1</span></Button>
        <Button variant="secondary" onClick={() => go('over')}>Over 7<span className="text-[10px] opacity-60 ml-1">1:1</span></Button>
      </div>
    </Card>
  );
}
