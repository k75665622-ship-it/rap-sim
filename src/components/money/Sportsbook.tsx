// ─── SPORTSBOOK ────────────────────────────────────────────────────────────
// Football from England, Spain, Italy, Germany, France, the European cup,
// Ghana and Nigeria. Kickoffs happen on the game clock, scores move live,
// bets settle at the final whistle. Singles or accumulators.

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore, nowMinuteOf, casinoLimitOf } from '../../store/gameStore';
import { LEAGUES, LEAGUE_BY_ID, matchState, finalScore, selectionWon, pickLabel, type Match, type Market, type Pick } from '../../sim/football';
import { fmtMinute } from '../../sim/appointments';
import { Button } from '../ui/kit';
import { Card, Chips, Flash, Label, usd } from './shared';
import { cn } from '@/utils/cn';

type View = 'matches' | 'bets' | 'tables' | 'results';
interface SlipPick { matchId: string; market: Market; pick: Pick }

export function SportsbookPanel() {
  const football = useGameStore((s) => s.football);
  const now = useGameStore((s) => nowMinuteOf(s));
  const money = useGameStore((s) => s.player?.career.money ?? 0);
  const crew = useGameStore((s) => s.crew);
  const casino = useGameStore((s) => s.casino);
  const place = useGameStore((s) => s.placeFootballBet);
  const [view, setView] = useState<View>('matches');
  const [league, setLeague] = useState<string>('all');
  const [slip, setSlip] = useState<SlipPick[]>([]);
  const [slipOpen, setSlipOpen] = useState(false);
  const [stake, setStake] = useState(100);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [more, setMore] = useState<string | null>(null);
  const limit = casinoLimitOf({ crew, casino });

  const matches = useMemo(() => (football?.matches ?? []).filter((m) => league === 'all' || m.league === league), [football, league]);
  const live = matches.filter((m) => { const st = matchState(m, now); return st.phase === 'live' || st.phase === 'ht'; });
  const upcoming = matches.filter((m) => m.kickoff > now);
  const byId = useMemo(() => new Map((football?.matches ?? []).map((m) => [m.id, m])), [football]);
  const open = (football?.bets ?? []).filter((b) => b.status === 'open');
  const slipOdds = Math.round(slip.reduce((a, s) => a * (byId.get(s.matchId)?.odds[s.pick] ?? 1), 1) * 100) / 100;

  function toggle(m: Match, market: Market, pick: Pick) {
    setMsg(null);
    setSlip((cur) => {
      const same = cur.find((x) => x.matchId === m.id && x.pick === pick);
      if (same) return cur.filter((x) => x !== same);
      return [...cur.filter((x) => x.matchId !== m.id), { matchId: m.id, market, pick }];
    });
  }

  function placeBet() {
    const r = place(slip, stake);
    setMsg(r);
    if (r.ok) { setSlip([]); setSlipOpen(false); }
  }

  const dayLabel = (k: number) => { const d = Math.floor(k / 1440) - Math.floor(now / 1440); return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : new Date(Math.floor(k / 1440) * 86400000).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }); };
  const groups = useMemo(() => {
    const out: { day: string; items: Match[] }[] = [];
    for (const m of upcoming) {
      const d = dayLabel(m.kickoff);
      const g = out.find((x) => x.day === d);
      if (g) g.items.push(m); else out.push({ day: d, items: [m] });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming.map((m) => m.id).join(), Math.floor(now / 1440)]);

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-[18px] p-5 border border-line overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 100% 0%, rgba(77,163,255,0.25), rgba(10,11,16,0) 60%), linear-gradient(135deg, #0e1622, #14161e)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold text-new uppercase tracking-wider">Sportsbook</div>
            <div className="text-[22px] font-bold text-ink mt-1">World football</div>
            <div className="text-[12px] text-ink2">{live.length ? `${live.length} live now · ` : ''}{upcoming.length} matches open · limit {usd(limit)}</div>
          </div>
          <div className="text-right">
            <Label>Open bets</Label>
            <div className="text-[22px] font-bold text-ink num">{open.length}</div>
            <div className="text-[11px] text-ink3">{usd(open.reduce((a, b) => a + b.stake * b.odds, 0))} to win</div>
          </div>
        </div>
      </div>

      <Chips options={[{ id: 'matches' as View, label: '⚽ Matches' }, { id: 'bets' as View, label: `🎟️ My bets${open.length ? ` · ${open.length}` : ''}` }, { id: 'tables' as View, label: '📊 Tables' }, { id: 'results' as View, label: '📋 Results' }]} value={view} onChange={setView} />
      <Flash msg={msg} onClose={() => setMsg(null)} />

      {view === 'matches' && (
        <>
          <Chips options={[{ id: 'all', label: 'All' }, ...LEAGUES.map((l) => ({ id: l.id, label: `${l.flag} ${l.name.split(' · ')[0]}` }))]} value={league} onChange={setLeague} />
          {live.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-fall rl-live-dot" /><span className="text-[13px] font-bold text-ink">Live</span></div>
              <div className="space-y-2">{live.map((m) => <LiveRow key={m.id} m={m} now={now} />)}</div>
            </section>
          )}
          {groups.length === 0 && <Card className="p-6 text-center text-[13px] text-ink3">No matches open right now. New fixtures appear every day.</Card>}
          {groups.map((g) => (
            <section key={g.day}>
              <div className="text-[13px] font-bold text-ink mb-2">{g.day}</div>
              <div className="space-y-2">
                {g.items.map((m) => {
                  const sel = slip.find((x) => x.matchId === m.id);
                  const L = LEAGUE_BY_ID[m.league];
                  const btn = (market: Market, pick: Pick, label: string) => (
                    <button key={pick} onClick={() => toggle(m, market, pick)} className={cn('h-12 rounded-[10px] border transition flex flex-col items-center justify-center', sel?.pick === pick ? 'border-amber bg-amber text-black' : 'border-line bg-sidebar hover:border-amber/60')}>
                      <span className={cn('text-[10px] uppercase tracking-wider', sel?.pick === pick ? 'text-black/70' : 'text-ink3')}>{label}</span>
                      <span className={cn('text-[15px] font-bold num', sel?.pick === pick ? 'text-black' : 'text-amber')}>{m.odds[pick].toFixed(2)}</span>
                    </button>
                  );
                  return (
                    <Card key={m.id} className="p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] text-ink3 truncate">{L.flag} {L.name}</span>
                        <span className="text-[11px] font-semibold text-ink2 shrink-0 num">{fmtMinute(m.kickoff)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[14px] font-semibold text-ink truncate flex-1">{m.home}</span>
                        <span className="text-[11px] text-ink3">v</span>
                        <span className="text-[14px] font-semibold text-ink truncate flex-1 text-right">{m.away}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">{btn('1x2', 'home', '1')}{btn('1x2', 'draw', 'X')}{btn('1x2', 'away', '2')}</div>
                      {more === m.id ? (
                        <div className="grid grid-cols-2 gap-1.5 mt-1.5">{btn('ou', 'over', 'Over 2.5')}{btn('ou', 'under', 'Under 2.5')}{btn('btts', 'yes', 'BTTS yes')}{btn('btts', 'no', 'BTTS no')}</div>
                      ) : (
                        <button onClick={() => setMore(m.id)} className="mt-1.5 w-full text-[11px] text-ink3 hover:text-ink">+ Goals markets</button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {view === 'bets' && (
        <div className="space-y-2">
          {(football?.bets ?? []).length === 0 && <Card className="p-6 text-center text-[13px] text-ink3">No bets yet.</Card>}
          {[...(football?.bets ?? [])].reverse().map((b) => (
            <Card key={b.id} className={cn('p-3.5', b.status === 'won' ? 'border-rise/40' : b.status === 'lost' ? 'opacity-70' : '')}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">{b.selections.length > 1 ? `${b.selections.length}-fold accumulator` : 'Single'} · @ {b.odds.toFixed(2)}</span>
                <span className={cn('text-[11px] font-bold uppercase', b.status === 'won' ? 'text-rise' : b.status === 'lost' ? 'text-fall' : 'text-amber')}>{b.status === 'open' ? 'Open' : b.status === 'won' ? `Won ${usd(b.payout)}` : 'Lost'}</span>
              </div>
              <div className="mt-2 space-y-1">
                {b.selections.map((x) => {
                  const m = byId.get(x.matchId);
                  const st = m ? matchState(m, now) : null;
                  const icon = !m ? '·' : m.settled ? (selectionWon(x, m) ? '✅' : '❌') : st?.phase === 'pre' ? '⏳' : '🔴';
                  const score = m && st && st.phase !== 'pre' ? ` · ${m.settled ? `${finalScore(m).h}–${finalScore(m).a}` : `${st.h}–${st.a} ${st.phase === 'ht' ? 'HT' : `${st.minute}'`}`}` : m ? ` · ${fmtMinute(m.kickoff)}` : '';
                  return <div key={x.matchId} className="text-[12px] text-ink2 leading-snug">{icon} {m ? pickLabel(x.pick, m) : x.label} <span className="text-ink3">— {m ? `${m.home} v ${m.away}` : ''}{score}</span></div>;
                })}
              </div>
              <div className="text-[11px] text-ink3 mt-1.5">Stake {usd(b.stake)} · returns {usd(b.stake * b.odds)}</div>
            </Card>
          ))}
        </div>
      )}

      {view === 'tables' && <Tables />}

      {view === 'results' && (
        <Card className="p-4 space-y-1">
          {(football?.results ?? []).length === 0 && <div className="text-[13px] text-ink3">No results yet.</div>}
          {(football?.results ?? []).map((r, i) => <div key={i} className="text-[13px] text-ink2">{r}</div>)}
        </Card>
      )}

      {slip.length > 0 && typeof document !== 'undefined' && createPortal(
        <div className="fixed left-0 right-0 bottom-0 md:left-56 z-40 px-3 pb-3 pt-2 pointer-events-none">
          <div className="max-w-[920px] mx-auto rounded-[18px] border border-amber/40 bg-[#14161e]/95 backdrop-blur shadow-2xl pointer-events-auto">
            <button onClick={() => setSlipOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3">
              <span className="text-[14px] font-bold text-ink">🎟️ Bet slip · {slip.length} {slip.length > 1 ? `(acca)` : ''}</span>
              <span className="text-[14px] font-bold text-amber num">@ {slipOdds.toFixed(2)} {slipOpen ? '▾' : '▴'}</span>
            </button>
            {slipOpen && (
              <div className="px-4 pb-4 space-y-3 max-h-[60vh] overflow-y-auto">
                {slip.map((x) => { const m = byId.get(x.matchId); if (!m) return null; return (
                  <div key={x.matchId} className="flex items-center gap-2 text-[12px]">
                    <div className="min-w-0 flex-1"><div className="text-ink font-semibold truncate">{pickLabel(x.pick, m)}</div><div className="text-ink3 truncate">{m.home} v {m.away} · {fmtMinute(m.kickoff)}</div></div>
                    <span className="text-amber font-bold num">{m.odds[x.pick].toFixed(2)}</span>
                    <button onClick={() => setSlip((c) => c.filter((y) => y !== x))} className="text-ink3 hover:text-fall px-1">✕</button>
                  </div>
                ); })}
                <Chips options={[10, 50, 100, 500, 1000, 5000, 10_000, 50_000].filter((v) => v <= limit).map((v) => ({ id: v, label: usd(v) }))} value={stake} onChange={setStake} />
                <div className="flex items-center justify-between text-[13px]"><span className="text-ink2">Cash {usd(money)}</span><span className="text-ink">Returns <b className="text-rise num">{usd(stake * slipOdds)}</b></span></div>
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={stake > money} onClick={placeBet}>Place {usd(stake)}</Button>
                  <Button variant="ghost" onClick={() => setSlip([])}>Clear</Button>
                </div>
                {slip.length > 1 && <div className="text-[11px] text-ink3">An accumulator only pays if every pick wins.</div>}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function LiveRow({ m, now }: { m: Match; now: number }) {
  const st = matchState(m, now);
  const L = LEAGUE_BY_ID[m.league];
  return (
    <Card className="p-3 border-fall/30">
      <div className="flex items-center justify-between text-[11px] text-ink3 mb-1.5"><span className="truncate">{L.flag} {L.name}</span><span className="text-fall font-bold shrink-0">{st.phase === 'ht' ? 'HT' : `${st.minute}'`}</span></div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[14px] font-semibold text-ink truncate">{m.home}</span>
        <span className="text-[18px] font-black text-ink num px-2">{st.h} – {st.a}</span>
        <span className="flex-1 text-[14px] font-semibold text-ink truncate text-right">{m.away}</span>
      </div>
    </Card>
  );
}

function Tables() {
  const football = useGameStore((s) => s.football);
  const [lg, setLg] = useState('eng');
  const rows = Object.entries(football?.tables?.[lg] ?? {}).sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga) || b[1].gf - a[1].gf);
  const teams = LEAGUE_BY_ID[lg]?.teams.map((t) => t.name) ?? [];
  const all = [...rows, ...teams.filter((t) => !rows.some((r) => r[0] === t)).map((t) => [t, { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }] as const)];
  return (
    <div className="space-y-3">
      <Chips options={LEAGUES.filter((l) => l.id !== 'ucl').map((l) => ({ id: l.id, label: `${l.flag} ${l.name.split(' · ')[0]}` }))} value={lg} onChange={setLg} />
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[24px_1fr_28px_28px_28px_36px_36px] gap-1 px-3 py-2 text-[10px] uppercase tracking-wider text-ink3 border-b border-line">
          <span>#</span><span>Team</span><span className="text-center">P</span><span className="text-center">W</span><span className="text-center">L</span><span className="text-center">GD</span><span className="text-right">Pts</span>
        </div>
        {all.map(([name, r], i) => (
          <div key={name} className={cn('grid grid-cols-[24px_1fr_28px_28px_28px_36px_36px] gap-1 px-3 py-2 text-[12px] border-b border-line/50 last:border-0', i < 4 ? 'text-ink' : 'text-ink2')}>
            <span className="text-ink3 num">{i + 1}</span><span className="truncate font-medium">{name}</span><span className="text-center num">{r.p}</span><span className="text-center num">{r.w}</span><span className="text-center num">{r.l}</span><span className="text-center num">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</span><span className="text-right font-bold num">{r.pts}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
