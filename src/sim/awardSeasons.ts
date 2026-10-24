// ─── AWARD SEASONS ─────────────────────────────────────────────────────────
//
// Every award body runs a real calendar: an eligibility year closes, the
// nominations are announced weeks before the night, fans vote in the public
// categories, campaigns are run, and then the ceremony happens on the clock —
// winners revealed one category at a time, the timeline reacting live.
//
// Nominees come from what actually happened in the eligibility window:
// streams, quality, chart peaks, features, videos, albums. A clean reputation
// helps with the academy; a scandal or a lost court case doesn't.
//
// Pure: the store owns the state. Body names are generic or fictional.

import type { Genre } from '../types/game';
import { LOCATIONS, getCountry } from '../data/locations';
import { costIndex } from './home';
import { affinity } from './affinity';

export type Scope = 'country' | 'continental' | 'global';
export type CatKind = 'artist' | 'song' | 'new' | 'album' | 'collab' | 'video' | 'genre' | 'female' | 'male' | 'international' | 'foreign';

export interface CategoryDef { id: string; name: string; kind: CatKind; genres?: Genre[]; fanVote?: boolean; major?: boolean }

export interface AwardBody {
  id: string;
  name: string;
  short: string;
  emoji: string;
  scope: Scope;
  country?: string;
  /** Continental bodies: which region's artists are eligible. */
  region?: 'Africa' | 'Europe' | 'Latin' | 'AsiaPacific' | 'Arab';
  /** Ceremony on the first Saturday on/after this date. */
  month: number;
  day: number;
  city: string;
  venue: string;
  prestige: number;
  categories: CategoryDef[];
  /** Ticket price for people who aren't invited. */
  ticket: number;
}

const RAP: Genre[] = ['hip_hop', 'drill', 'trap', 'conscious', 'pop_rap', 'grime', 'boom_bap', 'jazz_rap'];
const AFRO: Genre[] = ['afrobeats', 'amapiano', 'alte'];
const SUNG: Genre[] = ['rnb', 'neo_soul', 'pop'];

// ─── EVERY COUNTRY'S OWN NIGHT ─────────────────────────────────────────────
// Each country in the game has its own awards, on its own date, in its own
// biggest city, with categories for the music that country actually makes:
// highlife and gospel in Ghana, amapiano in South Africa, dancehall in Jamaica,
// grime and drill in the UK, Latin in Colombia. The names are generic or
// invented — no real award body is being imitated.

type GenreCat = [string, string, Genre[]];
interface Flavour { name: string; short: string; month: number; day: number; venue: string; cats: GenreCat[]; emoji?: string; foreign?: string }

const G = (id: string, name: string, genres: Genre[]): GenreCat => [id, name, genres];
const HIP = G('hiphop', 'Best Hip-Hop', RAP);
const RNB = G('rnb', 'Best R&B', ['rnb', 'neo_soul']);
const POP = G('pop', 'Best Pop', ['pop', 'pop_rap']);
const GOSPEL = G('gospel', 'Best Gospel', ['gospel']);
const AFROB = G('afro', 'Best Afrobeats', ['afrobeats', 'alte']);
const DANCE = G('dance', 'Best Dance', ['amapiano', 'dancehall', 'afrobeats']);
const ROCK = G('rock', 'Best Rock', ['rock']);
const LATIN = G('latin', 'Best Latin', ['latin']);
const REGGAE = G('reggae', 'Best Reggae/Dancehall', ['reggae', 'dancehall']);

