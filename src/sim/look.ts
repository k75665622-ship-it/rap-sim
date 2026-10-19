// ─── HOW YOU LOOK ──────────────────────────────────────────────────────────
//
// The character: body, face, hair, facial hair, jewellery, clothes, sneakers
// and tattoos. The creator picks the starting look; after that, the barber,
// the tattoo studio and the wardrobe change it (see `sim/drip.ts`).
//
// Pure data. `components/avatar/Character.tsx` draws it.

export type SkinTone = 'ebony' | 'deep' | 'brown' | 'warm' | 'caramel' | 'tan' | 'olive' | 'light' | 'fair';
export const SKIN: Record<SkinTone, { base: string; shade: string; label: string }> = {
  ebony: { base: '#3b2219', shade: '#2a1711', label: 'Ebony' },
  deep: { base: '#4f2e20', shade: '#3a2016', label: 'Deep' },
  brown: { base: '#6b3f2a', shade: '#52301f', label: 'Brown' },
  warm: { base: '#8a5536', shade: '#6d4128', label: 'Warm brown' },
  caramel: { base: '#a86d45', shade: '#8a5735', label: 'Caramel' },
  tan: { base: '#c48a5c', shade: '#a6724a', label: 'Tan' },
  olive: { base: '#c99e74', shade: '#ac835c', label: 'Olive' },
  light: { base: '#e2b892', shade: '#c99c76', label: 'Light' },
  fair: { base: '#f1d0b5', shade: '#dcb597', label: 'Fair' },
};

export type Build = 'slim' | 'athletic' | 'heavy';
export type Frame = 'masc' | 'femme';

export type HairStyle =
  | 'bald' | 'buzz' | 'fade' | 'waves' | 'hightop' | 'afro' | 'twists' | 'curly_top' | 'mohawk'
  | 'dreads_short' | 'dreads_long' | 'cornrows' | 'box_braids' | 'long_straight' | 'ponytail' | 'bun' | 'bob' | 'curls_long';
export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'bald', label: 'Bald' }, { id: 'buzz', label: 'Buzz cut' }, { id: 'fade', label: 'Fade' }, { id: 'waves', label: '360 waves' },
  { id: 'hightop', label: 'High-top' }, { id: 'afro', label: 'Afro' }, { id: 'twists', label: 'Twists' }, { id: 'curly_top', label: 'Curly top' },
  { id: 'mohawk', label: 'Mohawk' }, { id: 'dreads_short', label: 'Short locs' }, { id: 'dreads_long', label: 'Long locs' },
  { id: 'cornrows', label: 'Cornrows' }, { id: 'box_braids', label: 'Box braids' }, { id: 'long_straight', label: 'Long straight' },
  { id: 'ponytail', label: 'Ponytail' }, { id: 'bun', label: 'Bun' }, { id: 'bob', label: 'Bob' }, { id: 'curls_long', label: 'Long curls' },
];

export const HAIR_COLORS: { id: string; hex: string; label: string }[] = [
  { id: 'black', hex: '#141110', label: 'Black' }, { id: 'brown', hex: '#3d2516', label: 'Dark brown' }, { id: 'auburn', hex: '#6e2e1a', label: 'Auburn' },
  { id: 'blonde', hex: '#d9b25f', label: 'Blonde' }, { id: 'platinum', hex: '#ece6d6', label: 'Platinum' }, { id: 'red', hex: '#b3261e', label: 'Red' },
  { id: 'pink', hex: '#ef6fa8', label: 'Pink' }, { id: 'blue', hex: '#3d6cf0', label: 'Blue' }, { id: 'green', hex: '#2fb36b', label: 'Green' }, { id: 'purple', hex: '#8a4fe0', label: 'Purple' },
];

