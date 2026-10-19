// ─── AWARDS ────────────────────────────────────────────────────────────────
// Every award body's calendar, its nominations and winners, fan voting, your
// campaign — and whether you're going to the night.

import { useMemo, useState } from 'react';
import { useGameStore, type AwardSeason } from '../../store/gameStore';
import { Button } from '../ui/kit';
import { Avatar } from '../social/shared';
import { cn } from '@/utils/cn';
import { dateToSerial } from '../../sim/gameClock';
import { awardBodies, nextCalendar, voteShare, type AwardBody } from '../../sim/awardSeasons';

const fmtDay = (serial: number) => new Date(serial * 86400000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const SCOPE: Record<AwardBody['scope'], string> = { country: 'National', continental: 'Africa', global: 'Global' };

function phaseOf(s: AwardSeason | undefined, today: number, body: AwardBody): { text: string; cls: string } {
  const cal = s?.cal ?? nextCalendar(body, today);
  if (!s || s.phase === 'upcoming') return { text: `Nominations in ${cal.nominations - today} days`, cls: 'text-ink3' };
  if (s.phase === 'nominations') {
    if (today === cal.ceremony) return { text: 'Tonight · 7:00 PM', cls: 'text-amber' };
    return { text: `${today <= cal.votingCloses && s.categories.some((c) => c.fanVote) ? 'Voting open · ' : ''}ceremony in ${cal.ceremony - today} days`, cls: 'text-rise' };
  }
  return { text: 'Winners announced', cls: 'text-ink2' };
}

export function AwardsScreen() {
  const player = useGameStore((s) => s.player);
  const seasons = useGameStore((s) => s.awardSeasons);
  const follows = useGameStore((s) => s.awardFollows);
  const follow = useGameStore((s) => s.followAward);
  const gameDate = useGameStore((s) => s.gameDate);
  const awards = useGameStore((s) => s.awards);
  const today = dateToSerial(gameDate);
  const bodies = useMemo(() => awardBodies(player?.country ?? 'Ghana'), [player?.country]);
  const [open, setOpen] = useState<string | null>(null);
  if (!player) return null;
  const latest = (b: AwardBody) => {
    const all = Object.values(seasons ?? {}).filter((s) => s.bodyId === b.id).sort((x, y) => y.year - x.year);
    // The live season if there is one, else the last one finished.
    return all.find((s) => s.phase !== 'done') ?? all[0];
  };
  const myNoms = Object.values(seasons ?? {}).filter((s) => s.phase === 'nominations').flatMap((s) => s.categories.filter((c) => c.nominees.some((n) => n.isPlayer)).map((c) => ({ s, c })));
  const wins = awards.filter((a) => a.winner === player.id);
  const next = bodies.map((b) => ({ b, cal: latest(b)?.phase === 'nominations' ? latest(b)!.cal : nextCalendar(b, today) })).sort((x, y) => x.cal.ceremony - y.cal.ceremony)[0];
  const openSeason = open ? (seasons ?? {})[open] : undefined;

  return (
    <div className="max-w-[920px] mx-auto space-y-4 pb-12">
      <div className="rounded-[20px] border border-line p-5 overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 100% 0%, rgba(255,184,0,0.25), rgba(10,11,16,0) 60%), linear-gradient(135deg, #18140a, #14161e)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-amber">Award season</div>
            <h1 className="text-[26px] font-bold text-ink leading-tight mt-1">Awards</h1>
            <div className="text-[13px] text-ink2 mt-1">{next ? `Next: ${next.b.name} — ${fmtDay(next.cal.ceremony)} (${next.cal.ceremony - today} days)` : ''}</div>
          </div>
          <div className="text-right">
            <div className="text-[30px] font-black text-amber num leading-none">{wins.length}</div>
            <div className="text-[11px] text-ink3">award{wins.length === 1 ? '' : 's'} won</div>
          </div>
        </div>
        {myNoms.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">{myNoms.map(({ s, c }) => <button key={s.key + c.id} onClick={() => setOpen(s.key)} className="h-7 px-2.5 rounded-full bg-amber/15 border border-amber/40 text-amber text-[11px] font-semibold">🏆 Nominated: {c.name}</button>)}</div>
        )}
      </div>

      {openSeason ? <SeasonView s={openSeason} body={bodies.find((b) => b.id === openSeason.bodyId)!} onBack={() => setOpen(null)} /> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {bodies.map((b) => {
            const s = latest(b);
            const ph = phaseOf(s?.phase === 'done' && nextCalendar(b, today).year !== s.year ? undefined : s, today, b);
            const cal = s && s.phase !== 'done' ? s.cal : nextCalendar(b, today);
            const on = (follows ?? []).includes(b.id);
            const mine = s?.categories.filter((c) => c.nominees.some((n) => n.isPlayer)).length ?? 0;
            return (
              <div key={b.id} className="rounded-[16px] border border-line bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="text-[30px] leading-none">{b.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-ink">{b.name}</div>
                    <div className="text-[11px] text-ink3">{SCOPE[b.scope]} · {b.venue}, {b.city}</div>
                  </div>
                  <button onClick={() => follow(b.id, !on)} title={on ? 'Following — you get notifications' : 'Follow for nominations and winners'} className={cn('h-8 px-2.5 rounded-full border text-[12px] font-semibold shrink-0', on ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink3')}>{on ? '🔔 Following' : '🔕 Follow'}</button>
                </div>
                <div className="mt-3 text-[12px] text-ink2">{fmtDay(cal.ceremony)}</div>
                <div className={cn('text-[12px] font-semibold', ph.cls)}>{ph.text}{mine ? ` · ${mine} nomination${mine > 1 ? 's' : ''} for you` : ''}</div>
                {s && s.phase !== 'upcoming' && <Button size="sm" variant="secondary" className="mt-3" onClick={() => setOpen(s.key)}>{s.phase === 'done' ? 'See the winners' : 'Nominees & voting'}</Button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeasonView({ s, body, onBack }: { s: AwardSeason; body: AwardBody; onBack: () => void }) {
  const today = useGameStore((st) => dateToSerial(st.gameDate));
  const money = useGameStore((st) => st.player?.career.money ?? 0);
  const campaign = useGameStore((st) => st.campaignAward);
  const rally = useGameStore((st) => st.rallyVotes);
  const rsvp = useGameStore((st) => st.rsvpAward);
  const openArtist = useGameStore((st) => st.openArtist);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const nominated = s.categories.some((c) => c.nominees.some((n) => n.isPlayer));
  const voting = s.phase === 'nominations' && today <= s.cal.votingCloses;
  const fanCat = s.categories.find((c) => c.fanVote && c.nominees.some((n) => n.isPlayer));
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-[13px] text-ink2 hover:text-ink">← All awards</button>
      <div className="rounded-[18px] border border-line bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="text-[36px]">{body.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[20px] font-bold text-ink">{body.name} {s.year}</div>
            <div className="text-[12px] text-ink3">{fmtDay(s.cal.ceremony)} · 7:00 PM · {body.venue}, {body.city}</div>
            <div className="text-[11px] text-ink3">Eligible: releases from {fmtDay(s.cal.windowStart)} to {fmtDay(s.cal.windowEnd)}</div>
          </div>
        </div>
        {msg && <div className={cn('mt-3 rounded-[12px] border px-3 py-2 text-[12px]', msg.ok ? 'border-rise/40 text-rise' : 'border-fall/40 text-fall')}>{msg.message}</div>}
        {s.phase === 'nominations' && (
          <div className="mt-4 grid sm:grid-cols-2 gap-2.5">
            <div className="rounded-[12px] border border-line bg-sidebar p-3">
              <div className="text-[12px] font-semibold text-ink">The night</div>
              <div className="text-[11px] text-ink3 mt-0.5">{s.invite === 'performer' ? 'You\'re invited to perform.' : s.invite === 'invited' ? 'You\'re on the guest list.' : s.invite === 'ticket' ? 'You have a ticket.' : `Not invited — tickets are $${body.ticket.toLocaleString()}.`}</div>
              <div className="mt-2">{s.rsvp ? <div className="flex items-center gap-2"><span className="text-[12px] text-rise font-semibold">You're going</span><button className="text-[11px] text-ink3" onClick={() => setMsg(rsvp(s.key, false))}>Can't make it</button></div> : <Button size="sm" disabled={!s.invite && money < body.ticket} onClick={() => setMsg(rsvp(s.key, true))}>{s.invite ? 'I\'ll be there' : `Buy a ticket · $${body.ticket.toLocaleString()}`}</Button>}</div>
            </div>
            {nominated && (
              <div className="rounded-[12px] border border-line bg-sidebar p-3">
                <div className="text-[12px] font-semibold text-ink">Campaign <span className="text-ink3 font-normal">· spent ${s.campaign.spent.toLocaleString()}</span></div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Button size="sm" variant="secondary" onClick={() => setMsg(campaign(s.key, 'radio'))}>Radio · $1.5K</Button>
                  <Button size="sm" variant="secondary" onClick={() => setMsg(campaign(s.key, 'press'))}>Press · $6K</Button>
                  <Button size="sm" variant="secondary" onClick={() => setMsg(campaign(s.key, 'full'))}>Full push · $20K</Button>
                </div>
                {fanCat && voting && <Button size="sm" className="mt-2" onClick={() => setMsg(rally(s.key))}>🗳️ Rally your fans (post)</Button>}
              </div>
            )}
          </div>
        )}
        {s.night && s.phase === 'done' && s.night[0] === 'You were in the room.' && <div className="mt-3 text-[12px] text-amber">You were in the room.</div>}
      </div>

      {s.categories.map((c) => {
        const winner = c.nominees.find((n) => n.id === c.winnerId);
        return (
          <div key={c.id} className={cn('rounded-[16px] border bg-card p-4', winner?.isPlayer ? 'border-amber/60' : 'border-line')}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-[14px] font-bold text-ink">{c.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-ink3">{c.fanVote ? (voting ? 'Public vote open' : 'Public vote') : 'Academy'}</div>
            </div>
            <div className="mt-2 space-y-1.5">
              {c.nominees.map((n) => {
                const won = n.id === c.winnerId;
                const share = c.fanVote ? voteShare(c, n.id) : 0;
                return (
                  <div key={n.id + (n.songId ?? '')} className={cn('flex items-center gap-2.5 rounded-[12px] px-2.5 py-2', won ? 'bg-amber/12 border border-amber/40' : n.isPlayer ? 'bg-white/[0.04] border border-white/10' : '')}>
                    <button onClick={() => !n.isPlayer && openArtist(n.id)} className="shrink-0"><Avatar name={n.name} seed={n.isPlayer ? 'player' : n.id} size={32} /></button>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-ink truncate">{won && '🏆 '}{n.name}{n.isPlayer ? ' (you)' : ''}</div>
                      {n.work && <div className="text-[11px] text-ink3 truncate">"{n.work}"</div>}
                      {c.fanVote && s.phase !== 'upcoming' && <div className="h-1 rounded-full bg-white/10 mt-1 overflow-hidden"><div className={cn('h-full rounded-full', n.isPlayer ? 'bg-amber' : 'bg-white/40')} style={{ width: `${share}%` }} /></div>}
                    </div>
                    {c.fanVote && <span className="text-[11px] text-ink3 num shrink-0">{share}%</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