const FLAVOUR: Record<string, Flavour> = {
  'South Africa': { name: 'Mzansi Music Awards', short: 'MMAs', month: 8, day: 2, venue: 'the Dome Arena', cats: [G('amapiano', 'Amapiano Song of the Year', ['amapiano']), HIP, AFROB, RNB, GOSPEL], foreign: 'Best African Act' },
  Kenya: { name: 'Kenya Music Awards', short: 'KMAs', month: 11, day: 8, venue: 'the Convention Centre', cats: [HIP, AFROB, GOSPEL, RNB], foreign: 'Best East African Act' },
  Tanzania: { name: 'Tanzania Music Awards', short: 'TMAs', month: 7, day: 5, venue: 'the Diamond Hall', cats: [G('bongo', 'Bongo Flava Song of the Year', ['afrobeats', 'rnb', 'amapiano']), HIP, GOSPEL] },
  'Ivory Coast': { name: 'Ivorian Music Awards', short: 'IMAs', month: 12, day: 6, venue: 'the Palais de la Culture', cats: [G('coupe', 'Best Coupé-Décalé', ['afrobeats', 'dancehall']), HIP, POP], foreign: 'Best African Act' },
  Senegal: { name: 'Senegal Music Awards', short: 'SMAs', month: 2, day: 14, venue: 'the Grand Théâtre', cats: [G('mbalax', 'Best Mbalax & Afro', ['afrobeats', 'highlife']), HIP] },
  Ethiopia: { name: 'Ethiopian Music Awards', short: 'EMAs', month: 4, day: 11, venue: 'the Millennium Hall', cats: [POP, HIP, GOSPEL] },
  Egypt: { name: 'Egypt Music Awards', short: 'EgMAs', month: 1, day: 24, venue: 'the Opera Grounds', cats: [POP, G('street', 'Best Street Rap', ['trap', 'hip_hop', 'drill'])] },
  Morocco: { name: 'Moroccan Music Awards', short: 'MoMAs', month: 6, day: 13, venue: 'the Grand Théâtre', cats: [HIP, POP] },
  USA: { name: 'American Music Honors', short: 'AMHs', month: 11, day: 15, venue: 'the Microphone Theater', cats: [HIP, RNB, POP, ROCK, LATIN, G('trap', 'Best Trap Song', ['trap', 'drill'])], emoji: '🇺🇸', foreign: 'Best International Artist' },
  Canada: { name: 'Northern Lights Music Awards', short: 'NLAs', month: 3, day: 21, venue: 'the Harbour Arena', cats: [HIP, RNB, POP, ROCK], emoji: '🇨🇦' },
  Jamaica: { name: 'Jamaica Music Awards', short: 'JMAs', month: 1, day: 17, venue: 'the National Arena', cats: [G('dancehall', 'Dancehall Song of the Year', ['dancehall']), G('reggae', 'Reggae Song of the Year', ['reggae']), GOSPEL, HIP], emoji: '🇯🇲', foreign: 'Best International Reggae/Dancehall' },
  Mexico: { name: 'Premios Sonido México', short: 'Sonido', month: 6, day: 27, venue: 'the Auditorio Central', cats: [LATIN, POP, HIP], emoji: '🇲🇽' },
  UK: { name: 'British Sound Awards', short: 'BSAs', month: 2, day: 28, venue: 'the Riverside Arena', cats: [G('grime', 'Best Grime/Drill', ['grime', 'drill']), HIP, RNB, POP, ROCK, AFROB], emoji: '🇬🇧', foreign: 'Best International Act' },
  France: { name: 'Victoires Urbaines', short: 'VUs', month: 2, day: 14, venue: 'la Grande Salle', cats: [G('rap', 'Album Rap de l\'Année', RAP), RNB, POP, AFROB], emoji: '🇫🇷', foreign: 'Meilleur Artiste International' },
  Germany: { name: 'Deutscher Klangpreis', short: 'Klang', month: 4, day: 11, venue: 'the Arena am Fluss', cats: [HIP, POP, ROCK], emoji: '🇩🇪' },
  Netherlands: { name: 'Dutch Sound Awards', short: 'DSAs', month: 3, day: 14, venue: 'the Dome', cats: [HIP, POP, DANCE], emoji: '🇳🇱' },
  Sweden: { name: 'Swedish Music Honours', short: 'SMHs', month: 2, day: 7, venue: 'the Globe Hall', cats: [POP, HIP], emoji: '🇸🇪' },
  Ireland: { name: 'Irish Music Honours', short: 'IMHs', month: 3, day: 7, venue: 'the Point', cats: [POP, ROCK, HIP], emoji: '🇮🇪' },
  Brazil: { name: 'Prêmio Som do Brasil', short: 'Som', month: 12, day: 5, venue: 'the Arena Paulista', cats: [LATIN, POP, HIP, G('funk', 'Melhor Funk/Trap', ['trap', 'dancehall'])], emoji: '🇧🇷' },
  Colombia: { name: 'Premios Ritmo Colombia', short: 'Ritmo', month: 10, day: 17, venue: 'the Plaza Mayor', cats: [G('urbano', 'Mejor Canción Urbana', ['latin', 'trap', 'dancehall']), POP], emoji: '🇨🇴' },
  'Puerto Rico': { name: 'Premios Urbano Boricua', short: 'Urbano', month: 5, day: 23, venue: 'the Coliseo', cats: [G('urbano', 'Mejor Canción Urbana', ['latin', 'trap', 'dancehall']), POP], emoji: '🇵🇷' },
  India: { name: 'India Music Honours', short: 'IMHs', month: 3, day: 28, venue: 'the Dome', cats: [POP, HIP], emoji: '🇮🇳' },
  Japan: { name: 'Japan Sound Awards', short: 'JSAs', month: 12, day: 26, venue: 'the Bay Hall', cats: [POP, HIP, ROCK], emoji: '🇯🇵' },
  'South Korea': { name: 'Korea Music Honours', short: 'KMHs', month: 12, day: 5, venue: 'the Olympic Hall', cats: [POP, HIP, RNB], emoji: '🇰🇷' },
  Australia: { name: 'Australian Music Honours', short: 'AuMHs', month: 11, day: 22, venue: 'the Harbour Dome', cats: [POP, HIP, ROCK], emoji: '🇦🇺' },
  'New Zealand': { name: 'Aotearoa Sound Awards', short: 'ASAs', month: 11, day: 1, venue: 'the Town Hall', cats: [POP, HIP], emoji: '🇳🇿' },
  Cameroon: { name: 'Cameroon Music Awards', short: 'CMAs', month: 12, day: 13, venue: 'the Palais des Sports', cats: [G('makossa', 'Best Makossa & Afro', ['afrobeats', 'highlife']), HIP] },
  'DR Congo': { name: 'Congo Music Awards', short: 'CoMAs', month: 8, day: 16, venue: 'the Palais du Peuple', cats: [G('rumba', 'Best Rumba & Ndombolo', ['highlife', 'afrobeats']), HIP, GOSPEL] },
  Uganda: { name: 'Uganda Music Awards', short: 'UMAs', month: 6, day: 20, venue: 'the Serena Hall', cats: [AFROB, REGGAE, GOSPEL] },
  Zambia: { name: 'Zambia Music Awards', short: 'ZaMAs', month: 4, day: 25, venue: 'the Mulungushi Hall', cats: [HIP, AFROB] },
  Zimbabwe: { name: 'Zimbabwe Music Awards', short: 'ZiMAs', month: 2, day: 21, venue: 'the City Sports Centre', cats: [G('zimdancehall', 'Best Zimdancehall', ['dancehall', 'reggae']), HIP, GOSPEL] },
  Angola: { name: 'Angola Music Awards', short: 'AnMAs', month: 3, day: 14, venue: 'the Arena', cats: [G('kuduro', 'Best Kuduro & Afro-House', ['amapiano', 'afrobeats']), HIP] },
  Mozambique: { name: 'Mozambique Music Awards', short: 'MzMAs', month: 7, day: 18, venue: 'the Centro Cultural', cats: [AFROB, HIP] },
  Mali: { name: 'Mali Music Awards', short: 'MaMAs', month: 1, day: 31, venue: 'the Palais de la Culture', cats: [AFROB, HIP] },
  'Burkina Faso': { name: 'Faso Music Awards', short: 'FMAs', month: 3, day: 21, venue: 'the Maison du Peuple', cats: [AFROB, HIP] },
  Rwanda: { name: 'Rwanda Music Awards', short: 'RMAs', month: 1, day: 24, venue: 'the Kigali Arena', cats: [AFROB, GOSPEL] },
  Botswana: { name: 'Botswana Music Awards', short: 'BoMAs', month: 4, day: 4, venue: 'the Convention Hall', cats: [HIP, DANCE] },
  Namibia: { name: 'Namibian Music Awards', short: 'NaMAs', month: 5, day: 30, venue: 'the Dome', cats: [HIP, DANCE] },
  Tunisia: { name: 'Tunisian Music Awards', short: 'TuMAs', month: 7, day: 11, venue: 'the Théâtre', cats: [HIP, POP] },
  Algeria: { name: 'Algerian Music Awards', short: 'AlMAs', month: 6, day: 6, venue: 'the Salle Atlas', cats: [G('rai', 'Best Raï & Pop', ['pop', 'rnb']), HIP] },
  UAE: { name: 'Gulf Sound Awards', short: 'GSAs', month: 10, day: 24, venue: 'the Coca Dome', cats: [POP, HIP], emoji: '🇦🇪' },
  'Saudi Arabia': { name: 'Saudi Music Honours', short: 'SMHs', month: 1, day: 10, venue: 'the Boulevard Arena', cats: [POP, HIP], emoji: '🇸🇦' },
  Spain: { name: 'Premios Ritmo España', short: 'Ritmo', month: 4, day: 18, venue: 'the Palacio', cats: [LATIN, POP, HIP], emoji: '🇪🇸' },
  Italy: { name: 'Premio Musica Italiana', short: 'PMI', month: 9, day: 12, venue: 'the Arena', cats: [POP, HIP, ROCK], emoji: '🇮🇹' },
  Portugal: { name: 'Prémios Som Português', short: 'Som', month: 5, day: 16, venue: 'the Coliseu', cats: [POP, HIP, AFROB], emoji: '🇵🇹' },
  Poland: { name: 'Polish Music Honours', short: 'PMHs', month: 4, day: 25, venue: 'the Arena', cats: [POP, HIP, ROCK], emoji: '🇵🇱' },
  Russia: { name: 'Russian Music Honours', short: 'RMHs', month: 6, day: 13, venue: 'the Olympic Hall', cats: [POP, HIP], emoji: '🇷🇺' },
  Belgium: { name: 'Belgian Music Awards', short: 'BMAs', month: 1, day: 24, venue: 'the Palais', cats: [POP, HIP], emoji: '🇧🇪' },
  Norway: { name: 'Norwegian Music Honours', short: 'NMHs', month: 2, day: 21, venue: 'the Opera Hall', cats: [POP, HIP], emoji: '🇳🇴' },
  Denmark: { name: 'Danish Music Honours', short: 'DMHs', month: 3, day: 7, venue: 'the Royal Arena', cats: [POP, HIP], emoji: '🇩🇰' },
  Switzerland: { name: 'Swiss Music Honours', short: 'SwMHs', month: 2, day: 28, venue: 'the Hall', cats: [POP, HIP], emoji: '🇨🇭' },
  China: { name: 'China Music Honours', short: 'CMHs', month: 4, day: 18, venue: 'the Mercedes Hall', cats: [POP, HIP], emoji: '🇨🇳' },
  Indonesia: { name: 'Indonesia Music Honours', short: 'IdMHs', month: 11, day: 15, venue: 'the Convention Hall', cats: [POP, HIP], emoji: '🇮🇩' },
  Philippines: { name: 'Philippine Music Honours', short: 'PhMHs', month: 11, day: 22, venue: 'the Arena', cats: [POP, HIP, RNB], emoji: '🇵🇭' },
  Thailand: { name: 'Thai Music Honours', short: 'TMHs', month: 3, day: 7, venue: 'the Impact Hall', cats: [POP, HIP], emoji: '🇹🇭' },
  Vietnam: { name: 'Vietnam Music Honours', short: 'VMHs', month: 12, day: 19, venue: 'the Opera House', cats: [POP, HIP], emoji: '🇻🇳' },
  Malaysia: { name: 'Malaysia Music Honours', short: 'MyMHs', month: 10, day: 10, venue: 'the Arena', cats: [POP, HIP], emoji: '🇲🇾' },
};

