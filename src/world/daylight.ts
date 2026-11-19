// ─── THE CITY: DAY AND NIGHT ───────────────────────────────────────────────
//
// What the sky and the light look like at a given minute of the game clock.
// The clock runs at 10 game minutes a second, so a whole day goes by in about
// two and a half minutes of play: sunrise, noon, sunset and night are all
// things a player actually sees.

import * as THREE from 'three';

export interface Daylight {
  sky: THREE.Color;
  /** Unit vector towards the light source (the sun by day, the moon by night). */
  lightDir: THREE.Vector3;
  sunUp: boolean;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  /** 0 = broad daylight, 1 = full night. Drives lamps, windows and stars. */
  night: number;
  fogNear: number;
  fogFar: number;
}

// Keyframes by hour. Colours are blended between neighbours.
const KEYS: Array<{ h: number; sky: string; sun: string; sunI: number; hSky: string; hGround: string; hI: number; night: number }> = [
  { h: 0, sky: '#0a1026', sun: '#9fb6ff', sunI: 0.5, hSky: '#41538a', hGround: '#1b1b26', hI: 0.75, night: 1 },
  { h: 4.8, sky: '#121a3c', sun: '#9fb6ff', sunI: 0.45, hSky: '#45558a', hGround: '#1d1d28', hI: 0.75, night: 1 },
  { h: 5.8, sky: '#5a4a7a', sun: '#ff9f7a', sunI: 0.45, hSky: '#8a7ab0', hGround: '#3a3036', hI: 0.8, night: 0.7 },
  { h: 6.5, sky: '#f4a982', sun: '#ffb27a', sunI: 1.0, hSky: '#ffd2b0', hGround: '#5a4a40', hI: 0.95, night: 0.25 },
  { h: 7.5, sky: '#b5d2ee', sun: '#ffe7c4', sunI: 1.6, hSky: '#dcecff', hGround: '#6b6050', hI: 1.15, night: 0 },
  { h: 12, sky: '#9cc3e6', sun: '#fff4e0', sunI: 1.95, hSky: '#e4f0ff', hGround: '#6b6050', hI: 1.25, night: 0 },
  { h: 16.5, sky: '#a5c4e4', sun: '#ffe6bf', sunI: 1.75, hSky: '#e0ecff', hGround: '#6b6050', hI: 1.2, night: 0 },
  { h: 17.8, sky: '#f2a46e', sun: '#ffab66', sunI: 1.2, hSky: '#ffd0a8', hGround: '#5e4a3c', hI: 1.0, night: 0.15 },
  { h: 18.6, sky: '#d9665a', sun: '#ff7d55', sunI: 0.75, hSky: '#c88aa0', hGround: '#3d3038', hI: 0.85, night: 0.45 },
  { h: 19.4, sky: '#33295a', sun: '#a69cf0', sunI: 0.5, hSky: '#5a5a9a', hGround: '#222230', hI: 0.75, night: 0.85 },
  { h: 20.5, sky: '#0d1430', sun: '#9fb6ff', sunI: 0.5, hSky: '#41538a', hGround: '#1b1b26', hI: 0.75, night: 1 },
  { h: 24, sky: '#0a1026', sun: '#9fb6ff', sunI: 0.5, hSky: '#41538a', hGround: '#1b1b26', hI: 0.75, night: 1 },
];

const C = (hex: string) => new THREE.Color(hex);
const PARSED = KEYS.map((k) => ({ ...k, skyC: C(k.sky), sunC: C(k.sun), hSkyC: C(k.hSky), hGroundC: C(k.hGround) }));

const out: Daylight = {
  sky: new THREE.Color(), lightDir: new THREE.Vector3(), sunUp: true, sunColor: new THREE.Color(), sunIntensity: 1,
  hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), hemiIntensity: 1, night: 0, fogNear: 70, fogFar: 240,
};

/** Light for a minute of the day (0–1440, fractions welcome). Reuses one object. */
export function daylightAt(minute: number): Daylight {
  const h = ((((minute % 1440) + 1440) % 1440) / 60);
  let i = 0;
  while (i < PARSED.length - 2 && PARSED[i + 1].h <= h) i++;
  const a = PARSED[i], b = PARSED[i + 1];
  const t = Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h)));
  // Ease within each stretch so changes start and settle gently.
  const e = t * t * (3 - 2 * t);
  out.sky.copy(a.skyC).lerp(b.skyC, e);
  out.sunColor.copy(a.sunC).lerp(b.sunC, e);
  out.hemiSky.copy(a.hSkyC).lerp(b.hSkyC, e);
  out.hemiGround.copy(a.hGroundC).lerp(b.hGroundC, e);
  out.sunIntensity = a.sunI + (b.sunI - a.sunI) * e;
  out.hemiIntensity = a.hI + (b.hI - a.hI) * e;
  out.night = a.night + (b.night - a.night) * e;

  // The sun rises in the east (+x) at 06:00, is overhead at noon and sets in
  // the west at 18:00. At night the moon takes the opposite side of the sky.
  const ang = ((h - 6) / 12) * Math.PI;
  out.lightDir.set(Math.cos(ang), Math.sin(ang), 0.35).normalize();
  out.sunUp = out.lightDir.y > -0.05;
  if (!out.sunUp) out.lightDir.set(-out.lightDir.x, -out.lightDir.y, -0.35).normalize();
  // Never let the light skim along the ground: it makes walls black.
  if (out.lightDir.y < 0.25) { out.lightDir.y = 0.25; out.lightDir.normalize(); }

  out.fogNear = 70 - out.night * 25;
  out.fogFar = 240 - out.night * 60;
  return out;
}

/** Shortest way round the clock from `from` to `to`, in minutes (−720…720). */
export function minuteDelta(from: number, to: number): number {
  return ((((to - from) % 1440) + 2160) % 1440) - 720;
}
