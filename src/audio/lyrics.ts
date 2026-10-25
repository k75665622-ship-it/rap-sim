// Original bars for the people in the game — nothing borrowed from real songs.
import { hashString } from '../sim/rng';

const VERSE = [
  'Came up from the bottom where the lights don\'t reach', 'now the whole {city} knows the way I speak',
  'Every road I walked, I walked it on my own', 'now they call my phone like they knew me all along',
  'Mama said be patient, I was patient for a while', 'now the patience paying off and you can see it in my smile',
  'They was sleeping on me, now they wide awake', 'every single move I make, I make it for the take',
  'Started in a bedroom with a mic and a dream', 'now I\'m in the booth and it\'s a whole different scene',
  'Pressure make diamonds, I been under it for years', 'turned all the doubt into the fuel for my career',
  'I don\'t chase the hype, I let the hype chase me', 'one verse, one shot, that\'s the way it gotta be',
  'Late nights, early flights, I don\'t sleep enough', 'when you love what you do, then it never feel rough',
  'Ten toes down in the city where I\'m from', 'they ain\'t believe it till they heard the way I come',
  'Money on my mind but the music in my soul', 'I was born to do this, now I\'m playing every role',
];
const HOOK = ['{title}, yeah, {title}', 'Say it loud — {title}', 'Run it back, it\'s {title}', 'Everybody singing {title}', 'Oh-oh, {title}', 'All night, {title}'];

export function linesFor(seed: string, n: number, ctx: { city: string; title: string }): string[] {
  const out: string[] = [];
  let i = hashString(seed) % VERSE.length;
  if (i % 2) i -= 1;
  while (out.length < n) { out.push(VERSE[i % VERSE.length]); out.push(VERSE[(i + 1) % VERSE.length]); i += 2 + 2 * (hashString(seed + out.length) % 3); }
  return out.slice(0, n).map((l) => l.replace(/\{city\}/g, ctx.city));
}

export function hookFor(seed: string, title: string): string[] {
  const a = HOOK[hashString(seed) % HOOK.length];
  const b = HOOK[(hashString(seed) + 3) % HOOK.length];
  return [a, b, a, b].map((l) => l.replace(/\{title\}/g, title));
}