const FLAG: Record<string, string> = {
  Ghana: '🇬🇭', Nigeria: '🇳🇬', 'South Africa': '🇿🇦', Kenya: '🇰🇪', Tanzania: '🇹🇿', 'Ivory Coast': '🇨🇮', Senegal: '🇸🇳', Ethiopia: '🇪🇹', Egypt: '🇪🇬', Morocco: '🇲🇦',
  Cameroon: '🇨🇲', 'DR Congo': '🇨🇩', Uganda: '🇺🇬', Zambia: '🇿🇲', Zimbabwe: '🇿🇼', Angola: '🇦🇴', Mozambique: '🇲🇿', Mali: '🇲🇱', 'Burkina Faso': '🇧🇫', Rwanda: '🇷🇼',
  Botswana: '🇧🇼', Namibia: '🇳🇦', Tunisia: '🇹🇳', Algeria: '🇩🇿',
};

function slug(c: string): string { return c.toLowerCase().replace(/[^a-z]+/g, '_'); }

/** One country's night, built from its flavour (or a sensible default). */
function countryBody(country: string): AwardBody {
  const loc = getCountry(country);
  const city = loc?.cities[0]?.name ?? country;
  const scene = loc?.sceneSize ?? 100;
  const f = FLAVOUR[country];
  let h = 0;
  for (const c of country) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const prestige = Math.round(Math.max(30, Math.min(70, 30 + scene * 0.06)));
  const big = scene >= 150;
  const cats: CategoryDef[] = [
    { id: 'artist', name: 'Artist of the Year', kind: 'artist', major: true, fanVote: true },
    { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
    ...(big ? [{ id: 'album', name: 'Album of the Year', kind: 'album' as CatKind }] : []),
    { id: 'new', name: 'Best New Artist', kind: 'new', fanVote: true },
    ...(f?.cats ?? [HIP, POP]).slice(0, big ? 6 : 3).map(([id, name, genres]) => ({ id, name, kind: 'genre' as CatKind, genres })),
    { id: 'collab', name: 'Collaboration of the Year', kind: 'collab' },
    ...(big ? [{ id: 'video', name: 'Music Video of the Year', kind: 'video' as CatKind }] : []),
    ...(f?.foreign ? [{ id: 'foreign', name: f.foreign, kind: 'foreign' as CatKind }] : []),
  ];
  return {
    id: `country_${slug(country)}`,
    name: f?.name ?? `${country} Music Awards`,
    short: f?.short ?? `${country.slice(0, 3).toUpperCase()} Awards`,
    emoji: f?.emoji ?? FLAG[country] ?? '🏅',
    scope: 'country',
    country,
    month: f?.month ?? 3 + (h % 8),
    day: f?.day ?? 1 + (h % 20),
    city,
    venue: f?.venue ?? 'the National Theatre',
    prestige,
    ticket: Math.max(40, Math.round((50 + prestige) * costIndex(country) / 10) * 10),
    categories: cats,
  };
}

/** Every award body in the game. The player's own country comes first. */
export function awardBodies(playerCountry: string): AwardBody[] {
  const list: AwardBody[] = [
    {
      id: 'gold_note', name: 'Gold Note Awards', short: 'Gold Notes', emoji: '🎺', scope: 'global', month: 2, day: 2, city: 'Los Angeles', venue: 'the Crystal Arena', prestige: 100, ticket: 4500,
      categories: [
        { id: 'record', name: 'Record of the Year', kind: 'song', major: true },
        { id: 'album', name: 'Album of the Year', kind: 'album', major: true },
        { id: 'new', name: 'Best New Artist', kind: 'new', major: true },
        { id: 'rap', name: 'Best Rap Performance', kind: 'genre', genres: RAP },
        { id: 'african', name: 'Best African Music Performance', kind: 'genre', genres: [...AFRO, 'highlife', 'dancehall', 'reggae'] },
        { id: 'melodic', name: 'Best R&B / Melodic Performance', kind: 'genre', genres: SUNG },
        { id: 'latin', name: 'Best Latin Performance', kind: 'genre', genres: ['latin'] },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
        { id: 'video', name: 'Best Music Video', kind: 'video' },
      ],
    },
    {
      id: 'urban_culture', name: 'Urban Culture Awards', short: 'UCAs', emoji: '🔥', scope: 'global', month: 6, day: 22, city: 'Los Angeles', venue: 'the Palms Theater', prestige: 75, ticket: 1800,
      categories: [
        { id: 'intl', name: 'Best International Act', kind: 'international', major: true },
        { id: 'hiphop', name: 'Best Hip-Hop Artist', kind: 'genre', genres: RAP },
        { id: 'rnb', name: 'Best R&B Artist', kind: 'genre', genres: SUNG },
        { id: 'viewers', name: 'Viewers\' Choice', kind: 'artist', fanVote: true, major: true },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
      ],
    },
    {
      id: 'african', name: 'African Music Awards', short: 'AMAs', emoji: '🌍', scope: 'continental', region: 'Africa', month: 11, day: 15, city: 'Kigali', venue: 'the Convention Centre', prestige: 70, ticket: 600,
      categories: [
        { id: 'artist', name: 'Artist of the Year', kind: 'artist', major: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true, fanVote: true },
        { id: 'male', name: 'Best Male Artist', kind: 'male' },
        { id: 'female', name: 'Best Female Artist', kind: 'female' },
        { id: 'newcomer', name: 'Best Newcomer', kind: 'new' },
        { id: 'hiphop', name: 'Best Hip-Hop', kind: 'genre', genres: RAP },
        { id: 'afro', name: 'Best Afrobeats', kind: 'genre', genres: AFRO },
        { id: 'amapiano', name: 'Best Amapiano', kind: 'genre', genres: ['amapiano'] },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
      ],
    },
    {
      id: 'europe', name: 'European Music Honours', short: 'EMHs', emoji: '🇪🇺', scope: 'continental', region: 'Europe', month: 11, day: 9, city: 'Berlin', venue: 'the Arena am Fluss', prestige: 68, ticket: 900,
      categories: [
        { id: 'artist', name: 'Best European Act', kind: 'artist', major: true, fanVote: true },
        { id: 'song', name: 'Best Song', kind: 'song', major: true, fanVote: true },
        { id: 'new', name: 'Best Push Act', kind: 'new' },
        { id: 'hiphop', name: 'Best Hip-Hop', kind: 'genre', genres: RAP },
        { id: 'pop', name: 'Best Pop', kind: 'genre', genres: ['pop', 'pop_rap', 'rnb'] },
        { id: 'video', name: 'Best Video', kind: 'video' },
      ],
    },
    {
      id: 'latin', name: 'Premios Latinos del Ritmo', short: 'Ritmo Latino', emoji: '💃', scope: 'continental', region: 'Latin', month: 11, day: 20, city: 'Mexico City', venue: 'the Auditorio Central', prestige: 70, ticket: 800,
      categories: [
        { id: 'record', name: 'Grabación del Año', kind: 'song', major: true },
        { id: 'artist', name: 'Artista del Año', kind: 'artist', major: true, fanVote: true },
        { id: 'new', name: 'Mejor Nuevo Artista', kind: 'new' },
        { id: 'urbano', name: 'Mejor Canción Urbana', kind: 'genre', genres: ['latin', 'trap', 'dancehall', 'pop_rap'] },
        { id: 'collab', name: 'Mejor Colaboración', kind: 'collab' },
      ],
    },
    {
      id: 'asia_pacific', name: 'Asia-Pacific Music Awards', short: 'APMAs', emoji: '🌏', scope: 'continental', region: 'AsiaPacific', month: 12, day: 1, city: 'Seoul', venue: 'the Olympic Hall', prestige: 66, ticket: 700,
      categories: [
        { id: 'artist', name: 'Artist of the Year', kind: 'artist', major: true, fanVote: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
        { id: 'new', name: 'Best New Artist', kind: 'new', fanVote: true },
        { id: 'hiphop', name: 'Best Hip-Hop', kind: 'genre', genres: RAP },
        { id: 'pop', name: 'Best Pop', kind: 'genre', genres: ['pop', 'rnb'] },
      ],
    },
    {
      id: 'arab', name: 'Arab Music Awards', short: 'ArMAs', emoji: '🌙', scope: 'continental', region: 'Arab', month: 10, day: 3, city: 'Dubai', venue: 'the Coca Dome', prestige: 60, ticket: 900,
      categories: [
        { id: 'artist', name: 'Artist of the Year', kind: 'artist', major: true, fanVote: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
        { id: 'new', name: 'Best New Artist', kind: 'new' },
        { id: 'hiphop', name: 'Best Arabic Rap', kind: 'genre', genres: RAP },
      ],
    },
    {
      id: 'ghana', name: 'Ghana Music Awards', short: 'GMAs', emoji: '🇬🇭', scope: 'country', country: 'Ghana', month: 5, day: 4, city: 'Accra', venue: 'the Grand Arena', prestige: 55, ticket: 120,
      categories: [
        { id: 'artiste', name: 'Artiste of the Year', kind: 'artist', major: true, fanVote: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
        { id: 'album', name: 'Album of the Year', kind: 'album' },
        { id: 'new', name: 'New Artiste of the Year', kind: 'new', fanVote: true },
        { id: 'hiphop', name: 'Hip-Hop/Rap Song of the Year', kind: 'genre', genres: RAP },
        { id: 'afro', name: 'Afrobeats Song of the Year', kind: 'genre', genres: AFRO },
        { id: 'highlife', name: 'Highlife Song of the Year', kind: 'genre', genres: ['highlife'] },
        { id: 'reggae', name: 'Reggae/Dancehall Song of the Year', kind: 'genre', genres: ['reggae', 'dancehall'] },
        { id: 'gospel', name: 'Gospel Song of the Year', kind: 'genre', genres: ['gospel'] },
        { id: 'collab', name: 'Collaboration of the Year', kind: 'collab' },
        { id: 'video', name: 'Music Video of the Year', kind: 'video' },
        { id: 'african', name: 'Best African Artiste', kind: 'foreign' },
      ],
    },
    {
      id: 'nigeria', name: 'Nigeria Music Awards', short: 'NMAs', emoji: '🇳🇬', scope: 'country', country: 'Nigeria', month: 9, day: 7, city: 'Lagos', venue: 'the Eko Hall', prestige: 58, ticket: 150,
      categories: [
        { id: 'artiste', name: 'Artiste of the Year', kind: 'artist', major: true },
        { id: 'song', name: 'Song of the Year', kind: 'song', major: true },
        { id: 'next', name: 'Next Rated', kind: 'new', fanVote: true },
        { id: 'rap', name: 'Best Rap Single', kind: 'genre', genres: RAP },
        { id: 'afro', name: 'Best Afrobeats Single', kind: 'genre', genres: AFRO },
        { id: 'rnb', name: 'Best R&B Single', kind: 'genre', genres: SUNG },
        { id: 'street', name: 'Best Street-Hop Artiste', kind: 'genre', genres: ['trap', 'drill', 'afrobeats', 'dancehall'] },
        { id: 'gospel', name: 'Best Inspirational Single', kind: 'genre', genres: ['gospel'] },
        { id: 'collab', name: 'Best Collaboration', kind: 'collab' },
        { id: 'video', name: 'Best Music Video', kind: 'video' },
        { id: 'fans', name: 'Viewers\' Choice', kind: 'artist', fanVote: true },
        { id: 'african', name: 'African Artiste of the Year', kind: 'foreign' },
      ],
    },
  ];
  for (const c of LOCATIONS) if (c.name !== 'Ghana' && c.name !== 'Nigeria') list.push(countryBody(c.name));
  // Yours first, then the rest in calendar order.
  const mine = list.filter((b) => b.country === playerCountry);
  return [...mine, ...list.filter((b) => b.country !== playerCountry)];
}

/** The award bodies that are about YOU: home, your region, the global ones. */
export function homeBodies(bodies: AwardBody[], playerCountry: string): AwardBody[] {
  return bodies.filter((b) => b.scope === 'global' || b.country === playerCountry || (b.scope === 'continental' && inRegion(b, playerCountry)));
}

// ─── THE LOCAL SCENE ───────────────────────────────────────────────────────
// The global charts only simulate the biggest few hundred artists; a country's
// own awards honour its whole scene. So every fictional local act with a name
// is credited with the year's best single — deterministic per artist per year,
// sized by who they are — and the player competes with the real field.

const A = ['Midnight', 'Gold', 'Concrete', 'Pressure', 'Blessings', 'No Sleep', 'Cold', 'Heavy', 'Young', 'Real', 'Wild', 'Silent', 'Burning', 'Diamond', 'Foreign', 'Holy', 'Sweet', 'Sunday', 'Mama', 'Hustle', 'City', 'Rainy', 'Hometown', 'Street'];
const B = ['Money', 'Dreams', 'Nights', 'Ways', 'Love', 'Season', 'Story', 'Prayer', 'Motion', 'Energy', 'Weather', 'Waters', 'Fire', 'Heaven', 'Truth', 'Time', 'Signs', 'Soul', 'Wave', 'Days', 'Anthem', 'Vibes', 'Lights', 'Roads'];

function hs(s: string): number { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }

export interface SceneArtist { id: string; country: string; fame: number; genre?: Genre }

/** The year's single for a local act the charts don't simulate. */
export function sceneSingle(a: SceneArtist, year: number, today: number, partners: SceneArtist[]): SongEntry {
  const h = hs(`${a.id}|${year}`);
  const quality = Math.max(30, Math.min(92, Math.round(38 + a.fame * 0.45 + ((h % 15) - 7))));
  const streams = Math.round(Math.pow(10, 2.6 + a.fame / 22) * (0.6 + (h % 80) / 100));
  const partner = partners.length && h % 7 === 0 ? partners[(h >> 3) % partners.length] : undefined;
  const hasVideo = a.fame >= 35 ? h % 3 !== 0 : h % 5 === 0;
  return {
    id: `scene:${a.id}:${year}`,
    title: h % 6 === 0 ? A[(h >> 4) % A.length] : `${A[(h >> 4) % A.length]} ${B[(h >> 9) % B.length]}`,
    ownerId: a.id,
    genre: a.genre ?? 'afrobeats',
    quality,
    streams,
    release: today - 60 - (h % 240),
    features: partner && partner.id !== a.id ? [partner.id] : [],
    hasVideo,
    videoQuality: hasVideo ? Math.max(30, Math.min(95, quality + ((h >> 6) % 11) - 5)) : undefined,
  };
}

// ─── THE CALENDAR ──────────────────────────────────────────────────────────

const DAY = 86400000;
const dayOf = (y: number, m: number, d: number) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const saturdayOnOrAfter = (s: number) => s + ((6 - new Date(s * DAY).getUTCDay() + 7) % 7);

export interface Calendar { year: number; ceremony: number; ceremonyMinute: number; nominations: number; votingCloses: number; windowStart: number; windowEnd: number; /** Last day to submit entries. Absent on seasons from older saves. */ entriesClose?: number }

/** The dates for a body's ceremony in a given year. */
export function calendarFor(body: AwardBody, year: number): Calendar {
  const ceremony = saturdayOnOrAfter(dayOf(year, body.month, body.day));
  const nominations = ceremony - 49 + ((2 - new Date((ceremony - 49) * DAY).getUTCDay() + 7) % 7); // a Tuesday ~7 weeks out
  // The eligibility year closes ~3 months before the night.
  const windowEnd = ceremony - 90;
  return { year, ceremony, ceremonyMinute: ceremony * 1440 + 19 * 60, nominations, votingCloses: ceremony - 7, windowStart: windowEnd - 365, windowEnd, entriesClose: nominations - 21 };
}

/** The next ceremony that hasn't happened yet (or is tonight). */
export function nextCalendar(body: AwardBody, today: number): Calendar {
  const y = new Date(today * DAY).getUTCFullYear();
  for (const yr of [y, y + 1]) {
    const c = calendarFor(body, yr);
    if (c.ceremony >= today) return c;
  }
  return calendarFor(body, y + 1);
}

// ─── NOMINATIONS ───────────────────────────────────────────────────────────

export interface Entrant { id: string; name: string; country: string; genre?: Genre; gender?: string; fame: number; isPlayer: boolean; real: boolean; debutSerial?: number }
export interface SongEntry { id: string; title: string; ownerId: string; genre: Genre; quality: number; streams: number; release: number; features: string[]; hasVideo: boolean; videoQuality?: number }
export interface AlbumEntry { id: string; title: string; ownerId: string; release: number; streams: number; quality: number }

export interface Nominee { id: string; name: string; isPlayer: boolean; real: boolean; songId?: string; work?: string; score: number; votes?: number }
export interface CategoryState { id: string; name: string; kind: CatKind; fanVote: boolean; major: boolean; nominees: Nominee[]; winnerId?: string }

export interface World {
  entrants: Map<string, Entrant>;
  songs: SongEntry[];
  albums: AlbumEntry[];
  playerId: string;
  /** Academy goodwill for the player: reputation, scandals, campaign. */
  playerAcademy: number;
}

const LATIN_REGION = new Set(['Mexico', 'Brazil', 'Colombia', 'Puerto Rico', 'Spain', 'Argentina', 'Chile']);
const ARAB = new Set(['Egypt', 'Morocco', 'Tunisia', 'Algeria', 'UAE', 'Saudi Arabia']);

/** Is an artist from this country eligible for this continental body? */
export function inRegion(body: AwardBody, country: string): boolean {
  switch (body.region ?? 'Africa') {
    case 'Africa': return AFRICA.has(country) || getCountry(country)?.continent === 'Africa';
    case 'Europe': return getCountry(country)?.continent === 'Europe';
    case 'Latin': return LATIN_REGION.has(country);
    case 'AsiaPacific': { const c = getCountry(country)?.continent; return c === 'Asia' || c === 'Oceania'; }
    case 'Arab': return ARAB.has(country);
  }
  return false;
}

function regionOk(body: AwardBody, e: Entrant | undefined): boolean {
  if (!e) return false;
  if (body.scope === 'country') return e.country === body.country;
  if (body.scope === 'continental') return inRegion(body, e.country);
  return true;
}
const AFRICA = new Set(['Ghana', 'Nigeria', 'South Africa', 'Kenya', 'Tanzania', 'Uganda', 'Senegal', 'Côte d\'Ivoire', 'Ivory Coast', 'Cameroon', 'Rwanda', 'Ethiopia', 'Egypt', 'Morocco', 'Algeria', 'Tunisia', 'Mali', 'Burkina Faso', 'Togo', 'Benin', 'Sierra Leone', 'Liberia', 'Gambia', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Angola', 'Mozambique', 'DR Congo', 'Congo', 'Gabon', 'Malawi', 'Madagascar', 'Sudan', 'Niger', 'Guinea']);

const songScore = (s: SongEntry) => Math.log10(1 + s.streams) * 14 + s.quality * 0.9;

/** Pick the nominees for every category of one ceremony. */
export function nominate(body: AwardBody, cal: Calendar, w: World, rng: () => number): CategoryState[] {
  let inWindow = w.songs.filter((s) => s.release >= cal.windowStart && s.release <= cal.windowEnd && regionOk(body, w.entrants.get(s.ownerId)));
  // A thin year (a small scene, or the very start of a career) reaches back
  // another year rather than handing out awards to three people.
  if (new Set(inWindow.map((s) => s.ownerId)).size < 8) inWindow = w.songs.filter((s) => s.release >= cal.windowStart - 365 && s.release <= cal.windowEnd && regionOk(body, w.entrants.get(s.ownerId)));
  const best = new Map<string, SongEntry>();
  for (const s of inWindow) { const b = best.get(s.ownerId); if (!b || songScore(s) > songScore(b)) best.set(s.ownerId, s); }
  const artistScore = (id: string) => {
    const mine = inWindow.filter((s) => s.ownerId === id);
    const streams = mine.reduce((a, s) => a + s.streams, 0);
    const top = mine.reduce((a, s) => Math.max(a, s.quality), 0);
    const e = w.entrants.get(id)!;
    return Math.log10(1 + streams) * 16 + top * 0.6 + e.fame * 0.5 + mine.length * 2;
  };
  const noise = () => 0.88 + rng() * 0.24;
  const take = (list: Nominee[], n = 5) => list.map((x) => ({ ...x, score: x.score * noise() * (x.isPlayer ? w.playerAcademy : 1) })).sort((a, b) => b.score - a.score).slice(0, n);
  const out: CategoryState[] = [];
  for (const c of body.categories) {
    let pool: Nominee[] = [];
    const songNom = (s: SongEntry): Nominee => { const e = w.entrants.get(s.ownerId)!; return { id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, songId: s.id, work: s.title, score: songScore(s) }; };
    switch (c.kind) {
      case 'song': pool = [...best.values()].map(songNom); break;
      case 'genre': pool = [...best.values()].filter((s) => c.genres!.includes(s.genre)).map(songNom); break;
      case 'collab': pool = inWindow.filter((s) => s.features.length > 0).map(songNom); break;
      case 'video': pool = inWindow.filter((s) => s.hasVideo).map((s) => ({ ...songNom(s), score: (s.videoQuality ?? s.quality) * 1.2 + Math.log10(1 + s.streams) * 6 })); break;
      case 'album': pool = w.albums.filter((a) => a.release >= cal.windowStart && a.release <= cal.windowEnd && regionOk(body, w.entrants.get(a.ownerId))).map((a) => { const e = w.entrants.get(a.ownerId)!; return { id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, work: a.title, score: Math.log10(1 + a.streams) * 14 + a.quality }; }); break;
      case 'new': pool = [...best.keys()].map((id) => w.entrants.get(id)!).filter((e) => e.fame < 55 && (e.debutSerial === undefined || cal.windowEnd - e.debutSerial < 600)).map((e) => ({ id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, work: best.get(e.id)!.title, songId: best.get(e.id)!.id, score: artistScore(e.id) })); break;
      case 'male': case 'female': pool = [...best.keys()].map((id) => w.entrants.get(id)!).filter((e) => e.gender === c.kind).map((e) => ({ id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, score: artistScore(e.id) })); break;
      case 'international': pool = [...best.keys()].map((id) => w.entrants.get(id)!).filter((e) => e.country !== 'USA' && e.country !== 'United States').map((e) => ({ id: e.id, name: e.name, isPlayer: e.isPlayer, real: e.real, score: artistScore(e.id) })); break;
      case 'foreign': {
        // Artists from elsewhere whose records travelled here: scored by how
        // big they are and how well their music crosses into this country.
        const home = body.country ?? '';
        const cont = getCountry(home)?.continent;
        const away = new Map<string, SongEntry>();
        for (const s of w.songs) {
          if (s.release < cal.windowStart || s.release > cal.windowEnd) continue;
          const e = w.entrants.get(s.ownerId);
          if (!e || e.country === home) continue;
          if (cont && getCountry(e.country)?.continent !== cont && affinity(e.country, home) < 0.3) continue;
          const b = away.get(s.ownerId);
          if (!b || songScore(s) > songScore(b)) away.set(s.ownerId, s);
        }
        pool = [...away.values()].map((s) => ({ ...songNom(s), score: songScore(s) * (0.4 + affinity(w.entrants.get(s.ownerId)!.country, home)) + w.entrants.get(s.ownerId)!.fame * 0.3 }));
        break;
      }
      default: pool = [...best.keys()].map((id) => ({ id, name: w.entrants.get(id)!.name, isPlayer: w.entrants.get(id)!.isPlayer, real: w.entrants.get(id)!.real, score: artistScore(id) }));
    }
    // One nomination per act per category.
    const seen = new Set<string>();
    pool = pool.sort((a, b) => b.score - a.score).filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
    const nominees = take(pool, c.major ? 6 : 5);
    if (nominees.length >= 3) out.push({ id: c.id, name: c.name, kind: c.kind, fanVote: !!c.fanVote, major: !!c.major, nominees: nominees.map((n) => ({ ...n, votes: c.fanVote ? 0 : undefined })) });
  }
  return out;
}

/** A day of fan voting: everyone's fans vote; the player's campaign adds to theirs. */
export function voteDay(cat: CategoryState, fans: (id: string) => number, rally: number, rng: () => number): void {
  for (const n of cat.nominees) {
    const base = Math.sqrt(Math.max(1, fans(n.id))) * (0.8 + rng() * 0.4);
    n.votes = Math.round((n.votes ?? 0) + base * (n.isPlayer ? 1 + rally : 1));
  }
}

/** The envelope. Academy categories weigh the work; fan categories count votes too. */
export function decide(cat: CategoryState, academy: number, rng: () => number): Nominee {
  const total = cat.nominees.reduce((a, n) => a + (n.votes ?? 0), 0) || 1;
  const top = Math.max(...cat.nominees.map((n) => n.score)) || 1;
  const scored = cat.nominees.map((n) => {
    const work = (n.score / top) * 100 * (n.isPlayer ? academy : 1);
    // The public vote counts for 60% where there is one; the academy for the rest.
    const s = cat.fanVote ? ((n.votes ?? 0) / total) * 100 * 0.6 + work * 0.4 * (0.9 + rng() * 0.2) : work * (0.85 + rng() * 0.3);
    return { n, s };
  });
  return scored.sort((a, b) => b.s - a.s)[0].n;
}

/** Share of the public vote, for the bars on the page. */
export function voteShare(cat: CategoryState, id: string): number {
  const total = cat.nominees.reduce((a, n) => a + (n.votes ?? 0), 0);
  return total ? Math.round(((cat.nominees.find((n) => n.id === id)?.votes ?? 0) / total) * 100) : 0;
}

/** What a win is worth to the player. */
export function winRewards(body: AwardBody, major: boolean): { fame: number; fansPct: number; momentum: number; reputation: number } {
  const p = body.prestige / 100;
  return { fame: Math.round((major ? 6 : 3) * (0.6 + p)), fansPct: (major ? 8 : 4) * p, momentum: Math.round((major ? 14 : 7) * (0.5 + p)), reputation: major ? 3 : 1 };
}

/** Red carpet: the fit is the story. */
export function carpetVerdict(drip: number, roll: number): { text: string; momentum: number; tag: 'best' | 'fine' | 'worst' } {
  const s = drip + (roll - 0.5) * 30;
  if (s >= 70) return { text: 'Every camera turned. You\'re on the best-dressed lists by morning.', momentum: 6, tag: 'best' };
  if (s >= 35) return { text: 'Clean fit, a few photos, a few nods. Nothing to fix.', momentum: 1, tag: 'fine' };
  return { text: 'The fit didn\'t land. The worst-dressed accounts are having fun with it.', momentum: -2, tag: 'worst' };
}
