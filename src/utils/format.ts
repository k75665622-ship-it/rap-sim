// ─── NUMBER AND TEXT FORMATTING ────────────────────────────────────────────
// Every figure in the app is a real number from the save. These helpers only
// shorten it for display — they never invent or round away the value.

const UNITS = [
  { at: 1_000_000_000_000, suffix: 'T' },
  { at: 1_000_000_000, suffix: 'B' },
  { at: 1_000_000, suffix: 'M' },
  { at: 1_000, suffix: 'K' },
];

/** 12,345,678 → "12.3M". Keeps one decimal until it stops mattering. */
export function compact(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  for (const u of UNITS) {
    if (abs >= u.at) {
      const v = n / u.at;
      return `${v >= 100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, '')}${u.suffix}`;
    }
  }
  return Math.round(n).toLocaleString();
}

/** Full precision with thousands separators. */
export function full(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

export function money(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

export function moneyCompact(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  if (Math.abs(n) < 10_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${compact(n)}`;
}

/** Rates need the small end of the scale, so they get their own formatter. */
export function money4(n: number | undefined | null): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  if (Math.abs(n) < 0.01) return `$${n.toFixed(4)}`;
  if (Math.abs(n) < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function pct(n: number | undefined | null, digits = 0): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

/** +12.4% / -3.1% — signed, for growth readouts. */
export function signedPct(n: number | undefined | null, digits = 1): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  const v = n * 100;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(digits)}%`;
}

/** 754 → "12:34" for video durations. */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Two letters for an artwork tile: "Accra Midnight" → "AM". */
export function initials(text: string): string {
  const words = text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '··';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** 'pop_rap' → 'Pop rap'. Genre keys are internal; the UI should not show them. */
export function genreLabel(genre: string | undefined): string {
  if (!genre) return '—';
  const s = genre.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
