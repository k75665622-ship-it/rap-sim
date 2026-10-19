// ─── THE AI ────────────────────────────────────────────────────────────────
//
// Optional, and bring-your-own: Claude, OpenAI, Gemini, Groq, Grok, OpenRouter,
// DeepSeek, Mistral, or a model on your own computer. With a key, the people
// around you write their own messages,
// replies, posts and interview questions; without one, the game uses its
// built-in writing exactly as before.
//
// Cost control is the whole design:
//   · the key, settings and usage live in this browser only, per account (never in a save, never on the server)
//   · a hard daily cap on calls, counted per real day
//   · one request at a time, spaced out, with a short timeout
//   · short answers (small max_tokens), thinking off, the cheapest model by default
//   · the long, unchanging game rules are sent as a cached system block
//   · on any error the caller falls back to the built-in text
//
// Real-name rule: nothing here is ever asked to write words for a real person.
// Callers filter, and `scrubRealNames` checks what comes back.

export type AIFeature = 'dms' | 'moments' | 'social' | 'interviews' | 'director';

// ─── PROVIDERS ─────────────────────────────────────────────────────────────
//
// Any key the player has. Three wire formats cover them all: Anthropic's
// Messages API, Google's Gemini API, and the OpenAI-style chat completions
// that OpenAI, Groq, xAI, OpenRouter, DeepSeek, Mistral and local servers
// (Ollama, LM Studio) all speak. Default models are a starting point — every
// model field is editable and "Fetch models" lists what the key can use.

export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'groq' | 'xai' | 'openrouter' | 'deepseek' | 'mistral' | 'ollama' | 'custom';
type Wire = 'anthropic' | 'openai' | 'gemini';

export interface ModelDef { id: string; label: string; note?: string; inPrice?: number; outPrice?: number }
export interface ProviderDef {
  id: ProviderId;
  label: string;
  wire: Wire;
  base: string;
  defaultModel: string;
  models: ModelDef[];
  keyHint: string;
  keyUrl?: string;
  /** No key needed (a server on your own machine). */
  keyless?: boolean;
  /** Reasoning models: how to keep them brief. */
  reasoning?: 'openai' | 'groq';
  note?: string;
}

export const PROVIDERS: ProviderDef[] = [
  { id: 'anthropic', label: 'Claude (Anthropic)', wire: 'anthropic', base: 'https://api.anthropic.com/v1', defaultModel: 'claude-haiku-5-5', keyHint: 'sk-ant-…', keyUrl: 'platform.claude.com → API keys',
    models: [
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Fast and cheap. Recommended.', inPrice: 0.1, outPrice: 0.5 },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Better writing, ~20× the cost.', inPrice: 2, outPrice: 10 },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Best writing, ~40× the cost.', inPrice: 4, outPrice: 20 },
    ] },
  { id: 'openai', label: 'OpenAI', wire: 'openai', base: 'https://api.openai.com/v1', defaultModel: 'gpt-6-luna', keyHint: 'sk-…', keyUrl: 'platform.openai.com → API keys', reasoning: 'openai',
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna', note: 'Cheapest current model.', inPrice: 0.1, outPrice: 0.5 },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', note: 'Stronger, ~20× the cost.', inPrice: 2, outPrice: 10 },
    ] },
  { id: 'gemini', label: 'Google Gemini', wire: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-3.6-flash', keyHint: 'AIza…', keyUrl: 'aistudio.google.com → Get API key',
    models: [{ id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', note: 'Fast; has a free tier.' }] },
  { id: 'groq', label: 'Groq', wire: 'openai', base: 'https://api.groq.com/openai/v1', defaultModel: 'openai/gpt-oss-20b', keyHint: 'gsk_…', keyUrl: 'console.groq.com → API keys', reasoning: 'groq',
    models: [
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'Very fast, very cheap.', inPrice: 0.075, outPrice: 0.3 },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'Smarter, still cheap.', inPrice: 0.15, outPrice: 0.6 },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    ] },
  { id: 'xai', label: 'Grok (xAI)', wire: 'openai', base: 'https://api.x.ai/v1', defaultModel: 'grok-4.3', keyHint: 'xai-…', keyUrl: 'console.x.ai → API keys',
    models: [{ id: 'grok-4.3', label: 'Grok 4.3', inPrice: 1.25, outPrice: 2.5 }] },
  { id: 'openrouter', label: 'OpenRouter', wire: 'openai', base: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-6-luna', keyHint: 'sk-or-…', keyUrl: 'openrouter.ai → Keys', note: 'One key, hundreds of models.',
    models: [{ id: 'openai/gpt-6-luna', label: 'GPT-6 Luna' }, { id: 'google/gemini-3.6-flash', label: 'Gemini 3.6 Flash' }, { id: 'anthropic/claude-haiku-5-5', label: 'Claude Haiku 5.5' }] },
  { id: 'deepseek', label: 'DeepSeek', wire: 'openai', base: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', keyHint: 'sk-…', keyUrl: 'platform.deepseek.com → API keys',
    models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat' }] },
  { id: 'mistral', label: 'Mistral', wire: 'openai', base: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest', keyHint: '…', keyUrl: 'console.mistral.ai → API keys',
    models: [{ id: 'mistral-small-latest', label: 'Mistral Small' }] },
  { id: 'ollama', label: 'Ollama (on this computer)', wire: 'openai', base: 'http://localhost:11434/v1', defaultModel: 'llama3.2', keyHint: 'no key needed', keyless: true, note: 'Free and offline: runs a model on your own computer. Start Ollama with OLLAMA_ORIGINS=* so the game can reach it.',
    models: [{ id: 'llama3.2', label: 'Llama 3.2' }, { id: 'qwen3', label: 'Qwen 3' }, { id: 'gemma3', label: 'Gemma 3' }] },
  { id: 'custom', label: 'Other (OpenAI-compatible)', wire: 'openai', base: '', defaultModel: '', keyHint: 'key, if it needs one', keyless: true, note: 'Any server that speaks the OpenAI chat format: LM Studio, Together, Fireworks, a self-hosted model…', models: [] },
];
export const PROVIDER_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p])) as Record<ProviderId, ProviderDef>;

