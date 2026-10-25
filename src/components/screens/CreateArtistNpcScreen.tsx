// Create an artist: put anybody you want into your world — their level, home,
// sound, personality and voice. They release music, chart, and you can reach
// out to them like anyone else.

import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { LOCATIONS } from '../../data/locations';
import { GENRE_LIST } from '../../data/genres';
import { VOICE_IDS } from '../../audio/voices';
import { PageTitle, Panel } from '../ui/kit';
import { Avatar } from '../social/shared';
import { cn } from '@/utils/cn';

const LEVELS = ['A', 'B', 'C', 'D', 'Underground'] as const;
const LEVEL_NOTE: Record<string, string> = { A: 'International star', B: 'National star', C: 'Rising name', D: 'Local grinder', Underground: 'Unknown, hungry' };
const TRAITS = ['proud', 'humble', 'competitive', 'charismatic', 'business_minded', 'loyal', 'volatile', 'petty', 'generous', 'creative', 'flashy', 'disciplined', 'romantic', 'introspective', 'rebellious', 'strategic'];

export function CreateArtistNpcScreen() {
  const npcs = useGameStore((s) => s.npcs);
  const player = useGameStore((s) => s.player);
  const create = useGameStore((s) => s.createCustomArtist);
  const remove = useGameStore((s) => s.deleteCustomArtist);
  const openArtist = useGameStore((s) => s.openArtist);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [country, setCountry] = useState(player?.country ?? 'Ghana');
  const cities = useMemo(() => LOCATIONS.find((c) => c.name === country)?.cities ?? [], [country]);
  const [city, setCity] = useState(player?.city ?? cities[0]?.name ?? '');
  const [genre, setGenre] = useState<string>(player?.genre ?? 'hip_hop');
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('C');
  const [traits, setTraits] = useState<string[]>(['competitive']);
  const [bio, setBio] = useState('');
  const [voice, setVoice] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const mine = npcs.filter((n) => n.custom);
  const field = 'w-full h-10 rounded-[10px] bg-sidebar border border-line px-3 text-[13px] text-ink';
  return (
    <div className="max-w-[720px] mx-auto space-y-4">
      <PageTitle subtitle="Put anyone you want into your world. Everyone in RAP LIFE is fictional — create characters, don't copy real people's voices.">Create an artist</PageTitle>
      <Panel className="p-4 space-y-3">
        <input className={field} placeholder="Stage name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select className={field} value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}><option value="male">Male</option><option value="female">Female</option></select>
          <select className={field} value={genre} onChange={(e) => setGenre(e.target.value)}>{GENRE_LIST.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select>
          <select className={field} value={country} onChange={(e) => { setCountry(e.target.value); const c = LOCATIONS.find((x) => x.name === e.target.value)?.cities[0]; setCity(c?.name ?? ''); }}>{LOCATIONS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
          <select className={field} value={city} onChange={(e) => setCity(e.target.value)}>{cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
        </div>
        <div>
          <div className="text-[12px] text-ink3 mb-1">Level</div>
          <div className="flex flex-wrap gap-1.5">{LEVELS.map((l) => <button key={l} onClick={() => setLevel(l)} className={cn('h-9 px-3 rounded-full border text-[12px] font-semibold', level === l ? 'border-amber bg-amber/15 text-amber' : 'border-line text-ink2')}>{l === 'Underground' ? 'Underground' : `${l}-level`} <span className="font-normal text-ink3">· {LEVEL_NOTE[l]}</span></button>)}</div>
        </div>
        <div>
          <div className="text-[12px] text-ink3 mb-1">Personality (up to 3) — it decides how they talk to you, negotiate and fight</div>
          <div className="flex flex-wrap gap-1.5">{TRAITS.map((t) => <button key={t} onClick={() => setTraits((x) => (x.includes(t) ? x.filter((y) => y !== t) : x.length < 3 ? [...x, t] : x))} className={cn('h-8 px-2.5 rounded-full border text-[11px]', traits.includes(t) ? 'border-rise bg-rise/15 text-rise' : 'border-line text-ink2')}>{t.replace(/_/g, ' ')}</button>)}</div>
        </div>
        <textarea className="w-full min-h-[70px] rounded-[10px] bg-sidebar border border-line px-3 py-2 text-[13px] text-ink" placeholder="Bio — their story, how they came up (optional)" value={bio} onChange={(e) => setBio(e.target.value)} />
        <select className={field} value={voice} onChange={(e) => setVoice(e.target.value)}>
          <option value="">Voice: pick for me</option>
          {VOICE_IDS.map((v) => <option key={v} value={v}>{`Voice: ${v.slice(3)} (${v.startsWith('a') ? 'American' : 'British'} ${v[1] === 'f' ? 'female' : 'male'})`}</option>)}
        </select>
        <button onClick={() => { const r = create({ name, gender, country, city, genre, level, traits, bio, voice: voice || undefined }); setMsg({ ok: r.ok, text: r.message }); if (r.ok) { setName(''); setBio(''); } }} className="w-full h-11 rounded-[12px] bg-amber text-black font-bold text-[14px]">Create artist</button>
        {msg && <div className={cn('text-[12px]', msg.ok ? 'text-rise' : 'text-fall')}>{msg.text}</div>}
      </Panel>
      {mine.length > 0 && (
        <Panel className="divide-y divide-line">
          {mine.map((n) => (
            <div key={n.id} className="flex items-center gap-3 p-3">
              <button onClick={() => openArtist(n.id)}><Avatar name={n.name} seed={n.id} size={40} /></button>
              <button onClick={() => openArtist(n.id)} className="min-w-0 flex-1 text-left"><div className="text-[14px] font-semibold text-ink truncate">{n.name}</div><div className="text-[11px] text-ink3 truncate">{n.city}, {n.country} · fame {Math.round(n.fame)} · {(n.personality ?? []).join(', ')}</div></button>
              <button onClick={() => remove(n.id)} className="h-8 px-3 rounded-full border border-line text-[12px] text-ink3 hover:text-fall">Remove</button>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
