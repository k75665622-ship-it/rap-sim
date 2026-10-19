// ─── SOMEBODY WANTS YOU ON THEIR RECORD ────────────────────────────────────
//
// The panel that answers "I am famous now and nobody has asked me for a verse".
//
// It is deliberately NOT the outbound negotiation with the colours swapped. The
// player is being paid here, so the numbers run the other way and so does the
// risk: you can price yourself out of a record that would have been good for
// you, and the one thing that would tell you where the line is — what the verse
// is worth to THEM — is the one thing you cannot see. That is what the manager
// button is for, and why it is the first thing on the panel rather than a
// footnote.
//
// Everything shown here comes out of saved state. The manager's read is a
// snapshot taken when the player asked for it, so the number they acted on is
// the number they can still read back after a reload.

import { TERMS_LABEL } from '../../sim/deals';
import { useState } from 'react';
import { useGameStore, blendedFame } from '../../store/gameStore';
import { Button, Badge } from '../ui/Card';
import { MAX_NEGOTIATION_ROUNDS } from '../../sim/features';
import { playerVerseRate } from '../../sim/inbound';
import type { InboundRequest } from '../../types/game';

/** A confidence bar, because "0.62" means nothing to anybody. */
function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.75) return { text: 'They know this room', color: 'text-green-400' };
  if (c >= 0.5) return { text: 'A reasonable read', color: 'text-yellow-400' };
  return { text: 'They are guessing', color: 'text-red-400' };
}

