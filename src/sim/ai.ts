// ─── THE CLAUDE API ────────────────────────────────────────────────────────
//
// Optional. With a key, the people around you write their own messages,
// replies, posts and interview questions; without one, the game uses its
// built-in writing exactly as before.
//
// Cost control is the whole design:
//   · the key, settings and usage live in this browser only (never in a save)
//   · a hard daily cap on calls, counted per real day
//   · one request at a time, spaced out, with a short timeout
//   · short answers (small max_tokens), thinking off, the cheapest model by default
//   · the long, unchanging game rules are sent as a cached system block
//   · on any error the caller falls back to the built-in text
//
// Real-name rule: nothing here is ever asked to write words for a real person.
// Callers filter, and `scrubRealNames` checks what comes back.

export type AIFeature = 'dms' | 'moments' | 'social' | 'interviews' | 'director';

export interface AISettings {
  enabled: boolean;
  key: string;
  model: string;
  dailyCap: number;
  features: Record<AIFeature, boolean>;
}

export interface AIUsage {
  day: string;
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  errors: number;
  lastError?: string;
}

export const AI_MODELS: { id: string; label: string; note: string; inPrice: number; outPrice: number }[] = [
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Fastest and cheapest. Recommended.', inPrice: 0.1, outPrice: 0.5 },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Better writing, about 20× the cost.', inPrice: 2, outPrice: 10 },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Best writing, about 40× the cost.', inPrice: 4, outPrice: 20 },
];

const SETTINGS_KEY = 'rl-ai-settings';
const USAGE_KEY = 'rl-ai-usage';

const DEFAULTS: AISettings = {
  enabled: false,
  key: '',
  model: 'claude-haiku-5-5',
  dailyCap: 300,
  features: { dms: true, moments: true, social: true, interviews: true, director: true },
};

let cache: AISettings | null = null;
const listeners = new Set<() => void>();

function readJSON<T>(k: string): T | null {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function writeJSON(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: settings last for the session */ }
}

export function aiSettings(): AISettings {
  if (!cache) {
    const saved = readJSON<Partial<AISettings>>(SETTINGS_KEY);
    cache = { ...DEFAULTS, ...(saved ?? {}), features: { ...DEFAULTS.features, ...(saved?.features ?? {}) } };
  }
  return cache;
}

export function saveAISettings(patch: Partial<AISettings>): AISettings {
  const next = { ...aiSettings(), ...patch, features: { ...aiSettings().features, ...(patch.features ?? {}) } };
  cache = next;
  writeJSON(SETTINGS_KEY, next);
  listeners.forEach((f) => f());
  return next;
}

export function onAIChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function aiUsage(): AIUsage {
  const u = readJSON<AIUsage>(USAGE_KEY);
  if (!u || u.day !== today()) return { day: today(), calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, errors: 0 };
  return u;
}

function bumpUsage(patch: Partial<Omit<AIUsage, 'day'>>): void {
  const u = aiUsage();
  const next: AIUsage = {
    ...u,
    calls: u.calls + (patch.calls ?? 0),
    input: u.input + (patch.input ?? 0),
    output: u.output + (patch.output ?? 0),
    cacheRead: u.cacheRead + (patch.cacheRead ?? 0),
    cacheWrite: u.cacheWrite + (patch.cacheWrite ?? 0),
    errors: u.errors + (patch.errors ?? 0),
    lastError: patch.lastError ?? u.lastError,
  };
  writeJSON(USAGE_KEY, next);
  listeners.forEach((f) => f());
}

/** Rough dollars spent today, from the token counts and the model's price. */
export function estimateCost(u: AIUsage, modelId: string): number {
  const m = AI_MODELS.find((x) => x.id === modelId) ?? AI_MODELS[0];
  return (u.input * m.inPrice + u.cacheWrite * m.inPrice * 1.25 + u.cacheRead * m.inPrice * 0.1 + u.output * m.outPrice) / 1e6;
}

