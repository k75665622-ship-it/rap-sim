// ─── INTERVIEWS ────────────────────────────────────────────────────────────
// Radio, TV, podcasts, blogs. They invite you — more when you're hot — or you
// pitch yourself. Every sit-down is built from your world, something
// unexpected can happen on air, and every answer moves something.

import { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import { compact } from '@/utils/format';
import { useGameStore, blendedFame } from '../../store/gameStore';
import { Button, PageTitle } from '../ui/kit';
import { dateToSerial } from '../../sim/gameClock';
import { ENERGY_COSTS } from '../../sim/energy';
import { FORMAT_INFO, KIND_EMOJI, outletsFor, type InterviewFormat, type IvOption, type Outlet } from '../../sim/interviews';
import type { InterviewRecord } from '../../types/game';
import { Avatar } from '../social/shared';

const TAG_CLS: Record<IvOption['tag'], string> = {
  Safe: 'bg-white/10 text-ink2', Bold: 'bg-amber/15 text-amber', Funny: 'bg-[#4DA3FF]/15 text-[#4DA3FF]', Honest: 'bg-rise/15 text-rise',
  Savage: 'bg-fall/15 text-fall', Humble: 'bg-new/15 text-new', 'Walk out': 'bg-fall/25 text-fall', Deflect: 'bg-white/10 text-ink3', Hype: 'bg-[#E93D82]/15 text-[#E93D82]',
};
const STAT_LABEL = { charisma: 'Charisma', freestyle: 'Freestyle', lyricism: 'Lyricism', performance: 'Performance' } as const;

function OutletBadge({ o, size = 44 }: { o: Outlet; size?: number }) {
  return <div className="rounded-[12px] flex items-center justify-center shrink-0 text-black font-black" style={{ width: size, height: size, background: o.color, fontSize: size * 0.45 }}>{KIND_EMOJI[o.kind]}</div>;
}

function Delta({ label, v, money }: { label: string; v: number; money?: boolean }) {
  if (!v) return null;
  const up = v > 0;
  return <span className={cn('px-2 h-[22px] rounded-full text-[11px] font-semibold flex items-center', up ? 'bg-rise/15 text-rise' : 'bg-fall/15 text-fall')}>{label} {up ? '+' : ''}{money ? `$${Math.round(v).toLocaleString()}` : Math.abs(v) >= 100 ? compact(v) : v}</span>;
}

function Results({ rec, onBack }: { rec: InterviewRecord; onBack: () => void }) {
  return (
    <div className="rounded-[18px] border border-line bg-card overflow-hidden rl-pop">
      <div className="p-5" style={{ background: rec.viral ? 'linear-gradient(135deg, rgba(255,92,92,0.18), transparent 70%)' : 'linear-gradient(135deg, rgba(245,179,1,0.12), transparent 70%)' }}>
        <div className="text-[11px] uppercase tracking-wider text-ink3">The headline</div>
        <div className="text-[20px] font-bold text-ink leading-snug mt-1">{rec.headline}</div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {rec.viral && <span className="px-2 h-[22px] rounded-full text-[11px] font-bold flex items-center bg-fall/20 text-fall">🔥 The clip is going viral</span>}
          {rec.walked && <span className="px-2 h-[22px] rounded-full text-[11px] font-bold flex items-center bg-fall/20 text-fall">🚪 Walked out</span>}
          <Delta label="Fame" v={rec.deltas.fame} />
          <Delta label="Reputation" v={rec.deltas.rep} />
          <Delta label="Momentum" v={rec.deltas.momentum} />
          <Delta label="Fans" v={rec.deltas.fans} />
          <Delta label="Fee" v={rec.deltas.money} money />
        </div>
      </div>
      <div className="p-5">
        <div className="text-[12px] text-ink3 mb-2">What you said</div>
        <ul className="space-y-1.5">{rec.highlights.map((h, i) => <li key={i} className="text-[13px] text-ink2">“{h}”</li>)}</ul>
        <div className="text-[12px] text-ink3 mt-3">The outlet posted the clip on Clip. People you named have heard about it — check your Activity.</div>
        <Button className="mt-4" onClick={onBack}>Back to interviews</Button>
      </div>
    </div>
  );
}

function LiveInterview({ outlets, onFinished }: { outlets: Outlet[]; onFinished: (r: InterviewRecord) => void }) {
  const ai = useGameStore((s) => s.activeInterview);
  const player = useGameStore((s) => s.player);
  const answer = useGameStore((s) => s.answerInterview);
  const [last, setLast] = useState<{ text: string; passed?: boolean } | null>(null);
  if (!ai || !player) return null;
  const outlet = outlets.find((o) => o.id === ai.outletId);
  const q = ai.questions[ai.idx];
  const fmt = FORMAT_INFO[ai.format as InterviewFormat];
  const stats = { charisma: player.stats.charisma, freestyle: player.stats.freestyle, lyricism: player.stats.lyricism, performance: player.stats.performance };

  return (
    <div className="rounded-[18px] border border-line bg-[#0C0D12] overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center gap-3" style={{ background: outlet ? `linear-gradient(90deg, ${outlet.color}30, transparent)` : undefined }}>
        {outlet && <OutletBadge o={outlet} size={40} />}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink truncate">{ai.outletName}</div>
          <div className="text-[12px] text-ink3 truncate">with {ai.host} · {fmt.emoji} {fmt.label}</div>
        </div>
        <span className="flex items-center gap-1.5 px-2.5 h-[24px] rounded-full bg-fall/20 text-fall text-[11px] font-bold"><span className="w-2 h-2 rounded-full bg-fall rl-live-dot" />ON AIR</span>
      </div>
      <div className="px-4 pt-3 flex gap-1">
        {ai.questions.map((_, i) => <div key={i} className={cn('flex-1 h-1 rounded-full', i < ai.idx ? 'bg-amber' : i === ai.idx ? 'bg-amber/50' : 'bg-white/10')} />)}
      </div>
      <div className="p-4 space-y-3 max-h-[42vh] overflow-y-auto">
        {ai.transcript.map((t, i) => (
          <div key={i} className="space-y-1.5">
            {t.surprise && <div className="text-[11px] font-bold text-fall">{t.surprise}</div>}
            <div className="flex gap-2"><Avatar name={ai.host} seed={ai.host} size={26} /><div className="rounded-[14px] rounded-tl-[4px] bg-white/[0.06] px-3 py-2 text-[13px] text-ink2 max-w-[85%]">{t.q}</div></div>
            <div className="flex justify-end"><div className="rounded-[14px] rounded-tr-[4px] bg-amber/90 text-black px-3 py-2 text-[13px] font-medium max-w-[85%]">{t.a}</div></div>
            {t.reaction && <div className={cn('text-[12px] italic text-center', t.passed === false ? 'text-fall' : t.passed ? 'text-rise' : 'text-ink3')}>{t.reaction}</div>}
          </div>
        ))}
      </div>
      {q && (
        <div className="p-4 border-t border-line">
          {q.surprise && <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 h-[24px] rounded-full bg-fall/20 text-fall text-[11px] font-bold rl-pop">{q.surprise}</div>}
          <div className="flex gap-3 items-start">
            <Avatar name={ai.host} seed={ai.host} size={40} />
            <div className="text-[17px] sm:text-[18px] font-semibold text-ink leading-snug">{q.host}</div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  const r = answer(o.id);
                  setLast({ text: r.reaction, passed: r.passed });
                  if (r.done && r.record) onFinished(r.record);
                }}
                className="text-left rounded-[14px] border border-line bg-card hover:bg-cardhover hover:border-amber/50 p-3 transition"
              >
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <span className={cn('px-1.5 h-[18px] rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center', TAG_CLS[o.tag])}>{o.tag}</span>
                  {o.check && <span className="px-1.5 h-[18px] rounded-full text-[10px] font-semibold flex items-center bg-white/5 text-ink3">🎲 {STAT_LABEL[o.check.stat]} {Math.round(stats[o.check.stat])} vs {o.check.dc}</span>}
                </div>
                <div className="text-[14px] text-ink leading-snug">“{o.text}”</div>
              </button>
            ))}
          </div>
          {last && <div className={cn('mt-3 text-[12px] italic', last.passed === false ? 'text-fall' : last.passed ? 'text-rise' : 'text-ink3')}>{last.text}</div>}
        </div>
      )}
    </div>
  );
}

