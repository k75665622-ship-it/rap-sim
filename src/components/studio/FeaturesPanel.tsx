// ─── STUDIO: FEATURES ──────────────────────────────────────────────────────
// Every verse deal in one place. Songs other artists sent you land here the
// moment you agree: open one, add your verse, and it goes on their record.
// Below, the verses you've paid for and are waiting on — with what to do
// when they're late, or never come.

import { useState } from 'react';
import { useGameStore, VERSE_EFFORT } from '../../store/gameStore';
import { Button, Artwork } from '../ui/kit';
import { Avatar } from '../social/shared';
import { cn } from '@/utils/cn';
import { dateToSerial } from '../../sim/gameClock';
import { inboundVerseQuality } from '../../sim/inbound';
import { gradeLabel } from '../../sim/studio';
import { TERMS_LABEL } from '../../sim/deals';
import type { InboundRequest, FeatureRequest } from '../../types/game';

type Effort = keyof typeof VERSE_EFFORT;

function dueText(daysLeft: number): { text: string; cls: string } {
  if (daysLeft < 0) return { text: `${-daysLeft} day${daysLeft === -1 ? '' : 's'} late`, cls: 'text-fall' };
  if (daysLeft === 0) return { text: 'Due today', cls: 'text-amber' };
  return { text: `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, cls: daysLeft <= 4 ? 'text-amber' : 'text-ink3' };
}

export function FeaturesPanel() {
  const inbound = useGameStore((s) => s.inboundRequests);
  const outbound = useGameStore((s) => s.featureRequests);
  const gameDate = useGameStore((s) => s.gameDate);
  const setScreen = useGameStore((s) => s.setScreen);
  const today = dateToSerial(gameDate);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);

  const mine = inbound.filter((r) => r.status === 'agreed' || (r.status === 'delivered' && (r.balanceDue ?? 0) > 0)).sort((a, b) => (a.dueSerial ?? 0) - (b.dueSerial ?? 0));
  const done = inbound.filter((r) => r.status === 'delivered' && !(r.balanceDue ?? 0)).slice(-4).reverse();
  const asks = inbound.filter((r) => r.status === 'open');
  const theirs = outbound.filter((r) => r.status === 'paid_waiting' || r.status === 'verse_ready' || r.status === 'terms' || r.status === 'sent');

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-[18px] border border-line p-5" style={{ background: 'radial-gradient(120% 140% at 0% 0%, rgba(123,97,255,0.2), rgba(10,11,16,0) 60%), #14161e' }}>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-re">Features</div>
        <div className="text-[22px] font-bold text-ink mt-1">Verse deals</div>
        <div className="text-[13px] text-ink2 mt-1">Songs you agreed to jump on are here — add your verse before the deadline. Verses you paid for show below; if someone takes your money and goes quiet, chase them, ask for it back, or take it to court.</div>
        {asks.length > 0 && <button onClick={() => setScreen('mailbox')} className="mt-3 inline-flex items-center gap-2 h-8 px-3 rounded-full bg-amber/15 border border-amber/40 text-amber text-[12px] font-semibold">📬 {asks.length} new ask{asks.length > 1 ? 's' : ''} waiting for your answer in the Mailbox →</button>}
      </div>

      {msg && <div className={cn('rounded-[12px] border px-4 py-2.5 text-[13px]', msg.ok ? 'border-rise/40 text-rise bg-rise/5' : 'border-fall/40 text-fall bg-fall/5')}>{msg.message}</div>}

      <section>
        <h2 className="text-[16px] font-semibold text-ink mb-2">Your verses to write</h2>
        {mine.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line p-6 text-[13px] text-ink3">Nothing owed. When you agree to a feature in your DMs or Mailbox, the song lands here.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">{mine.map((r) => <InboundCard key={r.id} r={r} today={today} onMsg={setMsg} />)}</div>
        )}
        {done.length > 0 && <div className="mt-3 text-[12px] text-ink3">Recently delivered: {done.map((r) => `"${r.npcSongTitle}" (${r.npcName})`).join(' · ')}</div>}
      </section>

      <section>
        <h2 className="text-[16px] font-semibold text-ink mb-2">Verses coming to you</h2>
        {theirs.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-line p-6 text-[13px] text-ink3">You aren't waiting on anyone. Ask for a feature from a song's Features step.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">{theirs.map((r) => <OutboundCard key={r.id} r={r} today={today} onMsg={setMsg} />)}</div>
        )}
      </section>
    </div>
  );
}

function InboundCard({ r, today, onMsg }: { r: InboundRequest; today: number; onMsg: (m: { ok: boolean; message: string }) => void }) {
  const player = useGameStore((s) => s.player);
  const work = useGameStore((s) => (s.workItems ?? []).find((w) => w.kind === 'verse' && (w.payload as { requestId?: string }).requestId === r.id));
  const send = useGameStore((s) => s.sendInboundVerse);
  const refund = useGameStore((s) => s.refundInbound);
  const chase = useGameStore((s) => s.chaseBalance);
  const setScreen = useGameStore((s) => s.setScreen);
  const [open, setOpen] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  if (!player) return null;
  const base = inboundVerseQuality(player.stats);
  const due = dueText((r.dueSerial ?? today) - today);
  const paid = r.paidSoFar ?? 0;
  const fee = r.agreedFee ?? 0;
  const delivered = r.status === 'delivered';
  const owedDays = delivered ? today - (r.deliveredSerial ?? today) : 0;
  return (
    <div className="rounded-[16px] border border-line bg-card p-4">
      <div className="flex gap-3">
        <Artwork seed={r.npcSongId} title={r.npcSongTitle} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-ink truncate">{r.npcSongTitle}</div>
          <div className="text-[12px] text-ink2 flex items-center gap-1.5 mt-0.5"><Avatar name={r.npcName} seed={r.npcId} size={18} />{r.npcName} <span className="text-ink3">feat. you</span></div>
          <div className="text-[11px] text-ink3 mt-1">{r.payTerms === 'trade' ? `${TERMS_LABEL.trade} · the beat is in your library` : fee > 0 ? `$${fee.toLocaleString()} · ${TERMS_LABEL[r.payTerms ?? 'half']}` : TERMS_LABEL.free}{paid > 0 && r.payTerms !== 'trade' ? ` · $${paid.toLocaleString()} received` : ''}</div>
        </div>
      </div>
      {delivered ? (
        <div className="mt-3 rounded-[12px] bg-sidebar border border-line px-3 py-2.5 text-[12px]">
          <div className="text-ink">Delivered {owedDays} day{owedDays === 1 ? '' : 's'} ago. <span className="text-amber">${(r.balanceDue ?? 0).toLocaleString()} still owed to you.</span></div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Button size="sm" variant="secondary" onClick={() => onMsg(chase(r.id))}>Ask for the money</Button>
            {r.caseId ? <Button size="sm" variant="ghost" onClick={() => setScreen('court')}>View the case →</Button> : owedDays >= 14 && <Button size="sm" variant="ghost" onClick={() => setScreen('court')}>⚖️ Sue for it</Button>}
          </div>
          {owedDays < 14 && !r.caseId && <div className="text-[11px] text-ink3 mt-1.5">You can take it to court {14 - owedDays} days from now if it still hasn't come.</div>}
        </div>
      ) : work ? (
        <div className="mt-3">
          <div className="flex justify-between text-[12px] text-ink2 mb-1"><span>Writing your verse…</span><span>{work.daysTotal - work.daysDone}d left</span></div>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden"><div className="h-full bg-re" style={{ width: `${Math.round((work.daysDone / Math.max(1, work.daysTotal)) * 100)}%` }} /></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mt-3">
            <span className={cn('text-[12px] font-semibold', due.cls)}>{due.text}</span>
            {r.refundDemanded && <span className="text-[11px] text-fall">{r.payTerms === 'trade' ? 'They want paying for the beat' : 'They want their money back'}</span>}
          </div>
          {open ? (
            <div className="mt-2.5 space-y-1.5">
              {(Object.keys(VERSE_EFFORT) as Effort[]).map((k) => {
                const E = VERSE_EFFORT[k];
                const q = Math.max(10, Math.min(100, base + E.quality));
                const days = k === 'quick' ? 1 : 2 + Math.round(player.stats.songwriting / 40) + E.days;
                return (
                  <button key={k} onClick={() => { const res = send(r.id, k); onMsg(res); if (res.ok) setOpen(false); }} className="w-full flex items-center gap-3 rounded-[12px] border border-line bg-sidebar hover:border-re/60 px-3 py-2.5 text-left">
                    <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-ink">{E.label}</div><div className="text-[11px] text-ink3">{days} day{days > 1 ? 's' : ''} · reads {gradeLabel(q)}</div></div>
                    <span className="text-[13px] font-bold text-ink num">{q}</span>
                  </button>
                );
              })}
              <button onClick={() => setOpen(false)} className="text-[12px] text-ink3">Back</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <Button size="sm" onClick={() => setOpen(true)}>🎙️ Add your verse</Button>
              {confirmRefund ? (
                <><Button size="sm" variant="secondary" onClick={() => { onMsg(refund(r.id)); setConfirmRefund(false); }}>{r.payTerms === 'trade' ? `Pay $${paid.toLocaleString()}` : paid > 0 ? `Refund $${paid.toLocaleString()}` : 'Call it off'}</Button><Button size="sm" variant="ghost" onClick={() => setConfirmRefund(false)}>Keep it</Button></>
              ) : <Button size="sm" variant="ghost" onClick={() => setConfirmRefund(true)}>{r.payTerms === 'trade' ? `Pay $${paid.toLocaleString()} for the beat & back out` : paid > 0 ? 'Refund & back out' : 'Back out'}</Button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OutboundCard({ r, today, onMsg }: { r: FeatureRequest; today: number; onMsg: (m: { ok: boolean; message: string }) => void }) {
  const chase = useGameStore((s) => s.chaseVerse);
  const refund = useGameStore((s) => s.askVerseRefund);
  const addVerse = useGameStore((s) => s.addFeatureVerse);
  const setScreen = useGameStore((s) => s.setScreen);
  const song = useGameStore((s) => s.songs.find((x) => x.id === r.songId));
  const late = r.status === 'paid_waiting' ? today - (r.verseDueSerial ?? today) : 0;
  const status = r.status === 'sent' ? { t: `Waiting for an answer (by ${r.dueDate})`, c: 'text-ink3' }
    : r.status === 'terms' ? { t: `They want $${r.fee.toLocaleString()} — answer in the Mailbox`, c: 'text-amber' }
      : r.status === 'verse_ready' ? { t: 'Verse is in', c: 'text-rise' }
        : late > 0 ? { t: `${late} day${late > 1 ? 's' : ''} late`, c: 'text-fall' } : { t: dueText((r.verseDueSerial ?? today) - today).text, c: 'text-ink3' };
  return (
    <div className="rounded-[16px] border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={r.npcName} seed={r.npcId} size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink truncate">{r.npcName} on "{r.songTitle}"</div>
          <div className="text-[11px] text-ink3">{r.freeVerse ? 'Free verse' : r.paid ? `Paid $${r.fee.toLocaleString()}` : r.fee ? `$${r.fee.toLocaleString()} asked` : ''}</div>
        </div>
        <span className={cn('text-[11px] font-bold text-right', status.c)}>{status.t}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {r.status === 'verse_ready' && (song && song.masterStatus !== 'released'
          ? <Button size="sm" onClick={() => onMsg(addVerse(r.id) ? { ok: true, message: `${r.npcName}'s verse is on "${r.songTitle}".` } : { ok: false, message: 'Not enough energy to cut it in right now.' })}>Cut it into "{r.songTitle}"</Button>
          : <span className="text-[12px] text-ink3">The song is already out — the verse can't go on it.</span>)}
        {r.status === 'terms' && <Button size="sm" variant="secondary" onClick={() => setScreen('mailbox')}>Open their terms</Button>}
        {r.status === 'paid_waiting' && (
          <>
            <Button size="sm" variant="secondary" onClick={() => onMsg(chase(r.id))}>Chase them</Button>
            {late > 0 && !r.refundAsked && <Button size="sm" variant="secondary" onClick={() => onMsg(refund(r.id))}>Ask for a refund</Button>}
            {r.caseId ? <Button size="sm" variant="ghost" onClick={() => setScreen('court')}>View the case →</Button> : late >= 7 && <Button size="sm" variant="ghost" onClick={() => setScreen('court')}>⚖️ Take them to court</Button>}
          </>
        )}
      </div>
      {r.status === 'paid_waiting' && late > 0 && late < 7 && !r.caseId && <div className="text-[11px] text-ink3 mt-1.5">If it's still not here in {7 - late} days, you can sue.</div>}
    </div>
  );
}
