// ─── GHOSTWRITERS ──────────────────────────────────────────────────────────
//
// Not everybody writes their own bars, and the ones who do not are not
// necessarily worse off for it. A hired pen costs money and a little of your
// day, and in exchange the sheet on the page is theirs, not yours — which
// matters when your `lyricism` is still developing.
//
// The lyric sheets below are generated, not drawn from any real song. They are
// written to a mood so the sheet reads like it belongs to the record you are
// making, and they are long and varied enough to actually score.

import type { Genre, SongMood } from '../types/game';
import { GENRE_LIST } from '../data/genres';

export interface Ghostwriter {
  id: string;
  name: string;
  /** What their sheet is worth, 0-100. This is the floor your lyrics get. */
  skill: number;
  fee: number;
  energy: number;
  blurb: string;
  /** One line on what they actually do for you. */
  pitch: string;
}

export const GHOSTWRITERS: Ghostwriter[] = [
  {
    id: 'gw_tunde',
    name: 'Tunde Adeyemi',
    skill: 46,
    fee: 250,
    energy: 8,
    blurb: 'Writes fast, writes cheap, writes fine.',
    pitch: 'You will still have to carry the delivery, but the sheet will be a real song.',
  },
  {
    id: 'gw_nanayaa',
    name: 'Nana Yaa Boateng',
    skill: 68,
    fee: 1_800,
    energy: 14,
    blurb: 'The pen behind three records you are sure somebody else wrote.',
    pitch: 'Structures a song properly — verses that build, a hook that lands.',
  },
  {
    id: 'gw_theghost',
    name: 'The Ghost',
    skill: 88,
    fee: 12_000,
    energy: 22,
    blurb: 'No name, no credit, no misses.',
    pitch: 'You will never meet him and you will never hear him say he wrote it.',
  },
];

export function ghostwriterById(id: string): Ghostwriter | undefined {
  return GHOSTWRITERS.find(w => w.id === id);
}

// ─── LINE POOLS ───────────────────────────────────────────────────────────
// Full lines rather than slot-fillers: "subject + verb + object" reads like a
// machine, and the whole point of a ghostwriter is that it does not.

const VERSE: Record<SongMood, string[]> = {
  aggressive: [
    'I came up out the mud and I ain\'t washing off the dirt',
    'Everything I ever wanted I went out and took',
    'They was laughing in the hallway now they quiet in the room',
    'I don\'t do the talking I just do the walking through',
    'Put my whole city on my back and never dropped it once',
    'You was counting me out while I was counting up the months',
    'Every door they closed I went and built another entrance',
    'I ain\'t never needed help I only needed distance',
    'Say it to my face or keep it in your little group',
    'I been turning pressure into diamonds in the booth',
    'Half of y\'all is scenery and half of y\'all is scared',
    'I remember every name that never showed up when I bled',
    'Loud in the beginning quiet when it mattered most',
    'I don\'t fear the fall I only fear the standing still',
  ],
  melancholy: [
    'Mama said the city take the softness out your eyes',
    'I been carrying a weight that nobody can see',
    'Every night the same ceiling and a different kind of tired',
    'I made it out the block but I left my brother there',
    'I got everything I asked for and I still don\'t feel it',
    'The phone don\'t ring the way it used to anymore',
    'I keep a light on for the people who ain\'t coming',
    'Some nights I talk to the version of me that gave up',
    'Rain on the window and a half-finished song',
    'I don\'t cry I just sit quiet for a long long time',
    'You can hold a whole city and still be on your own',
    'They love you when you up and disappear when you down',
    'I been writing letters that I never send',
    'Growing up is just learning what to let go of',
  ],
  celebratory: [
    'Top down on the highway and the sun is on my side',
    'We came from nothing now the whole room knows the name',
    'Bottles on the table and my people on the way',
    'Every day a holiday since I stopped asking permission',
    'Look at what we built out of a bedroom and a dream',
    'Somebody turn it up I want the neighbours to know',
    'I bought my mother a house and I ain\'t tell nobody yet',
    'Dancing on the roof because the ceiling got too small',
    'Money in the mattress and the mattress in a better house',
    'Whole squad eating now we used to split one plate',
    'I remember being broke I keep the receipt for the pain',
    'Tonight we celebrate the ones who said we couldn\'t',
    'Good energy good people good problems to have',
    'If you made it out with me then put your glass up high',
  ],
  introspective: [
    'I been asking myself questions that I already know',
    'Who am I when the lights go off and nobody is clapping',
    'I built a whole identity out of what they expected',
    'Every mirror in this house is asking me to sit down',
    'I don\'t know if this is healing or a better kind of hiding',
    'The boy in the photographs would not recognise me',
    'I traded silence for a stage and now I miss the quiet',
    'What is ambition if it eats the people that you love',
    'I keep the receipts of every version of myself',
    'Maybe peace is not a place it is a practice',
    'I been running from a version of me that never left',
    'You can win the whole thing and still not be alright',
    'I am learning how to sit inside an empty afternoon',
    'The hardest thing I ever did was stay when I could leave',
  ],
  sensual: [
    'The way you move is a whole conversation',
    'Come a little closer let me hear what you don\'t say',
    'You got a rhythm that the whole room is following',
    'Slow it down we got the whole night and no plans',
    'Your perfume in the air like a hook I can\'t shake',
    'Say my name again I like the way it sounds from you',
    'We don\'t need the lights we already know the way',
    'You are the only reason I am still in this city',
    'Skin on skin and the bassline underneath us',
    'Hold that pose I want to remember this exactly',
    'You don\'t ask for nothing and that is what I like',
    'Two of us and a playlist that nobody else would pick',
    'Every song is about you if I am being honest',
    'Stay until the morning I don\'t care about the traffic',
  ],
  defiant: [
    'You can take the money but you cannot take the hunger',
    'I ain\'t signing nothing that my mother cannot read',
    'Tell them I said it and tell them I meant every word',
    'I don\'t need your co-sign I need you out the way',
    'Bend but I don\'t break and I don\'t fold for nobody',
    'They can keep the trophy I am keeping the whole team',
    'I would rather be alone than be somebody\'s puppet',
    'Every no I ever got is fuel in the engine now',
    'Put a price on my peace and watch me not pay it',
    'I came this far without a hand I can go further without one',
    'Say it louder I want the whole industry to hear',
    'You don\'t own a single thing I made with my own hands',
    'I am not the underdog I am the one you were warned about',
    'Whatever they decided about me I decided different',
  ],
};

