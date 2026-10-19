// ─── CREATE YOUR ARTIST ────────────────────────────────────────────────────
// Four steps: who you are, how you look, your sound and where you're from,
// and where you start. The look step draws the character live as you choose
// body, face, hair, the fit you walk in with, and any ink you already have.

import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Badge } from '../ui/Card';
import { Button } from '../ui/kit';
import { cn } from '@/utils/cn';
import { BACKGROUNDS } from '../../data/backgrounds';
import { getContinents, getCountriesByContinent, getCitiesByCountry } from '../../data/locations';
import type { Background, Gender, Genre } from '../../types/game';
import { GENRE_LIST } from '../../data/genres';
import { Character, SLOT_CROP } from '../avatar/Character';
import {
  SKIN, HAIR_STYLES, HAIR_COLORS, FACIAL_HAIR, EYES, BROWS, MOUTHS, STARTER, TATTOO_SPOTS, TATTOO_LABEL,
  defaultLook, lookFor, type Look, type SkinTone, type Build, type Frame, type Wearable, type TattooSpot, type TattooDesign,
} from '../../sim/look';

const GENRES = GENRE_LIST;

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'non_binary', label: 'Non-binary' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const STEPS = [
  { title: 'Who are you?', sub: 'Your artist identity' },
  { title: 'Your look', sub: 'This is how the world sees you' },
  { title: 'Your sound & origin', sub: 'Where you from? What you making?' },
  { title: 'Where you start', sub: 'Every story starts somewhere' },
];

type LookTab = 'body' | 'face' | 'hair' | 'fit' | 'ink';

const field = 'w-full bg-card border border-line rounded-[12px] px-4 py-3 text-ink placeholder:text-ink3 focus:outline-none focus:border-amber transition-colors';
const label = 'block text-[11px] text-ink3 mb-2 uppercase tracking-wider font-semibold';

