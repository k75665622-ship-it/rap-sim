// ─── MISSION HUD ───────────────────────────────────────────────────────────
// Drawn over the city by the HUD: the mission card, the 3-2-1, the objective
// and timer while you play, the retry card, the medal card, and a pill for a
// mission that is waiting to be started.

import { useGameStore } from '../store/gameStore';
import { NODES, triesLeft, DEFAULT_MINUTES } from '../story/engine';
import { CAST } from '../story/cast';
import type { Effect, Medal } from '../story/types';
import { money } from '@/utils/format';
import { missions, useMission } from './runtime';
import { clock } from './verbs';
import { gpsState } from '../world/gps';

const MEDAL: Record<Medal, { icon: string; label: string; color: string }> = {
  gold: { icon: '🥇', label: 'Gold', color: '#ffc21a' },
  silver: { icon: '🥈', label: 'Silver', color: '#d7dde8' },
  bronze: { icon: '🥉', label: 'Bronze', color: '#d08a4d' },
  miss: { icon: '🌧️', label: "Didn't make it", color: '#9aa0b4' },
};

function useTokens() {
  const name = useGameStore((s) => s.player?.artistName ?? 'you');
  const city = useGameStore((s) => s.player?.city ?? 'the city');
  return (t: string) => t.replace(/\{name\}/g, name).replace(/\{city\}/g, city);
}