const HOOK: Record<SongMood, string[]> = {
  aggressive: [
    'We don\'t run we don\'t hide we just arrive',
    'Take the whole thing take the whole thing',
    'Pressure made a diamond out the boy',
    'Ain\'t no brakes on a road like this',
    'Say my name say it louder now',
  ],
  melancholy: [
    'I been holding on to nothing but the sound',
    'Come back come back the light is still on',
    'Nobody told me it would feel like this',
    'I am still here I am still here',
    'Rain don\'t ask permission when it falls',
  ],
  celebratory: [
    'We up we up and we ain\'t coming down',
    'Pour it up for everybody in the room',
    'Look at us look at us now',
    'Every night a holiday tonight',
    'Turn it up until the morning finds us',
  ],
  introspective: [
    'Who am I when the lights go out',
    'I am still learning how to be still',
    'Tell me something true about myself',
    'All this noise and I just want the quiet',
    'Maybe I already had enough',
  ],
  sensual: [
    'Stay a little longer stay the night',
    'Say it again say it slow',
    'You and me and the whole night free',
    'Nobody has to know about us',
    'Come closer come closer',
  ],
  defiant: [
    'I don\'t bend I don\'t break I don\'t fold',
    'Keep your trophy I keep my name',
    'We built this without you anyway',
    'No thank you and no again',
    'Still standing still standing still here',
  ],
};

const BRIDGE = [
  'And if it all falls down tonight I know exactly who I am',
  'They will write about us one day and get the story wrong',
  'I heard the city calling and I answered every time',
  'Nothing in this life is free except the sunrise',
  'So tell me what you want from me and I will tell you the truth',
  'Somewhere between the start and here I stopped keeping score',
  'The older that I get the less I need to prove',
  'I keep my people close and I keep my reasons closer',
  'Time is the only currency I never learned to save',
  'Whatever comes tomorrow I already survived today',
];

// Genre colour, used to tint a couple of lines so two records in different
// lanes do not read identically.
const GENRE_TEXTURE: Record<Genre, string[]> = Object.fromEntries(
  GENRE_LIST.map((g) => [g.id, g.texture as string[]]),
) as Record<Genre, string[]>;

/** Deterministic shuffle — same writer and take number gives the same sheet. */
function shuffled<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

export interface GhostwriteInput {
  writerId: string;
  mood: SongMood;
  genre: Genre;
  title: string;
  /** Changes the draw, so asking twice does not give the same sheet. */
  take: number;
}

/**
 * Produce a full lyric sheet. Sections are labelled so the analysis can see the
 * structure, and long enough that a good sheet genuinely reads as a finished song.
 */
export function ghostwrite(input: GhostwriteInput): string {
  const { writerId, mood, genre, title, take } = input;
  const writer = ghostwriterById(writerId);
  const seed = (writer ? writer.skill * 7919 : 4242) + take * 104729 + mood.length * 31;

  const versePool = shuffled(VERSE[mood] ?? VERSE.defiant, seed);
  const hookPool = shuffled(HOOK[mood] ?? HOOK.defiant, seed + 17);
  const bridgePool = shuffled(BRIDGE, seed + 41);
  const texture = shuffled(GENRE_TEXTURE[genre] ?? GENRE_TEXTURE.hip_hop, seed + 73);

  const verse1 = versePool.slice(0, 8);
  const verse2 = [...versePool.slice(8, 14), texture[0]];
  const hook = hookPool.slice(0, 4);
  const bridge = bridgePool.slice(0, 4);

  const lines: string[] = [];
  lines.push(`[Verse 1]`);
  lines.push(...verse1);
  lines.push('');
  lines.push('[Hook]');
  lines.push(...hook);
  lines.push('');
  lines.push('[Verse 2]');
  lines.push(...verse2);
  lines.push('');
  lines.push('[Hook]');
  lines.push(...hook);
  lines.push('');
  lines.push('[Bridge]');
  lines.push(...bridge, texture[1] ?? texture[0]);
  lines.push('');
  lines.push('[Outro]');
  lines.push(hook[0]);
  lines.push(`— "${title}"`);

  return lines.join('\n');
}

/** A short credit line for the song record. */
export function ghostwriterCredit(id: string): string {
  const w = ghostwriterById(id);
  return w ? `${w.name} (ghostwritten)` : 'Ghostwritten';
}
