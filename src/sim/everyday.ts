// ─── EVERYDAY LIFE ON THE TIMELINE ─────────────────────────────────────────
// A feed that is only artists talking about music feels like an ad. Real
// timelines are mostly normal people: the traffic, the food, the lights going
// off, football, church, school, the weather, a joke that landed, a song they
// can't stop playing. Posted by invented accounts, flavoured by where you live
// and what time it is.

function h(s: string): number {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}
const pick = <T,>(a: T[], seed: string): T => a[h(seed) % a.length];

export type LifeApp = 'chirp' | 'snapgram' | 'clip';
export interface LifePost { text: string; app: LifeApp; kind: 'thought' | 'photo' | 'bts' }

const COMMON: string[] = [
  'Monday again. Who approved this?', 'Why does the weekend always feel like 4 hours long', 'Me: I\'ll sleep early tonight. Also me at 2am: 👀',
  'Data finished just as the video was getting interesting 😭', 'Tell me why my phone is at 3% when I just charged it', 'Good morning. Don\'t let anybody rush you today 🙏🏾',
  'The way my mum knows I\'m hungry before I say it', 'Small small, things are getting better. Believe that.', 'Somebody explain how it\'s already the 20th',
  'Friends who check on you without being asked are rare. Appreciate them.', 'Nobody:\nMe: replaying one song for 3 hours', 'Weekend plan: sleep, eat, repeat 😴',
  'Overthinking is a full-time job and the pay is zero', 'One day I\'ll have a quiet morning and I\'ll know I made it', 'Rate your week 1–10. I\'ll go first: 4',
  'The group chat has 400 unread and none of it matters 😂', 'Gym starts Monday. Said that last Monday too.', 'Money doesn\'t finish. It just changes hands.',
  'Found money in an old jacket today. The universe is kind 🙏🏾', 'Why is nobody talking about how tired we all are', 'Back to school/work/hustle, whatever you call it. We move.',
  'Saw a guy walking his goat on a leash today. Respect.', 'My neighbour\'s generator and I are no longer friends', 'Hot take: breakfast is the best meal and it\'s not close',
  'If you\'re reading this, drink water 💧', 'Ladies and gentlemen, I have survived another meeting that could have been a text', 'Soon come. Everything you\'re praying for.',
  'Mood: pretending to listen while thinking about food 🍲', 'Happy birthday to my guy, you\'re doing great ❤️', 'Not me crying at a wedding video of strangers 😭',
];

const BY_COUNTRY: Record<string, string[]> = {
  Ghana: [
    'Dumsor again? In this heat? 😭', 'Trotro fare went up AGAIN. Mate, we are walking.', 'Waakye for lunch, no further questions 🍛', 'Kenkey and fried fish on a Saturday is peace',
    'Chale, the traffic from Kasoa this morning was a movie', 'Who is selling cold sobolo near Osu? Asking for a friend', 'Accra weather: sun, rain, sun, rain. Pick one.',
    'Black Stars match day. Whole country on mute until the final whistle ⚽', 'Banku and tilapia, hot pepper on the side. Say less.', 'The way "small" means "very big" in Ghana 😂 "small small"',
    'Church was long today but the jollof after was worth it', 'Harmattan skin is real. Moisturise, people.', 'Mobile money charges are testing my patience 😤',
    'Kumasi people, wo ho te sɛn? 🙌🏾', 'Rainy season has started and the drains have started acting up', 'Borla in the road again. Accra, we deserve better.',
    'Hiplife classics in the trotro. Best therapy.', 'Saturday funeral crowd outfits are a fashion week 🖤', 'Chop bar lunch hits different when it\'s raining',
  ],
  Nigeria: [
    'NEPA took light again. Naija, we move 😂', 'Lagos traffic is a lifestyle, not a problem', 'Suya at midnight is a love language 🍢', 'How far? Everybody survived the week?',
    'Jollof wars: I\'m not even picking a side today, I\'m just hungry', 'Okada man just took a road that doesn\'t exist', 'The generator is the real landlord in this compound',
    'Abeg, who has data to share? Mine finished 😭', 'Owambe this weekend, aso ebi ready 👗', 'Danfo conductor and I have been fighting since 7am',
    'Harmattan don land, my lips are dead 😭', 'Naija weather: either too hot or too wet. No middle.', 'Super Eagles match today. Nobody talk to me for 90 minutes ⚽',
    'Ojuelegba at 6pm is a survival game', 'Moi moi and pap on a cold morning = peace', 'Fuel queue again. We just continue.', 'Abuja people, how the weather today?', 'Detty December planning has started and my account is crying',
  ],
  Kenya: ['Matatu playlists are the best radio in the country 🎶', 'Nairobi traffic: 1 hour for 5km. Normal.', 'Nyama choma Saturday, no excuses 🍖', 'Ugali and sukuma, simple and perfect', 'M-Pesa float finished at the worst time 😭'],
  'South Africa': ['Load shedding schedule just ruined my plans 😭', 'Braai on Sunday, that\'s the whole plan 🔥', 'Taxi rank at 5pm is a different planet', 'Amapiano on a Friday evening hits right 🎹', 'Joburg weather: four seasons in one day'],
  'United States': ['Gas prices are not it today', 'Coffee first, personality later ☕', 'Traffic on the 405 is a personality test', 'Who else is already tired of this week?', 'Game day food is the real MVP 🏈'],
  'United Kingdom': ['Rain again. Shocker 🌧️', 'Tube strike? Shocker.', 'Chicken shop on a Friday is sacred', 'Mild is the only weather we know', 'Football on Saturday, pub after ⚽'],
};