/** Is the AI available for this job right now? Cheap enough to call anywhere. */
export function aiActiveFor(feature: AIFeature): boolean {
  const s = aiSettings();
  return s.enabled && !!s.key && s.features[feature] && aiUsage().calls < s.dailyCap;
}

// ─── THE CALL ──────────────────────────────────────────────────────────────

export class AIError extends Error {
  constructor(message: string, public kind: 'budget' | 'auth' | 'rate' | 'network' | 'bad' | 'off') { super(message); }
}

export interface AICall {
  feature: AIFeature;
  /** The long rules block, cached. Keep it identical between calls. */
  rules: string;
  /** Per-call context: who is talking, what happened. */
  context?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  /** Skip the on/off switches (the settings screen's test button). */
  force?: boolean;
}

let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;
const MIN_GAP_MS = 700;
const TIMEOUT_MS = 20000;

/** One request through the queue. Throws AIError on any failure. */
export function callClaude(req: AICall): Promise<string> {
  const run = async (): Promise<string> => {
    const s = aiSettings();
    if (!s.key) throw new AIError('No API key', 'off');
    if (!req.force && !s.enabled) throw new AIError('AI is off', 'off');
    if (!req.force && !s.features[req.feature]) throw new AIError('Feature off', 'off');
    if (aiUsage().calls >= s.dailyCap) throw new AIError('Daily limit reached', 'budget');
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();

    const system: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [
      { type: 'text', text: req.rules, cache_control: { type: 'ephemeral' } },
    ];
    if (req.context) system.push({ type: 'text', text: req.context });

    const body: Record<string, unknown> = {
      model: s.model,
      max_tokens: req.maxTokens ?? 300,
      system,
      messages: req.messages,
      thinking: { type: 'disabled' },
    };

    const attempt = async (b: Record<string, unknown>): Promise<Response> => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        return await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': s.key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify(b),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(t);
      }
    };

    let res: Response;
    try {
      res = await attempt(body);
      // A model that doesn't accept `thinking: disabled` — retry without it.
      if (res.status === 400) {
        const txt = await res.clone().text();
        if (/thinking/i.test(txt)) { delete body.thinking; res = await attempt(body); }
      }
      if (res.status === 429 || res.status === 529) {
        const after = Math.min(8, Number(res.headers.get('retry-after')) || 3);
        await new Promise((r) => setTimeout(r, after * 1000));
        res = await attempt(body);
      }
    } catch (e) {
      bumpUsage({ errors: 1, lastError: 'Network error or timeout' });
      throw new AIError(e instanceof Error ? e.message : 'Network error', 'network');
    }

    bumpUsage({ calls: 1 });
    if (res.status === 401 || res.status === 403) {
      bumpUsage({ errors: 1, lastError: 'The API key was rejected' });
      throw new AIError('The API key was rejected', 'auth');
    }
    if (res.status === 429 || res.status === 529) {
      bumpUsage({ errors: 1, lastError: 'Rate limited by the API' });
      throw new AIError('Rate limited', 'rate');
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      bumpUsage({ errors: 1, lastError: `API error ${res.status}: ${txt.slice(0, 120)}` });
      throw new AIError(`API error ${res.status}`, 'bad');
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } };
    const u = data.usage ?? {};
    bumpUsage({ input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 });
    const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim();
    if (!text) throw new AIError('Empty answer', 'bad');
    return text;
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

/** Pull the first JSON object or array out of a model answer. */
export function parseJSON<T>(text: string): T | null {
  const start = text.search(/[[{]/);
  if (start < 0) return null;
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  const end = text.lastIndexOf(close);
  if (end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as T; } catch { return null; }
}

/** True if the text names any real person we must not put words on. */
export function mentionsAny(text: string, names: string[]): boolean {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return names.some((n) => {
    const k = n.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    return k.length >= 3 && t.includes(` ${k} `);
  });
}

/** A tiny test call for the settings screen. */
export async function testKey(): Promise<string> {
  return callClaude({
    feature: 'dms',
    rules: 'You are a test endpoint for a music career game. Reply with exactly: OK',
    messages: [{ role: 'user', content: 'ping' }],
    maxTokens: 5,
    force: true,
  });
}
