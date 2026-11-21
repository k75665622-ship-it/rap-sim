// Local-first analytics: where players stop, how long sessions last, and what
// they do first. Nothing leaves the device; this is a ring buffer in
// localStorage that a later stage can choose to upload.
interface Ev { t: number; n: string; d?: string }
const KEY = 'rl-analytics';
const MAX = 400;
let sessionStart = Date.now();
let lastScreen = '';

function read(): Ev[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Ev[]; } catch { return []; } }
function write(e: Ev[]) { try { localStorage.setItem(KEY, JSON.stringify(e.slice(-MAX))); } catch { /* full */ } }

export function track(n: string, d?: string) {
  const e = read(); e.push({ t: Date.now(), n, d }); write(e);
}
export function trackScreen(id: string) {
  if (id === lastScreen) return; lastScreen = id; track('screen', id);
}
export function startAnalytics() {
  sessionStart = Date.now(); track('session_start');
  const leave = () => { track('session_end', `${Math.round((Date.now() - sessionStart) / 1000)}s@${lastScreen}`); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); else { sessionStart = Date.now(); track('session_start'); } });
  window.addEventListener('pagehide', leave);
  (window as unknown as { __rapAnalytics: unknown }).__rapAnalytics = { summary, events: read, clear: () => write([]) };
}
/** Sessions, average length, the first thing each session did, and the screens people leave from. */
export function summary() {
  const ev = read();
  const ends = ev.filter((e) => e.n === 'session_end');
  const secs = ends.map((e) => parseInt(e.d ?? '0', 10)).filter((x) => x > 0);
  const leaves: Record<string, number> = {};
  ends.forEach((e) => { const s = (e.d ?? '').split('@')[1] ?? '?'; leaves[s] = (leaves[s] ?? 0) + 1; });
  const firsts: Record<string, number> = {};
  let fresh = false;
  for (const e of ev) { if (e.n === 'session_start') fresh = true; else if (fresh && e.n === 'screen') { firsts[e.d ?? '?'] = (firsts[e.d ?? '?'] ?? 0) + 1; fresh = false; } }
  return {
    sessions: ev.filter((e) => e.n === 'session_start').length,
    avgSessionSec: secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : 0,
    leaveScreens: leaves, firstScreens: firsts,
    missions: ev.filter((e) => e.n === 'mission').map((e) => ({ id: e.d, at: e.t })),
  };
}