export function CreateArtistScreen() {
  const createPlayer = useGameStore((s) => s.createPlayer);

  const [step, setStep] = useState(1);
  const [artistName, setArtistName] = useState('');
  const [realName, setRealName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2000-01-01');
  const [gender, setGender] = useState<Gender>('male');
  const [genre, setGenre] = useState<Genre>('hip_hop');
  const [continent, setContinent] = useState('Africa');
  const [country, setCountry] = useState('Ghana');
  const [city, setCity] = useState('Accra');
  const [background, setBackground] = useState<Background>('broke_hustler');
  const [look, setLook] = useState<Look>(() => defaultLook('masc'));
  const [lookTouched, setLookTouched] = useState(false);

  const continents = getContinents();
  const countries = getCountriesByContinent(continent);
  const cities = getCitiesByCountry(country);

  function handleContinentChange(c: string) {
    setContinent(c);
    const firstCountry = getCountriesByContinent(c)[0];
    if (firstCountry) {
      setCountry(firstCountry.name);
      setCity(firstCountry.cities[0]?.name ?? '');
    }
  }

  function handleCountryChange(c: string) {
    setCountry(c);
    setCity(getCitiesByCountry(c)[0]?.name ?? '');
  }

  function chooseGender(g: Gender) {
    setGender(g);
    // Until the player has styled the character, follow their choice here.
    if (!lookTouched) setLook(defaultLook(g === 'female' ? 'femme' : 'masc'));
  }

  function handleSubmit() {
    if (!artistName.trim()) return;
    createPlayer({ artistName: artistName.trim(), realName: realName.trim(), dateOfBirth, gender, genre, continent, country, city, background, look });
  }

  const selectedBG = BACKGROUNDS.find((b) => b.id === background);
  const selectedGenre = GENRES.find((g) => g.id === genre);
  const S = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-[#0A0B10] text-ink flex flex-col items-center px-4 py-8 sm:py-12">
      <div className={cn('w-full', step === 2 ? 'max-w-[980px]' : 'max-w-xl')}>
        <div className="text-center mb-6">
          <span className="text-[11px] tracking-[0.3em] text-amber uppercase font-bold">Step {step} of {STEPS.length}</span>
          <h2 className="text-[30px] font-black mt-1">{S.title}</h2>
          <p className="text-ink3 text-[13px] mt-1">{S.sub}</p>
        </div>

        <div className="flex gap-2 mb-7 max-w-xl mx-auto">
          {STEPS.map((_, i) => <div key={i} className={cn('flex-1 h-1 rounded-full transition-all', i < step ? 'bg-amber' : 'bg-white/10')} />)}
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className={label}>Artist name *</label>
              <input className={cn(field, 'text-lg')} placeholder="What do they call you?" value={artistName} onChange={(e) => setArtistName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Real name (optional)</label>
              <input className={field} placeholder="Birth name" value={realName} onChange={(e) => setRealName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Date of birth</label>
              <input type="date" className={field} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div>
              <label className={label}>Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {GENDERS.map((g) => (
                  <button key={g.id} onClick={() => chooseGender(g.id)} className={cn('py-2.5 px-4 rounded-[12px] text-[13px] transition-all', gender === g.id ? 'bg-amber text-black font-bold' : 'bg-card border border-line text-ink2 hover:border-white/20')}>{g.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && <LookStep look={look} setLook={(l) => { setLook(l); setLookTouched(true); }} gender={gender} name={artistName} />}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className={label}>Genre / style</label>
              <div className="grid grid-cols-2 gap-2">
                {GENRES.map((g) => (
                  <button key={g.id} onClick={() => setGenre(g.id)} className={cn('py-3 px-4 rounded-[12px] text-[13px] transition-all flex items-center gap-2', genre === g.id ? 'bg-amber text-black font-bold' : 'bg-card border border-line text-ink2 hover:border-white/20')}>
                    <span>{g.emoji}</span>{g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label}>Continent</label>
              <select className={field} value={continent} onChange={(e) => handleContinentChange(e.target.value)}>{continents.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className={label}>Country</label>
              <select className={field} value={country} onChange={(e) => handleCountryChange(e.target.value)}>{countries.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
            </div>
            <div>
              <label className={label}>City</label>
              <select className={field} value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            {BACKGROUNDS.map((bg) => (
              <button key={bg.id} onClick={() => setBackground(bg.id)} className={cn('w-full text-left p-4 rounded-[16px] border transition-all', background === bg.id ? 'bg-amber/10 border-amber text-ink' : 'bg-card border-line text-ink2 hover:border-white/20')}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{bg.emoji}</span>
                  <span className="font-bold text-ink">{bg.label}</span>
                  <span className="text-[12px] text-amber ml-auto">${bg.startingMoney.toLocaleString()} start</span>
                </div>
                <p className="text-[13px] text-ink3">{bg.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(bg.statBoosts).filter(([, v]) => (v ?? 0) > 0).slice(0, 4).map(([stat, val]) => <Badge key={stat} color="green">+{val} {stat.replace(/([A-Z])/g, ' $1').trim()}</Badge>)}
                  {Object.entries(bg.statBoosts).filter(([, v]) => (v ?? 0) < 0).slice(0, 2).map(([stat, val]) => <Badge key={stat} color="red">{val} {stat.replace(/([A-Z])/g, ' $1').trim()}</Badge>)}
                </div>
              </button>
            ))}

            {selectedBG && (
              <div className="bg-card border border-line rounded-[16px] p-4 mt-4 flex gap-4 items-center">
                <div className="w-[70px] h-[130px] shrink-0"><Character look={look} className="w-full h-full" /></div>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-bold text-amber mb-2">Your artist card</h3>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-ink2">
                    <span className="truncate">🎤 {artistName || '???'}</span>
                    <span className="truncate">🌍 {city}, {country}</span>
                    <span>{selectedGenre?.emoji} {selectedGenre?.label}</span>
                    <span>💰 ${selectedBG.startingMoney.toLocaleString()}</span>
                    <span>👥 {selectedBG.startingFanbase} fans</span>
                    <span>⭐ Local fame {selectedBG.startingFame.local}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={cn('flex gap-3 mt-8', step === 2 && 'max-w-xl mx-auto')}>
          {step > 1 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>← Back</Button>}
          {step < STEPS.length ? (
            <Button className="flex-1" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !artistName.trim()}>Continue →</Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={!artistName.trim()}>🎤 Start your career</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── THE LOOK STEP ─────────────────────────────────────────────────────────

function LookStep({ look, setLook, gender, name }: { look: Look; setLook: (l: Look) => void; gender: Gender; name: string }) {
  const [tab, setTab] = useState<LookTab>('body');
  const [inkSpot, setInkSpot] = useState<TattooSpot>('left_arm');
  const [shuffles, setShuffles] = useState(0);
  const set = (patch: Partial<Look>) => setLook({ ...look, ...patch });
  const wear = (w: Wearable) => setLook({ ...look, outfit: { ...look.outfit, [w.slot]: w } });
  const toggleInk = (spot: TattooSpot, design: TattooDesign) => {
    const has = look.tattoos.find((t) => t.spot === spot && t.design === design);
    const rest = look.tattoos.filter((t) => t.spot !== spot);
    if (has) return set({ tattoos: rest });
    if (rest.length >= 3) return;
    set({ tattoos: [...rest, { id: `start-${spot}`, spot, design, serial: rest.length + 1 }] });
  };
  const randomize = () => {
    const n = shuffles + 1;
    setShuffles(n);
    const r = lookFor(`${name}|${n}|${Date.now()}`, gender === 'female' ? 'female' : gender === 'male' ? 'male' : undefined);
    setLook({ ...r, outfit: { top: r.outfit.top, bottom: r.outfit.bottom, shoes: r.outfit.shoes }, tattoos: r.tattoos.slice(0, 1) });
  };
  // The tattoo tab shows skin, so the preview takes the top off (a tank for femme).
  const preview = tab === 'ink'
    ? { ...look, outfit: { ...look.outfit, top: look.frame === 'femme' ? { id: 'tank', slot: 'top' as const, shape: 'tank', name: 'Tank', c1: '#2a2d38' } : { id: 'none', slot: 'top' as const, shape: 'none', name: '', c1: '#000' } } }
    : look;

  const bust = (patch: Partial<Look>) => ({ ...look, ...patch, outfit: { ...look.outfit, head: undefined, eyes: undefined } });

  return (
    <div className="grid md:grid-cols-[340px_minmax(0,1fr)] gap-5">
      <div className="md:sticky md:top-6 self-start">
        <div className="rounded-[22px] border border-line overflow-hidden relative" style={{ background: 'radial-gradient(90% 70% at 50% 15%, rgba(255,184,0,0.22), rgba(10,11,16,0) 65%), radial-gradient(80% 50% at 50% 100%, rgba(123,97,255,0.18), rgba(10,11,16,0) 70%), #12141b' }}>
          <div className="h-[300px] sm:h-[420px] md:h-[500px] p-3"><Character look={preview} className="w-full h-full" /></div>
          <div className="absolute top-3 left-3 right-3 flex justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink3">{name || 'You'}</span>
            <button onClick={randomize} className="h-8 px-3 rounded-full bg-black/40 border border-white/10 text-[12px] font-semibold text-ink hover:border-amber/60">🎲 Shuffle</button>
          </div>
        </div>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([['body', '🧍 Body'], ['face', '🙂 Face'], ['hair', '💇 Hair'], ['fit', '👟 Fit'], ['ink', '🖋️ Ink']] as [LookTab, string][]).map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} className={cn('shrink-0 h-9 px-4 rounded-full border text-[13px] font-semibold transition', tab === id ? 'border-amber bg-amber/15 text-amber' : 'border-line bg-card text-ink2 hover:text-ink')}>{l}</button>
          ))}
        </div>

        {tab === 'body' && (
          <div className="space-y-5">
            <Group title="Frame">
              <div className="grid grid-cols-2 gap-2">
                {(['masc', 'femme'] as Frame[]).map((f) => (
                  <Option key={f} on={look.frame === f} onClick={() => set({ frame: f, eyes: f === 'femme' && look.eyes === 'calm' ? 'lashes' : look.eyes })}>
                    <div className="h-[110px]"><Character look={{ ...look, frame: f }} className="w-full h-full" /></div>
                    <div className="text-[12px] py-1">{f === 'masc' ? 'Masculine' : 'Feminine'}</div>
                  </Option>
                ))}
              </div>
            </Group>
            <Group title="Build">
              <div className="grid grid-cols-3 gap-2">
                {(['slim', 'athletic', 'heavy'] as Build[]).map((b) => (
                  <Option key={b} on={look.build === b} onClick={() => set({ build: b })}>
                    <div className="h-[110px]"><Character look={{ ...look, build: b }} className="w-full h-full" /></div>
                    <div className="text-[12px] py-1 capitalize">{b}</div>
                  </Option>
                ))}
              </div>
            </Group>
            <Group title="Skin tone">
              <div className="flex flex-wrap gap-2.5">
                {(Object.keys(SKIN) as SkinTone[]).map((k) => (
                  <button key={k} title={SKIN[k].label} onClick={() => set({ skin: k })} className={cn('w-10 h-10 rounded-full border-2 transition', look.skin === k ? 'border-amber scale-110' : 'border-white/10 hover:border-white/30')} style={{ background: `radial-gradient(circle at 35% 30%, ${SKIN[k].base}, ${SKIN[k].shade})` }} />
                ))}
              </div>
            </Group>
          </div>
        )}

        {tab === 'face' && (
          <div className="space-y-5">
            <Group title="Eyes"><BustRow items={EYES.map((e) => ({ id: e.id, label: e.label, look: bust({ eyes: e.id }) }))} value={look.eyes} onPick={(v) => set({ eyes: v as Look['eyes'] })} /></Group>
            <Group title="Brows"><BustRow items={BROWS.map((e) => ({ id: e.id, label: e.label, look: bust({ brows: e.id }) }))} value={look.brows} onPick={(v) => set({ brows: v as Look['brows'] })} /></Group>
            <Group title="Expression"><BustRow items={MOUTHS.map((e) => ({ id: e.id, label: e.label, look: bust({ mouth: e.id }) }))} value={look.mouth} onPick={(v) => set({ mouth: v as Look['mouth'] })} /></Group>
            <Group title="Facial hair"><BustRow items={FACIAL_HAIR.map((e) => ({ id: e.id, label: e.label, look: bust({ facialHair: e.id }) }))} value={look.facialHair} onPick={(v) => set({ facialHair: v as Look['facialHair'] })} /></Group>
          </div>
        )}

        {tab === 'hair' && (
          <div className="space-y-5">
            <Group title="Haircut"><BustRow items={HAIR_STYLES.map((h) => ({ id: h.id, label: h.label, look: bust({ hair: h.id }) }))} value={look.hair} onPick={(v) => set({ hair: v as Look['hair'] })} /></Group>
            <Group title="Colour">
              <div className="flex flex-wrap gap-2.5">
                {HAIR_COLORS.map((c) => <button key={c.id} title={c.label} onClick={() => set({ hairColor: c.hex })} className={cn('w-10 h-10 rounded-full border-2 transition', look.hairColor === c.hex ? 'border-amber scale-110' : 'border-white/10 hover:border-white/30')} style={{ background: c.hex }} />)}
              </div>
            </Group>
          </div>
        )}

        {tab === 'fit' && (
          <div className="space-y-5">
            <div className="text-[12px] text-ink3">What you walk in wearing. Real drip comes later — the shop has new drops every other Friday.</div>
            {(['top', 'bottom', 'shoes'] as const).map((slot) => (
              <Group key={slot} title={slot === 'top' ? 'Top' : slot === 'bottom' ? 'Bottoms' : 'Shoes'}>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {STARTER[slot].map((w) => (
                    <Option key={w.id} on={look.outfit[slot].id === w.id} onClick={() => wear(w)}>
                      <div className="h-[76px]"><Character look={{ ...look, outfit: { ...look.outfit, [slot]: w } }} crop={SLOT_CROP[slot]} className="w-full h-full" /></div>
                      <div className="text-[11px] py-1 px-1 truncate">{w.name}</div>
                    </Option>
                  ))}
                </div>
              </Group>
            ))}
          </div>
        )}

        {tab === 'ink' && (
          <div className="space-y-4">
            <div className="text-[12px] text-ink3">Ink you already have — up to three pieces. You can get more (or laser them off) at the tattoo studio later.</div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {TATTOO_SPOTS.map((s) => (
                <button key={s.id} onClick={() => setInkSpot(s.id)} className={cn('shrink-0 h-8 px-3 rounded-full border text-[12px] font-semibold', inkSpot === s.id ? 'border-amber bg-amber/15 text-amber' : 'border-line bg-card text-ink2')}>
                  {s.label}{look.tattoos.some((t) => t.spot === s.id) ? ' •' : ''}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TATTOO_SPOTS.find((s) => s.id === inkSpot)!.designs.map((d) => {
                const on = look.tattoos.some((t) => t.spot === inkSpot && t.design === d);
                const full = !on && look.tattoos.filter((t) => t.spot !== inkSpot).length >= 3;
                return <button key={d} disabled={full} onClick={() => toggleInk(inkSpot, d)} className={cn('rounded-[12px] border px-3 py-2.5 text-left text-[13px] transition disabled:opacity-40', on ? 'border-amber bg-amber/10 text-amber font-semibold' : 'border-line bg-card text-ink2 hover:border-white/20')}>{TATTOO_LABEL[d]}</button>;
              })}
            </div>
            {look.tattoos.length > 0 && <button onClick={() => set({ tattoos: [] })} className="text-[12px] text-ink3 hover:text-fall">Clean skin — remove all</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className={label}>{title}</div>{children}</div>;
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn('rounded-[14px] border overflow-hidden transition text-center', on ? 'border-amber bg-amber/10 text-amber font-semibold' : 'border-line bg-card text-ink2 hover:border-white/25')}>{children}</button>;
}

function BustRow({ items, value, onPick }: { items: { id: string; label: string; look: Look }[]; value: string; onPick: (v: string) => void }) {
  const list = items;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
      {list.map((it) => (
        <Option key={it.id} on={value === it.id} onClick={() => onPick(it.id)}>
          <div className="h-[72px]"><Character look={it.look} view="bust" className="w-full h-full" /></div>
          <div className="text-[11px] py-1 px-1 truncate">{it.label}</div>
        </Option>
      ))}
    </div>
  );
}
