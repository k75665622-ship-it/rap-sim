// ─── EVERY COUNTRY ITS OWN LOOK ────────────────────────────────────────────
// Skyline height, wall colours, grass and trees, and a national monument in
// the middle of town, so Lagos does not look like Accra and Tokyo does not
// look like either.

export interface CountryTheme {
  walls?: string[];
  grass: string;
  crown: string;
  trunk: string;
  /** Multiplies how tall the buildings grow. */
  hScale: number;
  arch: string;
}

const ARCH: Record<string, Omit<CountryTheme, 'arch'>> = {
  tropical: { grass: '#5b8f45', crown: '#4f8a3c', trunk: '#6b4a32', hScale: 1 },
  sahel: { walls: ['#e9d3a8', '#dcc08a', '#f1e2c0', '#cdb084', '#e6cda0'], grass: '#c8b27a', crown: '#7f9448', trunk: '#7a5a3a', hScale: 0.95 },
  gulf: { walls: ['#e8dcc0', '#d6c6a4', '#c4d2de', '#b8c8d6', '#efe6d2'], grass: '#cdb98a', crown: '#7f9a52', trunk: '#7a5a3a', hScale: 1.7 },
  europe: { walls: ['#b8b2aa', '#a39a8f', '#c4a38a', '#8f8a86', '#d3cdc4', '#b07a62'], grass: '#4c7f3c', crown: '#7a8f3a', trunk: '#5a4030', hScale: 0.85 },
  nordic: { walls: ['#e8c9a0', '#d9806a', '#8fb0c9', '#e6d9a8', '#c5d6c2'], grass: '#8fb29a', crown: '#2f5a43', trunk: '#4a3a2c', hScale: 0.8 },
  america: { walls: ['#c9ced6', '#9fb0c4', '#8e9bab', '#b7a590', '#7f93aa', '#d8d0c0'], grass: '#5f9a48', crown: '#3f7a38', trunk: '#5a4030', hScale: 1.5 },
  eastasia: { walls: ['#d8dce6', '#e6d6dc', '#bcc9d6', '#cfc9e0', '#f0e4ea'], grass: '#5a9a52', crown: '#3f8a4a', trunk: '#5a4030', hScale: 1.45 },
  southasia: { walls: ['#f0b88a', '#e8d27a', '#9fd3c0', '#f0a0a0', '#c9b0e0'], grass: '#6a9a3e', crown: '#4a8a30', trunk: '#6b4a32', hScale: 1.1 },
  seasia: { walls: ['#f4d9a0', '#9fd3c0', '#f0a0a0', '#a8c4d8', '#e8e4da'], grass: '#4f9a3c', crown: '#2f8a3a', trunk: '#6b4a32', hScale: 1.15 },
  latam: { walls: ['#f0b88a', '#e8d27a', '#9fd3c0', '#f0a0a0', '#c9b0e0', '#f4e0b0'], grass: '#5f9a3c', crown: '#3f8a3a', trunk: '#6b4a32', hScale: 1 },
  oceania: { walls: ['#e8e4da', '#b5d0e0', '#d9c8a8', '#c0d8c4', '#f0e4d0'], grass: '#7a9f4a', crown: '#6f9a4a', trunk: '#6b4a32', hScale: 1 },
  caribbean: { walls: ['#f4b6c2', '#a8e0d0', '#f4e08a', '#9fc4f0', '#f0c08a'], grass: '#4fa04a', crown: '#3f9a45', trunk: '#6b4a32', hScale: 0.8 },
  eafrica: { walls: ['#e3c9a0', '#d3a77a', '#c98f66', '#ecd9b5', '#b9a27f', '#f0e0c0'], grass: '#6f9a45', crown: '#5a8a3a', trunk: '#6b4a32', hScale: 0.95 },
};
const OF: Record<string, string[]> = {
  tropical: ['Ghana', 'Nigeria', 'Ivory Coast', 'Senegal', 'Cameroon', 'DR Congo', 'Angola', 'Burkina Faso', 'Mali'],
  eafrica: ['Kenya', 'Tanzania', 'Ethiopia', 'Uganda', 'Zambia', 'Zimbabwe', 'Mozambique', 'Rwanda', 'Botswana', 'Namibia', 'South Africa'],
  sahel: ['Egypt', 'Morocco', 'Tunisia', 'Algeria'],
  gulf: ['UAE', 'Saudi Arabia'],
  europe: ['UK', 'France', 'Germany', 'Netherlands', 'Ireland', 'Spain', 'Italy', 'Portugal', 'Poland', 'Russia', 'Belgium', 'Switzerland'],
  nordic: ['Sweden', 'Norway', 'Denmark'],
  america: ['USA', 'Canada'],
  eastasia: ['Japan', 'South Korea', 'China'],
  southasia: ['India', 'Pakistan', 'Bangladesh'],
  seasia: ['Indonesia', 'Philippines', 'Thailand', 'Vietnam', 'Malaysia'],
  latam: ['Brazil', 'Colombia', 'Mexico', 'Argentina', 'Chile', 'Peru'],
  oceania: ['Australia', 'New Zealand'],
  caribbean: ['Jamaica', 'Puerto Rico', 'Dominican Republic', 'Trinidad', 'Cuba', 'Haiti', 'Barbados'],
};