export type FacialHair = 'none' | 'stubble' | 'mustache' | 'goatee' | 'chinstrap' | 'full';
export const FACIAL_HAIR: { id: FacialHair; label: string }[] = [
  { id: 'none', label: 'Clean' }, { id: 'stubble', label: 'Stubble' }, { id: 'mustache', label: 'Mustache' },
  { id: 'goatee', label: 'Goatee' }, { id: 'chinstrap', label: 'Chin strap' }, { id: 'full', label: 'Full beard' },
];

export type EyeStyle = 'calm' | 'sharp' | 'sleepy' | 'wide' | 'lashes';
export const EYES: { id: EyeStyle; label: string }[] = [
  { id: 'calm', label: 'Calm' }, { id: 'sharp', label: 'Sharp' }, { id: 'sleepy', label: 'Sleepy' }, { id: 'wide', label: 'Wide' }, { id: 'lashes', label: 'Lashes' },
];
export type BrowStyle = 'natural' | 'thick' | 'thin' | 'slit';
export const BROWS: { id: BrowStyle; label: string }[] = [
  { id: 'natural', label: 'Natural' }, { id: 'thick', label: 'Thick' }, { id: 'thin', label: 'Thin' }, { id: 'slit', label: 'Slit' },
];
export type Mouth = 'smile' | 'neutral' | 'smirk' | 'grin';
export const MOUTHS: { id: Mouth; label: string }[] = [
  { id: 'neutral', label: 'Neutral' }, { id: 'smile', label: 'Smile' }, { id: 'smirk', label: 'Smirk' }, { id: 'grin', label: 'Grin' },
];

// ─── CLOTHES & ACCESSORIES ─────────────────────────────────────────────────

export type Slot = 'top' | 'bottom' | 'shoes' | 'head' | 'eyes' | 'chain' | 'ears' | 'wrist' | 'grillz';
export type TopShape = 'tee' | 'oversized' | 'hoodie' | 'puffer' | 'jersey' | 'bomber' | 'varsity' | 'suit' | 'tank' | 'shirt' | 'none';
export type BottomShape = 'jeans' | 'ripped' | 'cargo' | 'joggers' | 'shorts' | 'trousers' | 'skirt';
export type ShoeShape = 'runner' | 'hightop' | 'chunky' | 'court' | 'slides' | 'boots' | 'loafers';
export type HeadShape = 'cap' | 'cap_back' | 'beanie' | 'durag' | 'bucket' | 'bandana';
export type EyeShape = 'shades' | 'round' | 'visor';
export type ChainShape = 'cuban' | 'pendant' | 'pearls' | 'layered';
export type EarShape = 'studs' | 'hoops' | 'iced';
export type WristShape = 'gold' | 'iced' | 'sport';
export type GrillzShape = 'gold' | 'iced';

/** One thing you wear. Colours: `c1` main, `c2` accent, `c3` detail. */
export interface Wearable {
  id: string;
  slot: Slot;
  shape: string;
  name: string;
  c1: string;
  c2?: string;
  c3?: string;
  /** Printed number or word (jerseys, varsity). */
  text?: string;
}

/** What you're wearing right now. */
export interface Outfit {
  top: Wearable;
  bottom: Wearable;
  shoes: Wearable;
  head?: Wearable;
  eyes?: Wearable;
  chain?: Wearable;
  ears?: Wearable;
  wrist?: Wearable;
  grillz?: Wearable;
}

// ─── TATTOOS ───────────────────────────────────────────────────────────────

export type TattooSpot = 'neck' | 'face' | 'left_arm' | 'right_arm' | 'hands' | 'chest';
export type TattooDesign = 'script' | 'rose' | 'tribal' | 'stars' | 'crown' | 'adinkra' | 'money' | 'cross' | 'teardrop' | 'sleeve' | 'kente' | 'lion';
export interface Tattoo { id: string; spot: TattooSpot; design: TattooDesign; serial: number }

