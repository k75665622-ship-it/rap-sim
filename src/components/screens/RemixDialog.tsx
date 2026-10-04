// ─── REMIX DIALOG ──────────────────────────────────────────────────────────
// Reworking a record that is already out.
//
// This is deliberately separate from the vault's "re-record" panel, because it
// is a different real-life move. A re-record is another go at something nobody
// has heard; a remix is a new reading of something the world already knows, and
// the whole point of it is the audience the original built. So the dialog says
// what it is inheriting — the original's lifetime units and its age — before
// the player commits, and it is honest when the answer is "almost nothing".

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Card';
import { FeaturePicker } from '../studio/FeatureShop';
import { cn } from '@/utils/cn';
import { crewBonuses } from '../../sim/roles';
import { roomProductionBonus } from '../../sim/room';
import { ENERGY_COSTS } from '../../sim/energy';
import type { Song } from '../../types/game';
import {
  bpmBandFor,
  describeScore,
  getProducerBeats,
  getProducerOptions,
  getSelfProducedBeats,
  producerFee,
  producerPriceBand,
  scoreStudioSession,
  gradeLabel,
  type BeatOption,
  type ProducerOption,
} from '../../sim/studio';
import { money } from '@/utils/format';
import { IconAlert, IconCheck } from '../icons';