export function themeFor(country: string): CountryTheme {
  const arch = Object.keys(OF).find((k) => OF[k].includes(country)) ?? 'tropical';
  const base = ARCH[arch];
  // Japan's trees are cherry blossom.
  return { ...base, arch, crown: country === 'Japan' ? '#eaa6c4' : base.crown };
}

const FLAGS: Record<string, string[]> = {
  Ghana: ['#cf2b2b', '#f3c623', '#1e8f4d'], Nigeria: ['#1e8f4d', '#ffffff', '#1e8f4d'], USA: ['#c8323c', '#ffffff', '#2b4a9a'], UK: ['#2b3f8f', '#ffffff', '#c8323c'],
  France: ['#2b4a9a', '#ffffff', '#c8323c'], Germany: ['#222222', '#d22222', '#f0c000'], Italy: ['#2e8b4f', '#ffffff', '#c8323c'], Spain: ['#c8323c', '#f0c000', '#c8323c'],
  Brazil: ['#2e9a4f', '#f0d000', '#2b4a9a'], Japan: ['#ffffff', '#c8323c', '#ffffff'], India: ['#ff9933', '#ffffff', '#138808'], China: ['#c8323c', '#f0d000', '#c8323c'],
  'South Africa': ['#1e8f4d', '#f0c000', '#2b4a9a'], Kenya: ['#222222', '#c8323c', '#1e8f4d'], Egypt: ['#c8323c', '#ffffff', '#222222'], Morocco: ['#c8323c', '#1e8f4d', '#c8323c'],
  Algeria: ['#1e8f4d', '#ffffff', '#c8323c'], Canada: ['#c8323c', '#ffffff', '#c8323c'], Mexico: ['#1e8f4d', '#ffffff', '#c8323c'], Jamaica: ['#1e8f4d', '#f0c000', '#222222'],
  Australia: ['#2b3f8f', '#ffffff', '#c8323c'], Senegal: ['#1e8f4d', '#f0c000', '#c8323c'], 'Ivory Coast': ['#f08a1e', '#ffffff', '#1e8f4d'], Ethiopia: ['#1e8f4d', '#f0c000', '#c8323c'],
  Netherlands: ['#c8323c', '#ffffff', '#2b4a9a'], Sweden: ['#2b6aa8', '#f0c000', '#2b6aa8'], Ireland: ['#1e8f4d', '#ffffff', '#f08a1e'], 'South Korea': ['#ffffff', '#c8323c', '#2b4a9a'],
  Argentina: ['#74acdf', '#ffffff', '#74acdf'], Colombia: ['#f0d000', '#2b4a9a', '#c8323c'], Russia: ['#ffffff', '#2b4a9a', '#c8323c'], UAE: ['#c8323c', '#ffffff', '#222222'],
};
/** Three flag colours for the national monument. */
export function flagOf(country: string): string[] {
  if (FLAGS[country]) return FLAGS[country];
  const set = ['#c8323c', '#2b4a9a', '#1e8f4d', '#f0c000', '#ffffff', '#222222', '#f08a1e'];
  let h = 7; for (const c of country) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [set[h % 7], set[(h >> 3) % 7], set[(h >> 6) % 7]];
}