const MORNING = ['Good morning 🌅 let\'s get it', 'Up before the sun. Hustle never sleeps.', 'Morning prayers, then the day. We move 🙏🏾', 'Woke up grateful. Small win.', 'Tea, a plan, and no phone for the first hour. Trying it.'];
const NIGHT = ['Can\'t sleep, music on 🎧', 'Late night thoughts: we\'re doing fine.', '2am and the playlist is the only honest friend', 'Night shift energy, send snacks', 'Goodnight, tomorrow is another chance 🌙'];

const CLIP_LIFE = ['POV: your mum finds out you ate the last piece 😂', 'Day in my life: traffic, food, sleep. Repeat.', 'Trying the viral dance. It went badly. 🤣', 'Tour of my tiny kitchen in 15 seconds', 'My cat doesn\'t care about my deadlines 🐈', 'Cooking for the first time without calling my mum. Wish me luck.'];
const PHOTO_LIFE = ['Sunset from the roof ☀️', 'Street food, 10/10 🍢', 'New haircut, same stress 💈', 'Weekend with the family 🫶🏾', 'Market day colours 🌶️', 'Rain on the window, tea in hand ☔'];

const SEASON: Record<number, string[]> = {
  11: ['Harmattan is here. Vaseline stock up.', 'December vibes loading 🎄'], 0: ['New year, same me, better plan', 'January is the longest month and I have the receipts'],
  1: ['Valentine\'s and my account are not on speaking terms', 'February is short. My salary isn\'t.'], 5: ['Rainy season: umbrellas are the currency now ☔'], 6: ['Mid-year check-in: what did you finish?'],
  9: ['Q4 is here. Time to finish what we started.'],
};

/** Posts from ordinary people, with a hint of where and when. */
export function everydayPost(opts: { country?: string; seed: string; hour: number; month: number }): LifePost {
  const r = h(opts.seed + 'r') % 100;
  const local = BY_COUNTRY[opts.country ?? ''] ?? [];
  if (r < 14) return { text: pick(CLIP_LIFE, opts.seed + 'c'), app: 'clip', kind: 'bts' };
  if (r < 28) return { text: pick(PHOTO_LIFE, opts.seed + 'p'), app: 'snapgram', kind: 'photo' };
  const hour = opts.hour;
  if (r < 38 && hour >= 5 && hour < 10) return { text: pick(MORNING, opts.seed + 'm'), app: 'chirp', kind: 'thought' };
  if (r < 38 && (hour >= 23 || hour < 4)) return { text: pick(NIGHT, opts.seed + 'n'), app: 'chirp', kind: 'thought' };
  const seasonal = SEASON[opts.month];
  if (r < 46 && seasonal) return { text: pick(seasonal, opts.seed + 's'), app: 'chirp', kind: 'thought' };
  if (local.length && r < 78) return { text: pick(local, opts.seed + 'l'), app: 'chirp', kind: 'thought' };
  return { text: pick(COMMON, opts.seed + 'x'), app: 'chirp', kind: 'thought' };
}

/** Fans reacting to a record that is out in the scene — about the music, not about you. */
export function sceneFanPost(opts: { title: string; artist: string; seed: string }): LifePost {
  const t = opts.title, a = opts.artist;
  return {
    app: h(opts.seed + 'a') % 4 === 0 ? 'clip' : 'chirp', kind: 'thought',
    text: pick([
      `"${t}" by ${a} is stuck in my head and I can't complain`, `${a} really did that on "${t}" 🔥`, `Who else has "${t}" on repeat? Just me?`, `Second verse on "${t}" is crazy work`,
      `Taxi driver was playing "${t}" and everyone in the car knew every word 😭`, `${a} - "${t}". That's the post.`, `Played "${t}" at the party and the whole room went up`,
      `Can we talk about the beat on "${t}"? Producer deserves a raise`, `Ranking ${a}'s catalogue: "${t}" is top 3 for me`, `${a} is quietly one of the best out right now. "${t}" proves it.`,
    ], opts.seed + 'p'),
  };
}