export const TATTOO_SPOTS: { id: TattooSpot; label: string; designs: TattooDesign[] }[] = [
  { id: 'neck', label: 'Neck', designs: ['script', 'rose', 'stars', 'crown', 'adinkra', 'money'] },
  { id: 'face', label: 'Face', designs: ['teardrop', 'cross', 'stars', 'script'] },
  { id: 'left_arm', label: 'Left forearm', designs: ['sleeve', 'rose', 'tribal', 'script', 'kente', 'lion', 'adinkra'] },
  { id: 'right_arm', label: 'Right forearm', designs: ['sleeve', 'rose', 'tribal', 'script', 'kente', 'lion', 'money'] },
  { id: 'hands', label: 'Hands', designs: ['stars', 'cross', 'script', 'crown'] },
  { id: 'chest', label: 'Chest', designs: ['crown', 'lion', 'script', 'adinkra', 'rose'] },
];

export const TATTOO_LABEL: Record<TattooDesign, string> = {
  script: 'Script', rose: 'Rose', tribal: 'Tribal', stars: 'Stars', crown: 'Crown', adinkra: 'Adinkra symbol',
  money: 'Money sign', cross: 'Cross', teardrop: 'Teardrop', sleeve: 'Full sleeve', kente: 'Kente pattern', lion: 'Lion',
};

// ─── THE LOOK ──────────────────────────────────────────────────────────────

export interface Look {
  frame: Frame;
  build: Build;
  skin: SkinTone;
  eyes: EyeStyle;
  brows: BrowStyle;
  mouth: Mouth;
  hair: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  outfit: Outfit;
  tattoos: Tattoo[];
}

const W = (slot: Slot, shape: string, name: string, c1: string, c2?: string, c3?: string, text?: string): Wearable => ({ id: `${slot}-${shape}-${c1}-${c2 ?? ''}`, slot, shape, name, c1, c2, c3, text });

/** Free starter pieces for the creator, in a few colourways each. */
export const STARTER: Record<'top' | 'bottom' | 'shoes', Wearable[]> = {
  top: [
    W('top', 'tee', 'Plain tee', '#f2f2f2'), W('top', 'tee', 'Plain tee', '#151515'), W('top', 'oversized', 'Oversized tee', '#2b2f3a', '#ffb800'),
    W('top', 'hoodie', 'Hoodie', '#1d1f26', '#3a3e4a'), W('top', 'hoodie', 'Hoodie', '#7a1f2b', '#a33545'), W('top', 'jersey', 'Football jersey', '#e8c41a', '#0f6b3a', undefined, '10'),
    W('top', 'tank', 'Tank top', '#ffffff'), W('top', 'shirt', 'Short-sleeve shirt', '#2d5fa3', '#f4f4f4'), W('top', 'bomber', 'Bomber', '#3c4a2b', '#d97a2a'),
  ],
  bottom: [
    W('bottom', 'jeans', 'Jeans', '#2c4a78', '#1f3558'), W('bottom', 'joggers', 'Joggers', '#22242b', '#3a3d47'), W('bottom', 'cargo', 'Cargos', '#5a5640', '#46432f'),
    W('bottom', 'shorts', 'Shorts', '#1b1b1b', '#333'), W('bottom', 'jeans', 'Black jeans', '#1c1d22', '#111'), W('bottom', 'skirt', 'Skirt', '#1a1a1a', '#2c2c2c'),
  ],
  shoes: [
    W('shoes', 'runner', 'White runners', '#f4f4f4', '#d8d8d8', '#c9a227'), W('shoes', 'court', 'Court lows', '#ffffff', '#1d1d1d'), W('shoes', 'hightop', 'High-tops', '#b3261e', '#f4f4f4'),
    W('shoes', 'slides', 'Slides', '#151515', '#f4f4f4'), W('shoes', 'boots', 'Work boots', '#b07a3c', '#6b4421'),
  ],
};