const sign = (v: number) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`);
const AXIS: Record<string, string> = { integrity: 'Integrity', hustle: 'Hustle', heart: 'Heart' };

/** "What changed", in plain words, from an outcome's effects. */
export function describeEffects(fx: Effect[]): { text: string; good: boolean | null }[] {
  const out: { text: string; good: boolean | null }[] = [];
  for (const e of fx) {
    switch (e.k) {
      case 'bond': out.push({ text: `${sign(e.v)} with ${CAST[e.who]?.name ?? e.who}`, good: e.v > 0 }); break;
      case 'rep': out.push({ text: `${AXIS[e.axis]} ${sign(e.v)}`, good: e.v > 0 }); break;
      case 'money': out.push({ text: `${e.v > 0 ? '+' : '−'}${money(Math.abs(e.v))}`, good: e.v > 0 }); break;
      case 'fans': out.push({ text: `${sign(e.v)} fans`, good: e.v > 0 }); break;
      case 'fame': out.push({ text: `Fame ${sign(e.v)}`, good: e.v > 0 }); break;
      case 'energy': out.push({ text: `Energy ${sign(e.v)}`, good: e.v > 0 }); break;
      case 'memory': out.push({ text: `“${e.text}”`, good: e.tone === 'good' ? true : e.tone === 'bad' ? false : null }); break;
      default: break;
    }
  }
  return out;
}

const card = 'pointer-events-auto w-[min(92vw,400px)] rounded-[18px] bg-[#101219]/95 backdrop-blur border border-white/12 shadow-2xl rl-fade';
const btn = 'h-11 rounded-[12px] font-bold text-[14px] transition active:scale-[0.98]';

export function MissionHud({ touch }: { touch: boolean }) {
  const m = useMission();
  const tok = useTokens();
  const story = useGameStore((s) => s.story);
  // A beat that is waiting for you: a pill to start it.
  if (!m) {
    const d = story?.inbox.find((x) => (x.status === 'new' || x.status === 'open') && NODES[x.node]?.channel === 'play');
    if (!d) return null;
    const n = NODES[d.node];
    return (
      <button
        onClick={() => missions.begin(d.node)}
        className={`pointer-events-auto absolute top-[52px] left-1/2 -translate-x-1/2 h-8 pl-2 pr-3 rounded-full bg-black/75 backdrop-blur border border-amber/70 flex items-center gap-1.5 text-[12px] font-bold rl-fade`}
        data-testid="mission-pill"
      >
        <span className="w-5 h-5 rounded-full bg-amber text-black text-[11px] flex items-center justify-center">▶</span>
        <span className="max-w-[230px] truncate">{n.title}</span>
        <span className="text-amber">Start</span>
      </button>
    );
  }

  const n = NODES[m.node];
  const spec = n.play!;
  const from = CAST[n.from] ?? CAST.narr;

  if (m.phase === 'brief') {
    const left = story ? triesLeft(story, m.node) : 0;
    const p = m.preview;
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/45 pointer-events-auto" data-testid="mission-brief">
        <div className={card}>
          <div className="px-5 pt-4 pb-3 border-b border-white/10" style={{ background: `linear-gradient(135deg, ${from.color}22, transparent 70%)` }}>
            <div className="text-[10px] tracking-[0.2em] font-black text-amber">MISSION</div>
            <div className="text-[20px] font-black leading-tight mt-0.5">{n.title}</div>
            <div className="text-[12px] text-ink2 mt-1 flex items-center gap-1.5"><span>{from.emoji}</span><span>{from.name}</span></div>
          </div>
          <div className="px-5 py-3 space-y-2 max-h-[34vh] overflow-y-auto">
            {n.lines.map((l, i) => (
              l.who === 'narr'
                ? <p key={i} className="text-[13px] italic text-ink2 leading-snug">{tok(l.text)}</p>
                : <p key={i} className="text-[13px] leading-snug"><b style={{ color: (CAST[l.who] ?? from).color }}>{(CAST[l.who] ?? from).name}:</b> {tok(l.text)}</p>
            ))}
          </div>
          <div className="mx-5 mb-3 rounded-[12px] bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="text-[11px] uppercase tracking-wider text-ink3 font-bold">Objective</div>
            <div className="text-[14px] font-semibold mt-0.5">{tok(spec.objective)}</div>
            {p ? (
              <div className="flex items-center gap-3 mt-2 text-[12px] num">
                <span title="Time allowed">⏱ {clock(p.limit)}</span>
                <span style={{ color: MEDAL.gold.color }} title="Finish within this time for gold">🥇 under {clock(p.gold)}</span>
                <span style={{ color: MEDAL.silver.color }} title="Finish within this time for silver">🥈 under {clock(p.silver)}</span>
                <span className="text-ink3 ml-auto">{left} {left === 1 ? 'try' : 'tries'}</span>
              </div>
            ) : null}
            {p && p.stops.length > 1 ? <div className="text-[11px] text-ink3 mt-1 truncate">Route: {p.stops.join(' → ')}</div> : null}
          </div>
          <div className="px-5 pb-4 flex gap-2">
            <button onClick={() => missions.dismiss()} className={`${btn} px-4 border border-white/15 text-ink2`} data-testid="mission-later">Not now</button>
            <button onClick={() => missions.start()} className={`${btn} flex-1 bg-amber text-black`} data-testid="mission-start">Start{touch ? '' : ' · E'}</button>
          </div>
        </div>
      </div>
    );
  }

  if (m.phase === 'count') {
    const k = Math.ceil(m.count);
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" data-testid="mission-count">
        <div key={k} className="text-[96px] font-black text-amber drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)] rl-fade num">{k > 0 ? k : 'GO'}</div>
      </div>
    );
  }

  if (m.phase === 'play' && m.run) {
    const r = m.run;
    const left = r.limit ? r.limit - r.t : 0;
    const hot = r.limit > 0 && left < 10;
    return (
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[min(70vw,360px)] rounded-[14px] bg-black/70 backdrop-blur border border-amber/50 px-3 py-2 rl-fade" data-testid="mission-play">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-[0.18em] font-black text-amber">{r.steps > 1 ? `STOP ${Math.min(r.stepNo + 1, r.steps)}/${r.steps}` : 'MISSION'}</span>
          {r.limit ? <span className={`ml-auto text-[22px] leading-none font-black num ${hot ? 'text-red-400 animate-pulse' : ''}`} data-testid="mission-timer">{clock(left)}</span> : null}
        </div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <div className="text-[13px] font-semibold truncate flex-1" data-testid="mission-step">{tok(r.step)}</div>
          {gpsState.target && gpsState.dist > 0 ? <span className="text-[12px] text-amber num shrink-0">{gpsState.dist < 1000 ? `${Math.round(gpsState.dist / 5) * 5} m` : `${(gpsState.dist / 1000).toFixed(1)} km`}</span> : null}
        </div>
        {r.limit ? (
          <div className="h-1 rounded bg-white/10 mt-1.5 overflow-hidden">
            <div className={`h-full ${hot ? 'bg-red-400' : 'bg-amber'}`} style={{ width: `${Math.max(0, Math.min(100, (left / r.limit) * 100))}%` }} />
          </div>
        ) : null}
      </div>
    );
  }

  if (m.phase === 'fail' && m.fail) {
    const mins = spec.minutes ?? DEFAULT_MINUTES;
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/45 pointer-events-auto" data-testid="mission-fail">
        <div className={`${card} p-5`}>
          <div className="text-[10px] tracking-[0.2em] font-black text-red-300">{n.title.toUpperCase()}</div>
          <div className="text-[20px] font-black mt-0.5">{m.fail.why}</div>
          <div className="text-[13px] text-ink2 mt-1">{m.fail.note}. {m.fail.triesLeft} {m.fail.triesLeft === 1 ? 'try' : 'tries'} left. Another go takes about {mins} minutes of the day.</div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => missions.giveUp()} className={`${btn} px-4 border border-white/15 text-ink2`} data-testid="mission-giveup">Let it go</button>
            <button onClick={() => missions.start()} className={`${btn} flex-1 bg-amber text-black`} data-testid="mission-retry">Try again{touch ? '' : ' · E'}</button>
          </div>
        </div>
      </div>
    );
  }

  if (m.phase === 'result' && m.result) {
    const md = MEDAL[m.result.medal];
    const changes = describeEffects(m.result.fx);
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/45 pointer-events-auto" data-testid="mission-result">
        <div className={`${card} overflow-hidden`}>
          <div className="px-5 pt-5 pb-4 text-center" style={{ background: `radial-gradient(circle at 50% 0%, ${md.color}33, transparent 70%)` }}>
            <div className="text-[56px] leading-none">{md.icon}</div>
            <div className="text-[22px] font-black mt-1" style={{ color: md.color }} data-testid="mission-medal">{md.label}</div>
            <div className="text-[12px] text-ink3 mt-0.5">{n.title} · {m.result.note}</div>
          </div>
          {m.result.say ? <p className="px-5 text-[14px] leading-snug text-center">{tok(m.result.say)}</p> : null}
          {changes.length ? (
            <div className="mx-5 mt-3 rounded-[12px] bg-white/5 border border-white/10 px-3 py-2.5">
              <div className="text-[11px] uppercase tracking-wider text-ink3 font-bold mb-1">What changed</div>
              <ul className="space-y-1">
                {changes.map((c, i) => <li key={i} className={`text-[13px] leading-snug ${c.good === true ? 'text-rise' : c.good === false ? 'text-red-300' : 'text-ink2 italic'}`}>{tok(c.text)}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="p-5 pt-4">
            <button onClick={() => missions.continue()} className={`${btn} w-full bg-amber text-black`} data-testid="mission-continue">Continue{touch ? '' : ' · E'}</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