export function RemixDialog({
  song,
  onClose,
}: {
  song: Song;
  onClose: () => void;
}) {
  const npcs = useGameStore((s) => s.npcs);
  const player = useGameStore((s) => s.player);
  const createRemix = useGameStore((s) => s.createRemix);
  const openSong = useGameStore((s) => s.openSong);
  const crew = useGameStore((s) => s.crew);
  const studio = useGameStore((s) => s.studio);

  const producers = useMemo<ProducerOption[]>(() => getProducerOptions(npcs), [npcs]);

  const [title, setTitle] = useState(`${song.title} (Remix)`);
  const [producerId, setProducerId] = useState<string | null>(song.producerId ?? null);
  const [beatId, setBeatId] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [bpm, setBpm] = useState(song.bpm ?? 95);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState('');

  const selected = producerId ? producers.find((p) => p.id === producerId) ?? null : null;
  const beats = useMemo<BeatOption[]>(
    () => (selected ? getProducerBeats(selected.id, selected.skill) : getSelfProducedBeats()),
    [selected],
  );
  const beat = beats.find((b) => b.id === beatId) ?? beats[0] ?? null;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? producers.filter((p) => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q))
      : producers;
    return [...list].reverse().slice(0, 18);
  }, [producers, search]);

  const cost = 700 + (selected ? producerFee(selected.skill) : 0);

  // The honest preview. `scoreStudioSession` is deterministic, so this is the
  // number the record will actually carry.
  const preview = useMemo(() => {
    if (!player) return null;
    return scoreStudioSession({
      stats: player.stats,
      // An empty sheet means "keep the original words", which is what a
      // straight production remix is.
      lyrics: lyrics.trim() || song.lyrics || '',
      genre: song.genre,
      bpm,
      mood: song.mood ?? 'defiant',
      vocals: song.vocalSettings ?? { delivery: 60, energy: 60, pitch: 50, flow: 60, performance: 60 },
      producerSkill: selected ? selected.skill : null,
      beatQuality: beat?.quality ?? 50,
      features: [],
      effort: 2,
      // Your own engineer is in the room for this one too. Same helper the
      // store uses, so the preview cannot promise more than the record gets.
      crewProductionBonus: crewBonuses(crew).productionBonus,
      // The room the ORIGINAL was tracked in, because a remix is a re-score of
      // that master and `rescoreMaster` reads it off the record. Reading the
      // player's studio here instead would make the preview disagree with the
      // remix the moment they bought a better mic.
      studioBonus: song.studioBonus ?? roomProductionBonus(studio?.levels, null).bonus,
    });
  }, [player, lyrics, song, bpm, selected, beat, crew, studio]);

  const money0 = player?.career.money ?? 0;
  const affordable = money0 >= cost;

  // What this remix inherits. The original's own numbers, not a promise.
  const originalWeek = useMemo(() => {
    const st = useGameStore.getState().platformStats?.[song.id];
    if (!st) return 0;
    return Object.keys(st.byPlatform).reduce(
      (a, k) => a + st.byPlatform[k].d.slice(-7).reduce((x, y) => x + y, 0),
      0,
    );
  }, [song.id]);

  const doCreate = () => {
    const out = createRemix({
      originalSongId: song.id,
      title: title.trim() || undefined,
      producerId,
      beatId: beat?.id ?? '',
      lyrics: lyrics.trim() || undefined,
      inviteNpcId: invite,
    });
    setResult({ ok: out.ok, text: out.message });
    if (out.ok && out.songId) openSong(out.songId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-[16px] border border-line bg-card my-8">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-line">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Remix “{song.title}”</h2>
            <p className="text-[12px] text-ink3 mt-1 leading-relaxed">
              A remix is its own record. Both versions keep their own streams and their own chart
              run, and the original gets pulled back onto playlists for a window.
            </p>
          </div>
          <button onClick={onClose} className="text-ink3 hover:text-ink text-lg leading-none shrink-0">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ── What it inherits ───────────────────────────────────────── */}
          <div className="rounded-[12px] border border-line bg-white/[0.02] p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-ink3 mb-2">
              What this remix builds on
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-ink2 num">
              <span>
                <span className="text-ink font-semibold">{Math.round(song.quality)}</span> quality
              </span>
              <span>
                <span className="text-ink font-semibold">{originalWeek.toLocaleString()}</span> units
                last week
              </span>
              <span>
                <span className="text-ink font-semibold">
                  {song.weeksOut && song.weeksOut > 0 ? song.weeksOut : 'Just'}
                </span>{' '}
                {!song.weeksOut || song.weeksOut === 0
                  ? 'out'
                  : song.weeksOut === 1
                    ? 'week old'
                    : 'weeks old'}
              </span>
            </div>
            <p className="text-[11px] text-ink3 mt-2 leading-relaxed">
              {originalWeek > 200000
                ? 'This one still has a real audience. A remix now has something to relaunch.'
                : originalWeek > 20000
                  ? 'There is a pulse here. A remix will find an audience to build on.'
                  : 'Almost nobody is listening to this. A remix of a record nobody heard stays a record nobody heard.'}
            </p>
          </div>

          {/* ── Title ─────────────────────────────────────────────────── */}
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-[10px] bg-card border border-line text-ink text-[13px] focus:outline-none focus:border-amber"
            />
          </label>

          {/* ── Beat + tempo ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
                Tempo — {bpm} BPM ({bpmBandFor(bpm).label})
              </span>
              <input
                type="range"
                min={60}
                max={180}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-amber"
              />
            </label>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
                Producer
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search producers…"
                className="w-full h-9 px-3 rounded-[10px] bg-card border border-line text-ink text-[12px] mb-1.5 focus:outline-none focus:border-amber"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                <button
                  onClick={() => {
                    setProducerId(null);
                    setBeatId('');
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-[8px] text-[11px] transition-colors',
                    producerId === null ? 'bg-amber text-black font-bold' : 'bg-white/[0.03] text-ink2 hover:bg-white/[0.07]',
                  )}
                >
                  Self-produced · no fee
                </button>
                {shown.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProducerId(p.id);
                      setBeatId('');
                    }}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-[8px] text-[11px] flex justify-between gap-2 transition-colors',
                      producerId === p.id ? 'bg-amber text-black font-bold' : 'bg-white/[0.03] text-ink2 hover:bg-white/[0.07]',
                    )}
                  >
                    <span className="truncate">
                      {p.name}
                      <span className={producerId === p.id ? 'text-black/60' : 'text-ink3'}>
                        {' '}
                        · {producerPriceBand(p.skill)}
                      </span>
                    </span>
                    <span className="shrink-0 num">{money(producerFee(p.skill))}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Beat ──────────────────────────────────────────────────── */}
          <div>
            <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">Beat</span>
            <div className="grid grid-cols-2 gap-1.5">
              {beats.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBeatId(b.id)}
                  className={cn(
                    'text-left px-2.5 py-2 rounded-[10px] text-[11px] flex justify-between gap-2 border transition-colors',
                    beat?.id === b.id
                      ? 'border-amber bg-amber/10 text-ink'
                      : 'border-line bg-card text-ink2 hover:bg-cardhover',
                  )}
                >
                  <span className="truncate">🎵 {b.name}</span>
                  <span className="shrink-0 num">{Math.round(b.quality)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── New words ─────────────────────────────────────────────── */}
          <label className="block">
            <span className="block text-[11px] uppercase tracking-wider text-ink3 mb-1.5">
              New hook and verses — leave blank to keep the original sheet
            </span>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={6}
              placeholder="A remix with no new words is a production remix. That is a real thing to do."
              className="w-full px-3 py-2 rounded-[10px] bg-card border border-line text-ink text-[12px] font-mono leading-relaxed focus:outline-none focus:border-amber"
            />
          </label>

          {/* ── Bring somebody on ─────────────────────────────────────── */}
          <div className="rounded-[12px] border border-line bg-white/[0.02] p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-ink3 mb-1">
              Bring somebody on
            </div>
            <p className="text-[11px] text-ink3 mb-3 leading-relaxed">
              A remix is the classic place for a new voice — a song everybody already knows,
              with somebody new on it. Picking somebody here does not put them on the record:
              it sends them the track, and their answer comes back days later like any other
              ask. Costs {ENERGY_COSTS.shopFeature} energy to send.
            </p>
            {invite ? (
              <div className="flex items-center justify-between gap-3 mb-2 rounded-[10px] border border-amber/40 bg-amber/10 px-3 py-2">
                <span className="text-[12px] text-ink">
                  Inviting <span className="font-semibold">{inviteName}</span> — the track goes to
                  them the moment you cut this.
                </span>
                <button
                  onClick={() => { setInvite(null); setInviteName(''); }}
                  className="text-[11px] text-ink3 hover:text-ink shrink-0"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <FeaturePicker
              song={{
                id: song.id,
                title: title.trim() || `${song.title} (Remix)`,
                // The estimate is priced against the remix that will exist, not
                // the original — the preview above already knows the number.
                quality: preview?.quality ?? song.quality,
                // The remix inherits the original's guests, so anybody already
                // on it is not available to be added again.
                featuredArtists: song.featuredArtists ?? [],
              }}
              npcs={npcs}
              playerFame={player?.career.localFame ?? 0}
              playerCountry={player?.country ?? ''}
              sentIds={new Set(invite ? [invite] : [])}
              onSend={(id, name) => { setInvite(id); setInviteName(name); }}
              actionLabel="Invite"
              sentLabel="Invited"
            />
          </div>

          {/* ── What it will read ─────────────────────────────────────── */}
          {preview ? (
            <div className="rounded-[12px] border border-line bg-white/[0.02] p-3.5">
              <div className="flex items-baseline gap-3">
                <span
                  className={cn(
                    'text-[26px] font-bold num',
                    preview.quality >= 74 ? 'text-rise' : preview.quality >= 50 ? 'text-amber' : 'text-fall',
                  )}
                >
                  {Math.round(preview.quality)}
                </span>
                <span className="text-[11px] text-ink3">
                  / 100 · {gradeLabel(preview.quality)}
                </span>
              </div>
              <p className="text-[12px] text-ink2 mt-1.5 leading-snug">{describeScore(preview.quality)}</p>
              <p className="text-[11px] text-ink3 mt-2 leading-relaxed">
                The remix goes out through the same release as any other record. It is not a
                guaranteed hit — but a well-timed one can bring the original back with it.
              </p>
            </div>
          ) : null}

          {/* ── Commit ────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={doCreate} disabled={!affordable}>
              Cut the remix for {money(cost)}
            </Button>
            <span className="text-[12px] text-ink3">
              {affordable ? (
                <span className="inline-flex items-center gap-1.5">
                  <IconCheck size={13} /> 36 energy
                  {invite ? ` + ${ENERGY_COSTS.shopFeature} to send the invite` : ''} · it lands
                  in the vault to be mixed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-fall">
                  <IconAlert size={13} /> Short by {money(cost - money0)}
                </span>
              )}
            </span>
          </div>

          {result ? (
            <p className={cn('text-[12px]', result.ok ? 'text-rise' : 'text-fall')}>{result.text}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