/** @deprecated The Claude list, kept for older imports. */
export const AI_MODELS = PROVIDER_BY_ID.anthropic.models as Required<ModelDef>[];

export interface AISettings {
  enabled: boolean;
  provider: ProviderId;
  /** One key per provider, so switching back doesn't mean pasting again. */
  keys: Partial<Record<ProviderId, string>>;
  models: Partial<Record<ProviderId, string>>;
  /** For 'custom' (and to point Ollama elsewhere). */
  baseUrls: Partial<Record<ProviderId, string>>;
  dailyCap: number;
  features: Record<AIFeature, boolean>;
  /** Kept in sync with the active provider for older readers. */
  key: string;
  model: string;
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

// Settings belong to the account that is playing (and stay in this browser).
const LEGACY_SETTINGS_KEY = 'rl-ai-settings';
let accountId: string | null = null;
const settingsKey = () => (accountId ? `rl-ai-settings:${accountId}` : LEGACY_SETTINGS_KEY);
const usageKey = () => (accountId ? `rl-ai-usage:${accountId}` : 'rl-ai-usage');

const DEFAULTS: AISettings = {
  enabled: false,
  provider: 'anthropic',
  keys: {},
  models: {},
  baseUrls: {},
  dailyCap: 300,
  features: { dms: true, moments: true, social: true, interviews: true, director: true },
  key: '',
  model: 'claude-haiku-5-5',
};

let cache: AISettings | null = null;
const listeners = new Set<() => void>();

function readJSON<T>(k: string): T | null {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function writeJSON(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: settings last for the session */ }
}

/** Switch to another account's AI settings (each player brings their own key). */
export function setAIAccount(id: string | null): void {
  if (id === accountId) return;
  accountId = id;
  cache = null;
  listeners.forEach((f) => f());
}

function normalize(saved: Partial<AISettings> | null): AISettings {
  const s: AISettings = { ...DEFAULTS, ...(saved ?? {}), keys: { ...(saved?.keys ?? {}) }, models: { ...(saved?.models ?? {}) }, baseUrls: { ...(saved?.baseUrls ?? {}) }, features: { ...DEFAULTS.features, ...(saved?.features ?? {}) } };
  // Settings from before providers existed were a Claude key and model.
  if (saved && !saved.provider && saved.key) { s.provider = 'anthropic'; s.keys.anthropic = saved.key; if (saved.model) s.models.anthropic = saved.model; }
  if (!PROVIDER_BY_ID[s.provider]) s.provider = 'anthropic';
  s.key = s.keys[s.provider] ?? '';
  s.model = s.models[s.provider] || PROVIDER_BY_ID[s.provider].defaultModel;
  return s;
}

export function aiSettings(): AISettings {
  if (!cache) {
    let saved = readJSON<Partial<AISettings>>(settingsKey());
    // The first account on a device inherits the key set up before accounts.
    if (!saved && accountId) {
      const legacy = readJSON<Partial<AISettings>>(LEGACY_SETTINGS_KEY);
      if (legacy && (legacy.key || legacy.keys)) { saved = legacy; writeJSON(settingsKey(), legacy); try { localStorage.removeItem(LEGACY_SETTINGS_KEY); } catch { /* ignore */ } }
    }
    cache = normalize(saved);
  }
  return cache;
}

export function saveAISettings(patch: Partial<AISettings>): AISettings {
  const cur = aiSettings();
  const merged: Partial<AISettings> = {
    ...cur, ...patch,
    keys: { ...cur.keys, ...(patch.keys ?? {}) },
    models: { ...cur.models, ...(patch.models ?? {}) },
    baseUrls: { ...cur.baseUrls, ...(patch.baseUrls ?? {}) },
    features: { ...cur.features, ...(patch.features ?? {}) },
  };
  // Older callers set `key`/`model` directly: they mean the active provider.
  const prov = (patch.provider ?? cur.provider) as ProviderId;
  if (patch.key !== undefined) merged.keys = { ...merged.keys, [prov]: patch.key };
  if (patch.model !== undefined) merged.models = { ...merged.models, [prov]: patch.model };
  const next = normalize({ ...merged, provider: prov });
  cache = next;
  const { key: _k, model: _m, ...stored } = next;
  void _k; void _m;
  writeJSON(settingsKey(), stored);
  listeners.forEach((f) => f());
  return next;
}

export function onAIChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** The active provider, its key, model and endpoint. */
export function activeProvider(s = aiSettings()): { def: ProviderDef; key: string; model: string; base: string } {
  const def = PROVIDER_BY_ID[s.provider];
  return { def, key: s.keys[s.provider] ?? '', model: s.models[s.provider] || def.defaultModel, base: (s.baseUrls[s.provider] || def.base).replace(/\/+$/, '') };
}

/** Ready to call: a key (or a keyless local server with an address and a model). */
export function aiConfigured(s = aiSettings()): boolean {
  const a = activeProvider(s);
  return !!a.model && !!a.base && (a.def.keyless || !!a.key);
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function aiUsage(): AIUsage {
  const u = readJSON<AIUsage>(usageKey());
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
  writeJSON(usageKey(), next);
  listeners.forEach((f) => f());
}

/** Rough dollars spent today, when the model's price is known. Null otherwise. */
export function estimateCost(u: AIUsage, modelId?: string, provider?: ProviderId): number | null {
  const s = aiSettings();
  const def = PROVIDER_BY_ID[provider ?? s.provider];
  const m = def.models.find((x) => x.id === (modelId ?? activeProvider(s).model));
  if (!m || m.inPrice === undefined || m.outPrice === undefined) return null;
  return (u.input * m.inPrice + u.cacheWrite * m.inPrice * 1.25 + u.cacheRead * m.inPrice * 0.1 + u.output * m.outPrice) / 1e6;
}

/** Is the AI available for this job right now? Cheap enough to call anywhere. */
export function aiActiveFor(feature: AIFeature): boolean {
  const s = aiSettings();
  return s.enabled && aiConfigured(s) && s.features[feature] && aiUsage().calls < s.dailyCap;
}

// ─── THE CALL ──────────────────────────────────────────────────────────────

export class AIError extends Error {
  constructor(message: string, public kind: 'budget' | 'auth' | 'rate' | 'network' | 'bad' | 'off') { super(message); }
}

export interface AICall {
  feature: AIFeature;
  /** The long rules block, cached where the provider supports it. Keep it identical between calls. */
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
const TIMEOUT_MS = 25000;

/**
 * When the browser can't reach a provider directly (some block calls from
 * web pages), the game's own server can pass the request along — if the game
 * is being served by it. The key goes through, is used once and is never
 * stored. Set by the cloud module when a server answers.
 */
let proxyUrl: string | null = null;
export function setAIProxy(url: string | null): void { proxyUrl = url; }

interface Wired { url: string; headers: Record<string, string>; body: Record<string, unknown> }
interface Parsed { text: string; input: number; output: number; cacheRead: number; cacheWrite: number }

function buildRequest(a: ReturnType<typeof activeProvider>, req: AICall): Wired {
  const max = req.maxTokens ?? 300;
  if (a.def.wire === 'anthropic') {
    const system: { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }[] = [{ type: 'text', text: req.rules, cache_control: { type: 'ephemeral' } }];
    if (req.context) system.push({ type: 'text', text: req.context });
    return {
      url: `${a.base}/messages`,
      headers: { 'content-type': 'application/json', 'x-api-key': a.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: { model: a.model, max_tokens: max, system, messages: req.messages, thinking: { type: 'disabled' } },
    };
  }
  const system = req.context ? `${req.rules}\n\n${req.context}` : req.rules;
  if (a.def.wire === 'gemini') {
    return {
      url: `${a.base}/models/${encodeURIComponent(a.model)}:generateContent`,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': a.key },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: req.messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        // Thinking shares the output budget on Gemini, so leave room and ask for little of it.
        generationConfig: { maxOutputTokens: max * 3 + 256, thinkingConfig: { thinkingLevel: 'low' } },
      },
    };
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (a.key) headers.authorization = `Bearer ${a.key}`;
  if (a.def.id === 'openrouter') { headers['x-title'] = 'RAP LIFE'; }
  const body: Record<string, unknown> = { model: a.model, messages: [{ role: 'system', content: system }, ...req.messages] };
  if (a.def.reasoning) {
    // Reasoning models spend tokens thinking before they answer: keep the
    // thinking short and give the budget room for both.
    body.reasoning_effort = 'low';
    body.max_completion_tokens = max * 4 + 256;
  } else if (a.def.id === 'openai') {
    body.max_completion_tokens = max;
  } else {
    body.max_tokens = max;
  }
  return { url: `${a.base}/chat/completions`, headers, body };
}

function parseResponse(wire: Wire, data: unknown): Parsed {
  const d = data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (wire === 'anthropic') {
    const u = d.usage ?? {};
    return { text: (d.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text?: string }) => c.text ?? '').join('').trim(), input: u.input_tokens ?? 0, output: u.output_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 };
  }
  if (wire === 'gemini') {
    const parts = d.candidates?.[0]?.content?.parts ?? [];
    const u = d.usageMetadata ?? {};
    return { text: parts.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('').trim(), input: (u.promptTokenCount ?? 0) - (u.cachedContentTokenCount ?? 0), output: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0), cacheRead: u.cachedContentTokenCount ?? 0, cacheWrite: 0 };
  }
  const u = d.usage ?? {};
  const cached = u.prompt_tokens_details?.cached_tokens ?? 0;
  let text = String(d.choices?.[0]?.message?.content ?? '').trim();
  // Some open models put their thinking inline.
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  return { text, input: (u.prompt_tokens ?? 0) - cached, output: u.completion_tokens ?? 0, cacheRead: cached, cacheWrite: 0 };
}

async function send(w: Wired, viaProxy: boolean): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    if (viaProxy && proxyUrl) {
      return await fetch(proxyUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: w.url, headers: w.headers, body: w.body }), signal: ctrl.signal });
    }
    return await fetch(w.url, { method: 'POST', headers: w.headers, body: JSON.stringify(w.body), signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Requests that remembered they need the proxy (per provider, this session). */
const needsProxy = new Set<string>();

/** One request through the queue. Throws AIError on any failure. */
export function callAI(req: AICall): Promise<string> {
  const run = async (): Promise<string> => {
    const s = aiSettings();
    const a = activeProvider(s);
    if (!aiConfigured(s)) throw new AIError(a.def.keyless ? 'Set the server address and model first' : 'No API key', 'off');
    if (!req.force && !s.enabled) throw new AIError('AI is off', 'off');
    if (!req.force && !s.features[req.feature]) throw new AIError('Feature off', 'off');
    if (aiUsage().calls >= s.dailyCap) throw new AIError('Daily limit reached', 'budget');
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();

    const w = buildRequest(a, req);
    const local = a.base.startsWith('http://localhost') || a.base.startsWith('http://127.');
    let proxied = needsProxy.has(a.def.id) && !!proxyUrl && !local && a.def.id !== 'custom';
    const go = async (): Promise<Response> => {
      try {
        return await send(w, proxied);
      } catch (e) {
        // Blocked by the browser (CORS) or unreachable: try the game's server once.
        if (!proxied && proxyUrl && !local && a.def.id !== 'custom' && !(e instanceof DOMException && e.name === 'AbortError')) {
          proxied = true;
          needsProxy.add(a.def.id);
          return await send(w, true);
        }
        throw e;
      }
    };

    let res: Response;
    try {
      res = await go();
      // Parameters a model doesn't take: drop them and ask again.
      for (let i = 0; i < 3 && res.status === 400; i++) {
        const txt = await res.clone().text();
        let changed = false;
        if (/thinking/i.test(txt) && (w.body.thinking || (w.body.generationConfig as Record<string, unknown> | undefined)?.thinkingConfig)) {
          delete w.body.thinking;
          if (w.body.generationConfig) delete (w.body.generationConfig as Record<string, unknown>).thinkingConfig;
          changed = true;
        } else if (/reasoning/i.test(txt) && w.body.reasoning_effort) { delete w.body.reasoning_effort; changed = true; }
        else if (/max_completion_tokens/i.test(txt) && w.body.max_completion_tokens) { w.body.max_tokens = w.body.max_completion_tokens; delete w.body.max_completion_tokens; changed = true; }
        else if (/max_tokens/i.test(txt) && w.body.max_tokens) { w.body.max_completion_tokens = w.body.max_tokens; delete w.body.max_tokens; changed = true; }
        if (!changed) break;
        res = await go();
      }
      if (res.status === 429 || res.status === 529 || res.status === 503) {
        const after = Math.min(8, Number(res.headers.get('retry-after')) || 3);
        await new Promise((r) => setTimeout(r, after * 1000));
        res = await go();
      }
    } catch (e) {
      const msg = local ? `Can't reach ${a.base}. Is it running (and allowing this page)?` : 'Network error or timeout';
      bumpUsage({ errors: 1, lastError: msg });
      throw new AIError(e instanceof Error && !local ? e.message : msg, 'network');
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
      bumpUsage({ errors: 1, lastError: `API error ${res.status}: ${txt.slice(0, 140)}` });
      throw new AIError(`API error ${res.status}${res.status === 404 ? ' — check the model name' : ''}`, 'bad');
    }
    const parsed = parseResponse(a.def.wire, await res.json());
    bumpUsage({ input: Math.max(0, parsed.input), output: parsed.output, cacheRead: parsed.cacheRead, cacheWrite: parsed.cacheWrite });
    if (!parsed.text) throw new AIError('Empty answer', 'bad');
    return parsed.text;
  };
  const p = chain.then(run, run);
  chain = p.catch(() => undefined);
  return p;
}

/** @deprecated Use callAI. */
export const callClaude = callAI;

/** The models this key can use, from the provider's own list. */
export async function fetchModels(provider?: ProviderId): Promise<string[]> {
  const s = aiSettings();
  const a = activeProvider(provider ? { ...s, provider } : s);
  const headers: Record<string, string> = {};
  let url = `${a.base}/models`;
  if (a.def.wire === 'anthropic') Object.assign(headers, { 'x-api-key': a.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
  else if (a.def.wire === 'gemini') headers['x-goog-api-key'] = a.key;
  else if (a.key) headers.authorization = `Bearer ${a.key}`;
  if (a.def.wire === 'anthropic') url += '?limit=100';
  const res = await fetch(url, { headers });
  if (!res.ok) throw new AIError(res.status === 401 || res.status === 403 ? 'The API key was rejected' : `Could not list models (${res.status})`, res.status === 401 ? 'auth' : 'bad');
  const d = (await res.json()) as { data?: { id: string }[]; models?: { name: string; supportedGenerationMethods?: string[] }[] };
  if (d.models) return d.models.filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')).map((m) => m.name.replace(/^models\//, ''));
  return (d.data ?? []).map((m) => m.id).sort();
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
  return callAI({
    feature: 'dms',
    rules: 'You are a test endpoint for a music career game. Reply with exactly: OK',
    messages: [{ role: 'user', content: 'ping' }],
    maxTokens: 16,
    force: true,
  });
}
