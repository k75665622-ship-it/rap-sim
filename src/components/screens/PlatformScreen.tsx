// ─── PLATFORM CHARTS ───────────────────────────────────────────────────────
// One platform, one country, its own Top 10 — and the longer list underneath.
// The numbers here are the same numbers the streaming home shows, because both
// read the same engine; the country switch changes the data, not the labels.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PageTitle, Panel, SectionTitle, EmptyState, Button, Tag } from '../ui/kit';
import { CountrySelect } from '../ui/CountrySelect';
import { PlatformLogo, PlatformSwitcher } from '../ui/cards';
import { PLATFORM_LIST, platform } from '../../data/platforms';
import { compact } from '@/utils/format';
import { platformCountryChart, platformCountryBreakdown } from '../../store/musicSelectors';
import { useScreenCountry } from '../../hooks/useScreenCountry';
import { marketSizeLabel } from '../../sim/streaming';
import { IconArrowUp, IconArrowDown, IconMinus, IconChevronLeft, IconDisc } from '../icons';

export function PlatformScreen() {
  const state = useGameStore();
  const [platformId, setPlatformId] = useState(state.selectedPlatformId ?? PLATFORM_LIST[0].id);
  const [country, setCountry] = useScreenCountry(`platform:${platformId}`);
  const [expanded, setExpanded] = useState<string | null>(null);

  const cfg = platform(platformId)!;
  const rows = useMemo(
    () => platformCountryChart(state, platformId, country, 50),
    [state, platformId, country],
  );
  const top10 = rows.slice(0, 10);

  const openSong = useGameStore((s) => s.openSong);
  const openArtist = useGameStore((s) => s.openArtist);
  const setScreen = useGameStore((s) => s.setScreen);
  const setSelectedPlatform = useGameStore((s) => s.openPlatform);

  const metric = cfg.purchaseBased ? 'purchases' : 'streams';

  return (
    <div className="pb-16">
      <PageTitle
        subtitle={
          <span className="flex items-center gap-2 flex-wrap">
            <span>
              {cfg.name} · {country} · last 7 game days
            </span>
            <Tag tone="accent">{marketSizeLabel(country)}</Tag>
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <CountrySelect
              value={country}
              onChange={setCountry}
              home={state.player?.country}
              recent={state.recentCountries}
            />
            <Button variant="secondary" onClick={() => setScreen('streaming')}>
              <IconChevronLeft size={15} />
              Platform home
            </Button>
          </div>
        }
      >
        <span className="flex items-center gap-3">
          <PlatformLogo platform={cfg} size="lg" />
          <span className="text-ink3 font-normal">Top 10</span>
        </span>
      </PageTitle>

      <div className="mb-6">
        <PlatformSwitcher
          value={platformId}
          onChange={(id) => {
            setPlatformId(id);
            setSelectedPlatform(id);
          }}
          showQuirk
        />
      </div>

      {top10.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<IconDisc size={26} />}
            title={`No ${metric} on ${cfg.name} in ${country}`}
            body="Nothing has registered here yet. Let the game clock run a week and this fills up — the world releases music whether or not you do."
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div>
            <SectionTitle>Top 10 · {cfg.name} {country}</SectionTitle>
            <Panel className="p-2">
              {top10.map((row, i) => (
                <div key={row.songId}>
                  <button
                    onClick={() => setExpanded(expanded === row.songId ? null : row.songId)}
                    className="w-full flex items-center gap-3 p-2 rounded-[10px] hover:bg-cardhover transition-colors text-left"
                  >
                    <span className="w-7 text-right text-[17px] font-bold text-ink num shrink-0">
                      {i + 1}
                    </span>
                    <span className="w-4 shrink-0 flex justify-center">
                      <GrowthMark growth={row.growth} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-ink truncate">{row.title}</span>
                        {row.isPlayer ? <Tag tone="amber">You</Tag> : null}
                      </div>
                      <div className="text-[12px] text-ink2 truncate">{row.artistName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-semibold text-ink num">{compact(row.units)}</div>
                      <div className="text-[11px] text-ink3">{metric}</div>
                    </div>
                  </button>

                  {expanded === row.songId ? (
                    <div className="mx-2 mb-2 p-3 rounded-[10px] bg-sidebar border border-line">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wider text-ink3">
                          Where this record is heard
                        </span>
                        <button
                          onClick={() => openSong(row.songId)}
                          className="text-[11px] text-amber hover:underline"
                        >
                          Full breakdown
                        </button>
                      </div>
                      <BreakdownList songId={row.songId} platformId={platformId} />
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="secondary" onClick={() => openArtist(row.isPlayer ? 'player' : row.artistId)}>
                          Artist
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </Panel>

            {rows.length > 10 ? (
              <div className="mt-6">
                <SectionTitle>Further down</SectionTitle>
                <Panel className="p-2">
                  {rows.slice(10, 50).map((row, i) => (
                    <button
                      key={row.songId}
                      onClick={() => openSong(row.songId)}
                      className="w-full flex items-center gap-3 px-2 py-1.5 rounded-[8px] hover:bg-cardhover transition-colors text-left"
                    >
                      <span className="w-7 text-right text-[13px] text-ink3 num shrink-0">{i + 11}</span>
                      <span className="flex-1 text-[13px] text-ink truncate">{row.title}</span>
                      <span className="text-[12px] text-ink3 truncate max-w-[120px]">{row.artistName}</span>
                      <span className="text-[12px] text-ink num shrink-0 w-16 text-right">
                        {compact(row.units)}
                      </span>
                    </button>
                  ))}
                </Panel>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <Panel className="p-4">
              <div className="text-[11px] uppercase tracking-wider text-ink3 mb-3">
                About this platform
              </div>
              <p className="text-[13px] text-ink2 leading-relaxed">{cfg.quirk}</p>
              <div className="mt-3 space-y-1.5 text-[12px] text-ink3">
                <Row label="Reach" value={`${cfg.audience.toFixed(2)}x audience`} />
                <Row
                  label="Premium share"
                  value={cfg.purchaseBased ? 'n/a — sales only' : `${Math.round(cfg.premium * 100)}%`}
                />
                <Row label="Pays per unit" value={`$${cfg.rate.toFixed(4)}`} />
                {cfg.strongMarkets.length > 0 ? (
                  <Row label="Strong in" value={cfg.strongMarkets.slice(0, 3).join(', ')} />
                ) : null}
              </div>
            </Panel>

            {cfg.purchaseBased ? (
              <Panel className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-ink3 mb-2">
                  Counted separately
                </div>
                <p className="text-[12px] text-ink2 leading-relaxed">
                  {cfg.name} counts downloads, not plays. These units are deliberately kept out of
                  every stream total — they feed the album chart as pure sales instead.
                </p>
              </Panel>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-ink2 num truncate">{value}</span>
    </div>
  );
}

function GrowthMark({ growth }: { growth: number }) {
  if (growth > 0.02) return <IconArrowUp size={12} className="text-rise" />;
  if (growth < -0.02) return <IconArrowDown size={12} className="text-fall" />;
  return <IconMinus size={12} className="text-ink3" />;
}

function BreakdownList({ songId, platformId }: { songId: string; platformId: string }) {
  const state = useGameStore();
  const rows = useMemo(
    () => platformCountryBreakdown(state, songId, platformId, 6),
    [state, songId, platformId],
  );
  if (rows.length === 0) return <p className="text-[12px] text-ink3">No country split yet.</p>;

  const max = Math.max(...rows.map((r) => r.units), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.country} className="flex items-center gap-2">
          <span className="w-28 shrink-0 text-[12px] text-ink2 truncate">{r.country}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-amber rounded-full" style={{ width: `${(r.units / max) * 100}%` }} />
          </div>
          <span className="w-14 text-right text-[11px] text-ink3 num shrink-0">{compact(r.units)}</span>
        </div>
      ))}
    </div>
  );
}