export function InterviewsScreen() {
  const player = useGameStore((s) => s.player);
  const invites = useGameStore((s) => s.interviewInvites);
  const active = useGameStore((s) => s.activeInterview);
  const log = useGameStore((s) => s.interviewLog);
  const outletRel = useGameStore((s) => s.outletRel);
  const lastPitch = useGameStore((s) => s.lastPitchSerial);
  const gameDate = useGameStore((s) => s.gameDate);
  const desk = useGameStore((s) => s.managerDesk);
  const acceptInterview = useGameStore((s) => s.acceptInterview);
  const declineInterview = useGameStore((s) => s.declineInterview);
  const pitchInterview = useGameStore((s) => s.pitchInterview);
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null);
  const [result, setResult] = useState<InterviewRecord | null>(null);
  const [formatFor, setFormatFor] = useState<Record<string, InterviewFormat>>({});
  const outlets = useMemo(() => (player ? outletsFor(player.country, player.city || player.country) : []), [player?.country, player?.city]);
  if (!player) return null;
  const serial = dateToSerial(gameDate);
  const fame = blendedFame(player);
  const open = (invites ?? []).filter((i) => i.status === 'open');
  const pitchedToday = lastPitch === serial;

  return (
    <div className="max-w-[1100px] mx-auto space-y-5">
      <PageTitle subtitle="Radio, TV, podcasts, blogs — every answer moves something.">Interviews</PageTitle>
      {flash && <div className={cn('rounded-[12px] px-4 py-2.5 text-[13px]', flash.ok ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall')}>{flash.message}</div>}

      {result ? <Results rec={result} onBack={() => setResult(null)} />
        : active ? <LiveInterview outlets={outlets} onFinished={(r) => { setResult(r); setFlash(null); }} />
        : (
          <>
            <section>
              <h2 className="text-[16px] font-semibold text-ink mb-2">Invitations {open.length > 0 && <span className="text-amber">· {open.length}</span>}</h2>
              {open.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-line p-5 text-[13px] text-ink3">No invitations right now. Release something, start something, or get hot — the phone rings more when people are talking about you. Or pitch yourself below.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {open.map((inv) => {
                    const o = outlets.find((x) => x.id === inv.outletId);
                    if (!o) return null;
                    const f = FORMAT_INFO[inv.format as InterviewFormat];
                    const brief = (desk ?? []).find((b) => b.refId === inv.id);
                    return (
                      <div key={inv.id} className="rounded-[16px] border border-line bg-card p-4">
                        <div className="flex items-start gap-3">
                          <OutletBadge o={o} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-semibold text-ink leading-snug">{o.name}</div>
                            <div className="text-[12px] text-ink3">with {o.host} · {compact(o.reach)} listeners</div>
                          </div>
                          <span className="text-[11px] text-ink3 shrink-0">{Math.max(0, inv.expiresSerial - serial)}d left</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="px-2 h-[22px] rounded-full text-[11px] font-semibold flex items-center bg-white/[0.06] text-ink">{f.emoji} {f.label}</span>
                          <span className={cn('px-2 h-[22px] rounded-full text-[11px] font-semibold flex items-center', f.risk === 'High' ? 'bg-fall/15 text-fall' : f.risk === 'Medium' ? 'bg-amber/15 text-amber' : 'bg-rise/15 text-rise')}>Risk: {f.risk}</span>
                          {inv.fee > 0 && <span className="px-2 h-[22px] rounded-full text-[11px] font-semibold flex items-center bg-rise/15 text-rise">${inv.fee.toLocaleString()}</span>}
                        </div>
                        <div className="text-[13px] text-ink2 mt-2 leading-snug">{inv.reason}</div>
                        {brief && <div className="mt-2 text-[12px] text-ink3">📋 Manager: “{brief.reason}”</div>}
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" disabled={player.energy < ENERGY_COSTS.interview} onClick={() => setFlash(acceptInterview(inv.id))}>Go on air · ⚡{ENERGY_COSTS.interview}</Button>
                          <Button size="sm" variant="ghost" onClick={() => declineInterview(inv.id)}>Decline</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between mb-2">
                <h2 className="text-[16px] font-semibold text-ink">Pitch yourself</h2>
                <span className="text-[12px] text-ink3">{pitchedToday ? 'You pitched today — try again tomorrow.' : 'One pitch a day. A manager opens doors.'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {outlets.map((o) => {
                  const locked = fame < o.minFame - 10;
                  const rel = outletRel?.[o.id] ?? 0;
                  const fmt = formatFor[o.id] ?? o.formats[0];
                  return (
                    <div key={o.id} className={cn('rounded-[14px] border border-line bg-card p-3 flex flex-col', locked && 'opacity-55')}>
                      <div className="flex items-center gap-2.5">
                        <OutletBadge o={o} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-ink truncate">{o.name}</div>
                          <div className="text-[11px] text-ink3 truncate">{o.kind} · {compact(o.reach)} · {o.vibe}{o.international ? ' · abroad' : ''}</div>
                        </div>
                        {rel !== 0 && <span className={cn('text-[11px] font-semibold', rel > 0 ? 'text-rise' : 'text-fall')}>{rel > 0 ? '♥' : '✕'} {Math.abs(Math.round(rel))}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {o.formats.map((f) => (
                          <button key={f} onClick={() => setFormatFor((m) => ({ ...m, [o.id]: f }))} className={cn('px-2 h-[22px] rounded-full text-[10px] font-semibold border', fmt === f ? 'border-amber text-amber bg-amber/10' : 'border-line text-ink3')}>{FORMAT_INFO[f].emoji} {FORMAT_INFO[f].label}</button>
                        ))}
                      </div>
                      <div className="mt-auto pt-3">
                        {locked ? <div className="text-[11px] text-ink3">Books artists around fame {o.minFame}.</div>
                          : <Button size="sm" variant="secondary" disabled={pitchedToday || player.energy < ENERGY_COSTS.interview} onClick={() => setFlash(pitchInterview(o.id, fmt))}>Pitch</Button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {(log ?? []).length > 0 && (
              <section>
                <h2 className="text-[16px] font-semibold text-ink mb-2">Past interviews</h2>
                <div className="space-y-2">
                  {(log ?? []).map((r) => (
                    <div key={r.id} className="rounded-[14px] border border-line bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-ink leading-snug">{r.headline}</div>
                          <div className="text-[11px] text-ink3 mt-0.5">{r.outletName} · {FORMAT_INFO[r.format as InterviewFormat]?.label} · {serial - r.serial === 0 ? 'today' : `${serial - r.serial}d ago`}</div>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">{r.viral && <span className="text-[11px]">🔥</span>}{r.walked && <span className="text-[11px]">🚪</span>}</div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2"><Delta label="Fame" v={r.deltas.fame} /><Delta label="Rep" v={r.deltas.rep} /><Delta label="Fans" v={r.deltas.fans} /><Delta label="Fee" v={r.deltas.money} money /></div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
    </div>
  );
}