export function InboundAskPanel({ request }: { request: InboundRequest }) {
  const {
    player,
    readInboundWithManager,
    quoteInboundVerse,
    acceptInboundOffer,
    declineInboundRequest,
    acceptFreeAsk,
    openStudioAt,
  } = useGameStore();

  const [askDraft, setAskDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const r = request;
  const read = r.managerRead;
  const round = r.negotiationRound ?? 0;
  const roundsLeft = Math.max(0, MAX_NEGOTIATION_ROUNDS - round);
  const myRate = player ? playerVerseRate(blendedFame(player)) : 0;
  const settled = r.status !== 'open';

  const take = () => {
    const res = acceptInboundOffer(r.id);
    setNotice(res.message);
  };

  const quote = () => {
    const n = Number(askDraft.replace(/[^0-9]/g, ''));
    if (!n) {
      setNotice('Type the number you want to ask for.');
      return;
    }
    const res = quoteInboundVerse(r.id, n);
    setNotice(res.message);
    if (res.ok) setAskDraft('');
  };

  const pass = () => {
    const res = declineInboundRequest(r.id);
    setNotice(res.message);
  };

  const free = () => {
    const res = acceptFreeAsk(r.id);
    setNotice(res.message);
  };

  const readWithManager = () => {
    const res = readInboundWithManager(r.id);
    setNotice(res.message);
  };

  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-purple-300 font-bold text-sm">🎤 They want you on their record</h3>
        <Badge color={settled ? 'green' : 'purple'}>
          {r.status === 'open' ? 'Open' : r.status === 'agreed' ? 'Agreed' : r.status === 'delivered' ? 'Delivered' : r.status === 'declined' ? 'Passed' : 'They walked'}
        </Badge>
      </div>

      {/* ── The record and the number ─────────────────────────────────── */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Artist</span>
          <span className="text-white font-medium text-right">{r.npcName}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Their record</span>
          <span className="text-white font-medium text-right">
            “{r.npcSongTitle}”
            <span className="text-gray-500 font-normal"> · reads {Math.round(r.songQuality)}</span>
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Asked on</span>
          <span className="text-white text-right">{r.sentDate}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">{settled ? 'Settled at' : 'On the table'}</span>
          <span className="text-yellow-400 font-bold text-right">
            ${(r.agreedFee ?? r.offer).toLocaleString()}
            {r.offer !== r.openingOffer && (
              <span className="text-green-400 font-normal">
                {' '}(up from ${r.openingOffer.toLocaleString()})
              </span>
            )}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Your going rate</span>
          <span className="text-gray-300 text-right">${myRate.toLocaleString()}</span>
        </div>
      </div>

      {/* What they actually said is the letter itself, printed above this panel
          by the Mailbox. Repeating it here would be the same paragraph twice. */}

      {/* ── The manager's read ────────────────────────────────────────── */}
      {!settled && (
        <div className="bg-black/30 rounded-lg p-3 space-y-2">
          {!read ? (
            <>
              <p className="text-xs text-gray-400">
                You do not know what this verse is worth to them. Nobody does until they say yes or no.
              </p>
              <Button size="sm" variant="secondary" onClick={readWithManager}>
                {player ? '📞 Ask your manager' : '🤔 Read the record yourself'}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-bold text-white">
                  {read.managerName === 'Nobody' ? 'Your own read' : `${read.managerName}'s read`}
                </h4>
                <span className={`text-xs ${confidenceLabel(read.confidence).color}`}>
                  {confidenceLabel(read.confidence).text}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-gray-500">The record — </span>
                  <span className="text-gray-200">{read.trackVerdict}</span>
                </div>
                <div>
                  <span className="text-gray-500">The artist — </span>
                  <span className="text-gray-200">{read.artistRead}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1">
                  <span className="text-gray-400">Ask for</span>
                  <span className="text-yellow-400 font-bold">${read.recommendedFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">They will go to about</span>
                  <span className="text-gray-300">${read.estimatedCeiling.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-purple-200 pt-1">{read.advice}</p>

              {read.pass && (
                <p className="text-xs text-red-300">
                  They think you should leave this one. You can still take it — it is your career.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── What you can do ───────────────────────────────────────────── */}
      {r.status === 'open' && (
        <div className="space-y-3">
          {round > 0 && (
            <p className="text-xs text-gray-400">
              {round} push{round === 1 ? '' : 'es'} so far.{' '}
              {roundsLeft > 0
                ? `${roundsLeft} left before they stop answering.`
                : 'That was the last one.'}
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            {r.offer > 0 ? (
              <Button variant="gold" size="sm" onClick={take}>
                Take ${r.offer.toLocaleString()}
              </Button>
            ) : (
              <Button variant="gold" size="sm" onClick={free}>
                Do it for the love
              </Button>
            )}
            {roundsLeft > 0 && (
              <>
                <input
                  value={askDraft}
                  onChange={(e) => setAskDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') quote(); }}
                  placeholder="Name your price…"
                  inputMode="numeric"
                  className="w-36 bg-black/40 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
                <Button variant="primary" size="sm" onClick={quote} disabled={!askDraft.trim()}>
                  Ask for it
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={pass}>
              Pass
            </Button>
          </div>

          {read && (
            <button
              type="button"
              className="text-xs text-yellow-400 hover:text-yellow-300 underline"
              onClick={() => setAskDraft(String(read.recommendedFee))}
            >
              Use the ${read.recommendedFee.toLocaleString()} they suggested
            </button>
          )}
        </div>
      )}

      {/* ── Agreed: go and write it ───────────────────────────────────── */}
      {r.status === 'agreed' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-300">
            {(r.agreedFee ?? 0) > 0
              ? <>Deal: ${(r.agreedFee ?? 0).toLocaleString()} — {TERMS_LABEL[r.payTerms ?? 'half'].toLowerCase()}. {(r.paidSoFar ?? 0) > 0 ? `$${(r.paidSoFar ?? 0).toLocaleString()} has been paid to you.` : 'Nothing has been paid yet.'}</>
              : 'No fee — you\'re doing it for the love.'}{' '}
            The song is in your studio. Add your verse there.
          </p>
          <Button variant="gold" size="sm" onClick={() => openStudioAt('guest')}>
            🎙️ Open in Studio → Features
          </Button>
        </div>
      )}

      {r.status === 'delivered' && (
        <p className="text-xs text-green-300">
          Done. Your verse is on “{r.npcSongTitle}”.{(r.balanceDue ?? 0) > 0 ? ` $${(r.balanceDue ?? 0).toLocaleString()} is still owed to you.` : (r.agreedFee ?? 0) > 0 ? ' Paid in full.' : ''}
        </p>
      )}
      {r.status === 'withdrawn' && (
        <p className="text-xs text-red-300">
          {r.lapsed && r.agreedFee === undefined && !r.agreedDate
            ? `You never answered, so ${r.npcName} gave the verse to someone else.`
            : r.lapsed
            ? ((r.paidSoFar ?? 0) > 0 ? `You never sent it. ${r.npcName} paid $${(r.paidSoFar ?? 0).toLocaleString()} for that verse and gave up waiting.` : `You never sent it, and ${r.npcName} moved on.`)
            : 'They walked away from your number. The record goes out without you.'}
        </p>
      )}
      {r.status === 'declined' && (
        <p className="text-xs text-gray-400">You passed on this one.</p>
      )}

      {notice && (
        <p className="text-xs text-white bg-purple-500/20 border border-purple-500/30 rounded-lg p-2">
          {notice}
        </p>
      )}
    </div>
  );
}