export function defaultLook(frame: Frame = 'masc'): Look {
  return {
    frame, build: 'athletic', skin: 'brown', eyes: frame === 'femme' ? 'lashes' : 'calm', brows: 'natural', mouth: 'neutral',
    hair: frame === 'femme' ? 'box_braids' : 'fade', hairColor: '#141110', facialHair: frame === 'femme' ? 'none' : 'stubble',
    outfit: { top: STARTER.top[2], bottom: STARTER.bottom[0], shoes: STARTER.shoes[0] },
    tattoos: [],
  };
}

function h(seed: string): number {
  let x = 2166136261;
  for (let i = 0; i < seed.length; i++) { x ^= seed.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}

/** A believable look for a generated character, the same every time. */
export function lookFor(seed: string, gender?: string): Look {
  const r = (k: string) => h(`${seed}|${k}`);
  const femme = gender === 'female' || (gender !== 'male' && r('f') % 2 === 0);
  const pick = <T,>(arr: T[], k: string) => arr[r(k) % arr.length];
  const skins: SkinTone[] = ['ebony', 'deep', 'deep', 'brown', 'brown', 'warm', 'caramel', 'tan', 'olive', 'light'];
  const hairM: HairStyle[] = ['fade', 'fade', 'waves', 'buzz', 'dreads_short', 'dreads_long', 'twists', 'cornrows', 'bald', 'afro', 'hightop', 'curly_top', 'mohawk'];
  const hairF: HairStyle[] = ['box_braids', 'long_straight', 'bob', 'curls_long', 'afro', 'ponytail', 'bun', 'twists', 'dreads_long', 'buzz'];
  const colors = ['#141110', '#141110', '#141110', '#3d2516', '#3d2516', '#d9b25f', '#ece6d6', '#b3261e', '#ef6fa8', '#3d6cf0'];
  const look: Look = {
    frame: femme ? 'femme' : 'masc',
    build: pick<Build>(['slim', 'athletic', 'athletic', 'heavy'], 'b'),
    skin: pick(skins, 's'),
    eyes: femme ? pick<EyeStyle>(['lashes', 'lashes', 'calm', 'sharp'], 'e') : pick<EyeStyle>(['calm', 'sharp', 'sleepy', 'wide'], 'e'),
    brows: pick<BrowStyle>(['natural', 'thick', 'thin', 'slit', 'natural'], 'br'),
    mouth: pick<Mouth>(['neutral', 'smile', 'smirk', 'grin'], 'm'),
    hair: femme ? pick(hairF, 'h') : pick(hairM, 'h'),
    hairColor: pick(colors, 'hc'),
    facialHair: femme ? 'none' : pick<FacialHair>(['none', 'stubble', 'stubble', 'goatee', 'chinstrap', 'full', 'mustache'], 'fh'),
    outfit: {
      top: pick(STARTER.top, 't'),
      bottom: femme ? pick(STARTER.bottom, 'bt') : pick(STARTER.bottom.slice(0, 5), 'bt'),
      shoes: pick(STARTER.shoes, 'sh'),
      chain: r('ch') % 3 === 0 ? W('chain', pick(['cuban', 'pendant', 'layered'], 'cs'), 'Chain', '#e3b341', '#fff6c8') : undefined,
      ears: r('ea') % 3 === 0 ? W('ears', pick(['studs', 'hoops'], 'es'), 'Earrings', '#e3b341') : undefined,
      eyes: r('ey') % 5 === 0 ? W('eyes', 'shades', 'Shades', '#111111') : undefined,
      head: r('hd') % 6 === 0 ? W('head', pick(['cap', 'beanie', 'durag', 'cap_back'], 'hs'), 'Hat', pick(['#151515', '#b3261e', '#2d5fa3', '#f2f2f2'], 'hcol')) : undefined,
    },
    tattoos: r('tt') % 4 === 0 ? [{ id: 't1', spot: pick<TattooSpot>(['neck', 'left_arm', 'right_arm', 'hands'], 'ts'), design: pick<TattooDesign>(['script', 'rose', 'stars', 'sleeve', 'tribal'], 'td'), serial: 0 }] : [],
  };
  return look;
}
