// ─── CREATE A MUSIC VIDEO ──────────────────────────────────────────────────
// Pick a record, a director, a budget and a concept. The page shows the cost and
// the quality the shoot is likely to land at *before* you commit, and refuses
// outright when the money is not there.
//
// You do not have to release first. A visual for a record still in the vault is
// how most artists actually work — you shoot it, then drop the song and the
// video together — so an unreleased master is shootable and the finished video
// waits in the video vault until the record comes out.

import { useMemo, useState } from 'react';
import { useGameStore, isSongReleased, VIDEO_DIRECTORS, VIDEO_CONCEPTS, VIDEO_STYLES, VIDEO_BUDGETS } from '../../store/gameStore';
import { cn } from '@/utils/cn';
import { compact, money } from '@/utils/format';
import { Button, EmptyState, PageTitle, Panel, SectionTitle, Tag } from '../ui/kit';
import { Artwork } from '../ui/kit';
import { shootQuality, videoSeed } from '../../sim/video';
import { crewBonuses } from '../../sim/roles';
import { dateToSerial, formatMedium, serialToDate } from '../../sim/gameClock';
import { ENERGY_COSTS } from '../../sim/energy';
import { IconAlert, IconCamera, IconCheck, IconFilm } from '../icons';

export function CreateVideoScreen() {
  const state = useGameStore();
  const createMusicVideo = useGameStore((s) => s.createMusicVideo);
  const quoteCameos = useGameStore((s) => s.quoteCameos);
  const setScreen = useGameStore((s) => s.setScreen);

  // Archived masters are out of the active vault and out of scope here.
  // Released records come first — they are the ones that can go live today.
  const songs = useMemo(
    () =>
      state.songs
        .filter((s) => !s.archivedAt)
        .sort((a, b) => Number(isSongReleased(b)) - Number(isSongReleased(a))),
    [state.songs],
  );

  const [songId, setSongId] = useState<string>(songs[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [concept, setConcept] = useState(VIDEO_CONCEPTS[0]);
  const [style, setStyle] = useState(VIDEO_STYLES[0]);
  const [directorId, setDirectorId] = useState(VIDEO_DIRECTORS[1].id);
  const [budget, setBudget] = useState(VIDEO_BUDGETS[2]);
  const [marketing, setMarketing] = useState(0);
  const [releaseOffset, setReleaseOffset] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  /**
   * Who from the record is being asked to appear in it.
   *
   * Only people already on the song — a verse is not a cameo, and somebody who
   * is not on the record is not turning up to be in its video.
   */
  const [guests, setGuests] = useState<string[]>([]);

  const song = songs.find((s) => s.id === songId);
  const director = VIDEO_DIRECTORS.find((d) => d.id === directorId)!;
  const nowSerial = dateToSerial(state.gameDate);
  const releaseSerial = nowSerial + releaseOffset;
  // A visual for a record that is not out is shot now and held until the song
  // is. The release-date picker is about the *video's* own drop, so it only
  // applies once the record exists in the world.
  const songOut = song ? isSongReleased(song) : false;

  // ── The guest list ────────────────────────────────────────────────────
  // Quoted through the store so the number here is the number that will be
  // charged — the shoot and this page call the same function. Everybody on the
  // record is priced; `guests` is the subset the player has actually picked.
  const guestIds = song?.featuredArtists ?? [];
  const guestNpcs = useMemo(
    () => guestIds.map((id) => state.npcs.find((n) => n.id === id)).filter(Boolean),
    [guestIds.join(','), state.npcs],
  );
  const allQuotes = useMemo(
    () => quoteCameos(song?.id ?? '', guestIds, budget).quotes,
    [song?.id, guestIds.join(','), budget],
  );
  const pickedQuotes = allQuotes.filter((q) => guests.includes(q.npcId));
  const cameoTotal = pickedQuotes.reduce((n, q) => n + q.fee, 0);
  const cameoBonus = pickedQuotes.reduce((n, q) => n + (q.appears ? q.qualityBonus : 0), 0);
  const blockedGuest = pickedQuotes.find((q) => !q.appears) ?? null;

  const cost = budget + marketing + director.fee + cameoTotal;
  const money0 = state.player?.career.money ?? 0;
  const affordable = money0 >= cost;
  const energyOk = (state.player?.energy ?? 0) >= ENERGY_COSTS.musicVideo;

  // The same function the store uses, with the same crew and cameo bonuses, so
  // the preview is the real number rather than a close relative of it.
  const previewQuality = song
    ? shootQuality({
        directorSkill: director.skill,
        budget,
        songQuality: song.quality,
        seed: videoSeed(`vid-${song.id}-${releaseSerial}`),
        crewBonus: crewBonuses(state.crew).videoBonus,
        cameoBonus,
      })
    : 0;

  const doCreate = () => {
    if (!song) return;
    const out = createMusicVideo({
      songId: song.id,
      title: title.trim() || `${song.title} (Official Video)`,
      concept,
      visualStyle: style,
      directorId,
      budget,
      marketingBudget: marketing,
      releaseSerial,
      cameos: guests,
    });
    setResult({ ok: out.ok, message: out.message });
    // Deliberately no navigation on success: the shoot is booked, not done, and
    // the video does not exist on the platform — or in the vault — until the
    // days are behind it. Opening a record that is not there yet would show the
    // player an empty screen and call it a result.
  };

  const toggleGuest = (id: string) =>
    setGuests((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  if (songs.length === 0) {
    return (
      <div className="pb-16 max-w-3xl">
        <PageTitle subtitle="Shoot a visual for anything you have recorded — out or not.">
          Create a music video
        </PageTitle>
        <Panel>
          <EmptyState
            icon={<IconFilm size={26} />}
            title="Nothing recorded yet"
            body="A video needs a record to sit on. Cut something in the Studio — you can shoot the visual before you release it."
            action={<Button onClick={() => setScreen('studio')}>Go to the Studio</Button>}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="pb-16 max-w-5xl">
      <PageTitle
        subtitle="Pick a record, a director and a budget. Quality is decided by the shoot, not by how much you spent alone."
        action={
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-ink3">Available</div>
            <div className="text-[17px] font-semibold text-rise num">{money(money0)}</div>
          </div>
        }
      >
        Create a music video
      </PageTitle>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {/* ── Record ─────────────────────────────────────────────────── */}
          <section>
            <SectionTitle>Which record?</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {songs.slice(0, 9).map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSongId(s.id);
                    // A different record has a different guest list. Carrying
                    // the old selection over would silently price people who
                    // are not on this song.
                    setGuests([]);
                  }}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-[12px] border text-left transition-all duration-150',
                    songId === s.id
                      ? 'border-amber bg-amber/10'
                      : 'border-line bg-card hover:bg-cardhover',
                  )}
                >
                  <Artwork seed={`song|${s.id}`} title={s.title} size={40} rounded={8} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink truncate">{s.title}</span>
                    <span className="block text-[11px] text-ink3 num">
                      {isSongReleased(s)
                        ? `${compact(s.totalStreams)} streams · Q${Math.round(s.quality)}`
                        : `In the vault · Q${Math.round(s.quality)}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Guests ─────────────────────────────────────────────────── */}
          {guestNpcs.length > 0 && (
            <section>
              <SectionTitle>Guests in the video</SectionTitle>
              <p className="text-[12px] text-ink3 mb-2 leading-relaxed">
                Whoever is on the record can be asked to appear. They are already on the song,
                so this is a different ask — a day on somebody else's set. What it costs
                depends on where the two of you actually stand, and a real friendship is the
                only thing that makes it free.
              </p>
              <div className="space-y-2">
                {allQuotes.map((q) => {
                  const npc = guestNpcs.find((n) => n && n.id === q.npcId);
                  const picked = guests.includes(q.npcId);
                  return (
                    <button
                      key={q.npcId}
                      onClick={() => q.appears && toggleGuest(q.npcId)}
                      disabled={!q.appears}
                      className={cn(
                        'w-full flex items-start gap-3 p-3 rounded-[12px] border text-left transition-all duration-150',
                        !q.appears
                          ? 'border-line bg-card opacity-60 cursor-not-allowed'
                          : picked
                            ? 'border-amber bg-amber/10'
                            : 'border-line bg-card hover:bg-cardhover',
                      )}
                    >
                      <span
                        className={cn(
                          'w-5 h-5 rounded-[6px] border shrink-0 mt-0.5 flex items-center justify-center',
                          picked ? 'border-amber bg-amber text-black' : 'border-line',
                        )}
                      >
                        {picked ? <IconCheck size={12} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-ink">{q.name}</span>
                          {npc ? (
                            <span className="text-[10px] text-ink3">
                              {npc.city ? `${npc.city}, ` : ''}{npc.country}
                            </span>
                          ) : null}
                          {npc && (npc.relationshipScore ?? 0) !== 0 ? (
                            <span
                              className={cn(
                                'text-[10px] num',
                                (npc.relationshipScore ?? 0) >= 0 ? 'text-rise' : 'text-fall',
                              )}
                            >
                              relationship {Math.round(npc.relationshipScore)}
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-[11px] text-ink2 mt-0.5 leading-snug">{q.reason}</span>
                        {q.appears && q.qualityBonus > 0 ? (
                          <span className="block text-[10px] text-ink3 mt-0.5">
                            +{q.qualityBonus} to the shoot just for having them in frame
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right shrink-0">
                        <span
                          className={cn(
                            'block text-[12px] font-semibold num',
                            q.fee === 0 ? 'text-rise' : 'text-ink',
                          )}
                        >
                          {q.fee === 0 ? 'Free' : money(q.fee)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Director ───────────────────────────────────────────────── */}
          <section>
            <SectionTitle>Director</SectionTitle>
            <div className="space-y-2">
              {VIDEO_DIRECTORS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDirectorId(d.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-[12px] border text-left transition-all duration-150',
                    directorId === d.id ? 'border-amber bg-amber/10' : 'border-line bg-card hover:bg-cardhover',
                  )}
                >
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-new to-re shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{d.name}</span>
                    <span className="block text-[11px] text-ink3">{d.style}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[12px] font-semibold text-ink num">
                      {d.fee === 0 ? 'Free' : money(d.fee)}
                    </span>
                    <span className="block text-[10px] text-ink3 num">skill {d.skill}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Concept + style ────────────────────────────────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SectionTitle>Concept</SectionTitle>
              <div className="space-y-1.5">
                {VIDEO_CONCEPTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setConcept(c)}
                    className={cn(
                      'w-full text-left px-3 h-9 rounded-[10px] border text-[12px] transition-colors',
                      concept === c ? 'border-amber bg-amber/10 text-ink' : 'border-line bg-card text-ink2 hover:bg-cardhover',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <SectionTitle>Visual style</SectionTitle>
              <div className="space-y-1.5">
                {VIDEO_STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={cn(
                      'w-full text-left px-3 h-9 rounded-[10px] border text-[12px] transition-colors',
                      style === s ? 'border-amber bg-amber/10 text-ink' : 'border-line bg-card text-ink2 hover:bg-cardhover',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Money ──────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <SectionTitle>Production budget</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_BUDGETS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={cn(
                      'h-9 rounded-[10px] border text-[12px] font-semibold num transition-colors',
                      budget === b ? 'border-amber bg-amber/10 text-ink' : 'border-line bg-card text-ink2 hover:bg-cardhover',
                    )}
                  >
                    {money(b)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <SectionTitle>Promotion</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {[0, 2_000, 10_000, 40_000, 120_000, 400_000].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarketing(m)}
                    className={cn(
                      'h-9 rounded-[10px] border text-[12px] font-semibold num transition-colors',
                      marketing === m ? 'border-amber bg-amber/10 text-ink' : 'border-line bg-card text-ink2 hover:bg-cardhover',
                    )}
                  >
                    {m === 0 ? 'None' : money(m)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Release ────────────────────────────────────────────────── */}
          <section>
            <SectionTitle>Release date</SectionTitle>
            {song && !songOut ? (
              <div className="rounded-[12px] border border-line bg-card px-4 py-3">
                <p className="text-[13px] text-ink2">
                  No date to pick — <span className="text-ink">“{song.title}”</span> is not out yet.
                </p>
                <p className="text-[12px] text-ink3 mt-1 leading-relaxed">
                  Shoot it now and the video waits in the video vault. It goes up the moment you
                  release the record.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 3, 7, 14, 30].map((o) => (
                    <button
                      key={o}
                      onClick={() => setReleaseOffset(o)}
                      className={cn(
                        'h-9 px-3 rounded-[10px] border text-[12px] font-semibold transition-colors',
                        releaseOffset === o ? 'border-amber bg-amber/10 text-ink' : 'border-line bg-card text-ink2 hover:bg-cardhover',
                      )}
                    >
                      {o === 0 ? 'Today' : `In ${o} day${o > 1 ? 's' : ''}`}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-ink3 mt-2">
                  Goes live {formatMedium(serialToDate(releaseSerial))}. A future date holds the video
                  back until the clock reaches it.
                </p>
              </>
            )}
          </section>

          {/* ── Title ──────────────────────────────────────────────────── */}
          <section>
            <SectionTitle>Video title</SectionTitle>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={song ? `${song.title} (Official Video)` : 'Video title'}
              className="w-full h-10 px-3 rounded-[10px] bg-card border border-line text-ink text-[13px] placeholder:text-ink3 focus:outline-none focus:border-amber"
            />
          </section>
        </div>

        {/* ── Sidebar: the deal ───────────────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-4 self-start">
          <Panel className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">The shoot</div>

            {song ? (
              <div className="flex items-center gap-3 mb-4">
                <Artwork seed={`song|${song.id}`} title={song.title} size={48} rounded={10} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink truncate">{song.title}</div>
                  <div className="text-[11px] text-ink3 num">record quality {Math.round(song.quality)}</div>
                  {!songOut ? (
                    <div className="mt-1">
                      <Tag tone="amber">In the vault</Tag>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <dl className="space-y-2 text-[12px]">
              <Line label="Production" value={money(budget)} />
              <Line label="Promotion" value={marketing === 0 ? 'None' : money(marketing)} />
              <Line label="Director" value={director.fee === 0 ? 'Free' : money(director.fee)} />
              {pickedQuotes.length > 0 ? (
                <Line
                  label={`Guests (${pickedQuotes.length})`}
                  value={cameoTotal === 0 ? 'Free' : money(cameoTotal)}
                />
              ) : null}
              <div className="border-t border-line pt-2 flex justify-between">
                <dt className="text-ink font-semibold">Total cost</dt>
                <dd className={cn('font-semibold num', affordable ? 'text-ink' : 'text-fall')}>
                  {money(cost)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink3">Left after</dt>
                <dd className={cn('num', affordable ? 'text-ink2' : 'text-fall')}>
                  {money(money0 - cost)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 pt-3 border-t border-line">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wider text-ink3">Expected quality</span>
                <span className="text-[20px] font-bold text-ink num">{previewQuality}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 mt-2 overflow-hidden">
                <div className="h-full bg-amber rounded-full" style={{ width: `${previewQuality}%` }} />
              </div>
              <p className="text-[11px] text-ink3 mt-2 leading-relaxed">
                Capped by the record itself — you cannot shoot a great video for a weak song.
              </p>
            </div>

            <div className="mt-4 space-y-1.5 text-[11px]">
              <Check ok={affordable} label={affordable ? 'You can afford it' : `Short by ${money(cost - money0)}`} />
              <Check ok={energyOk} label={energyOk ? 'Energy for the shoot' : `Needs ${ENERGY_COSTS.musicVideo} energy`} />
              <Check
                ok={!!song}
                label={
                  !song
                    ? 'Pick a record'
                    : songOut
                      ? 'Record is out — video can go live'
                      : 'Vault master — video waits for the release'
                }
              />
              {blockedGuest ? (
                <Check ok={false} label={`${blockedGuest.name} will not appear`} />
              ) : null}
            </div>

            <Button
              className="w-full mt-4"
              onClick={doCreate}
              disabled={!song || !affordable || !energyOk || !!blockedGuest}
            >
              <IconCamera size={16} />
              Shoot it
            </Button>

            {result ? (
              <div
                className={cn(
                  'mt-3 flex gap-2 p-2.5 rounded-[10px] text-[12px] leading-relaxed',
                  result.ok ? 'bg-rise/10 text-rise' : 'bg-fall/10 text-fall',
                )}
              >
                {result.ok ? <IconCheck size={14} className="mt-0.5 shrink-0" /> : <IconAlert size={14} className="mt-0.5 shrink-0" />}
                <span>{result.message}</span>
              </div>
            ) : null}
          </Panel>

          <Panel className="p-4">
            <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">How views work</div>
            <p className="text-[12px] text-ink2 leading-relaxed">
              Views build day by day as the game clock runs, from your popularity, the record's
              reach, the shoot quality, the budget, promotion, your subscribers and a little luck.
              A video can outgrow its song, or flop completely.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Tag tone="accent">+1 shoot day</Tag>
              <Tag tone="accent">Energy −{ENERGY_COSTS.musicVideo}</Tag>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink3">{label}</dt>
      <dd className="text-ink2 num">{value}</dd>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn('flex items-center gap-2', ok ? 'text-ink2' : 'text-fall')}>
      {ok ? <IconCheck size={13} /> : <IconAlert size={13} />}
      <span>{label}</span>
    </div>
  );
}
