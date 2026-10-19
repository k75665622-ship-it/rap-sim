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
  { id: 'anthropic', label: 'Claude (Anthropic)', wire: 'anthropic', base: 'https://api.anthropic.com/v1', defaultModel: 'claude-haiku-5-5', keyHint: 'sk-ant-…', keyUrl: 'https://platform.claude.com/settings/keys',
    models: [
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Fast and cheap. Recommended.', inPrice: 0.1, outPrice: 0.5 },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Better writing, ~20× the cost.', inPrice: 2, outPrice: 10 },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Best writing, ~40× the cost.', inPrice: 4, outPrice: 20 },
    ] },
  { id: 'openai', label: 'OpenAI', wire: 'openai', base: 'https://api.openai.com/v1', defaultModel: 'gpt-6-luna', keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys', reasoning: 'openai',
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna', note: 'Cheapest current model.', inPrice: 0.1, outPrice: 0.5 },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol', note: 'Stronger, ~20× the cost.', inPrice: 2, outPrice: 10 },
    ] },
  { id: 'gemini', label: 'Google Gemini', wire: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', defaultModel: 'gemini-3.6-flash', keyHint: 'AIza…', keyUrl: 'https://aistudio.google.com/apikey',
    models: [{ id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', note: 'Fast; has a free tier.' }] },
  // Groq's free tier is the easiest way in. Llama 3.3 70B writes the best
  // casual dialogue there and doesn't spend tokens "thinking" first.
  { id: 'groq', label: 'Groq', wire: 'openai', base: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', keyHint: 'gsk_…', keyUrl: 'https://console.groq.com/keys', note: 'Free tier. Get a key at console.groq.com/keys.',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', note: 'Best for chats. Recommended.' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', note: 'Fastest, higher free limits.' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', note: 'Thinks first; smarter, slower.' },
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', note: 'Thinks first; fast.' },
    ] },
  { id: 'xai', label: 'Grok (xAI)', wire: 'openai', base: 'https://api.x.ai/v1', defaultModel: 'grok-4.3', keyHint: 'xai-…', keyUrl: 'https://console.x.ai',
    models: [{ id: 'grok-4.3', label: 'Grok 4.3', inPrice: 1.25, outPrice: 2.5 }] },
  { id: 'openrouter', label: 'OpenRouter', wire: 'openai', base: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-6-luna', keyHint: 'sk-or-…', keyUrl: 'https://openrouter.ai/keys', note: 'One key, hundreds of models.',
    models: [{ id: 'openai/gpt-6-luna', label: 'GPT-6 Luna' }, { id: 'google/gemini-3.6-flash', label: 'Gemini 3.6 Flash' }, { id: 'anthropic/claude-haiku-5-5', label: 'Claude Haiku 5.5' }] },
  { id: 'deepseek', label: 'DeepSeek', wire: 'openai', base: 'https://api.deepseek.com', defaultModel: 'deepseek-chat', keyHint: 'sk-…', keyUrl: 'https://platform.deepseek.com/api_keys',
    models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat' }] },
  { id: 'mistral', label: 'Mistral', wire: 'openai', base: 'https://api.mistral.ai/v1', defaultModel: 'mistral-small-latest', keyHint: '…', keyUrl: 'https://console.mistral.ai/api-keys',
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
  for (const [pid, m] of Object.entries(s.models)) if (typeof m === 'string' && (/^(gsk_|sk-|xai-|AIza)/.test(m) || /\s/.test(m.trim()) || !m.trim())) delete (s.models as Record<string, string>)[pid];
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
  // A key pasted into the model box, or junk with spaces, isn't a model.
  for (const [pid, m] of Object.entries(merged.models ?? {})) {
    if (typeof m === 'string' && (/^(gsk_|sk-|xai-|AIza)/.test(m) || /\s/.test(m.trim()))) delete (merged.models as Record<string, string>)[pid];
  }
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
  /** The answer must be a JSON object (asks the provider for JSON mode). */
  json?: boolean;
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
let proxyBroken = false;
/** Shown on the AI page so you can tell whether the newest build is loaded. */
export const AI_BUILD = '2026-10-19 · j5';
export function setAIProxy(url: string | null): void { proxyUrl = url; if (url) proxyBroken = false; }
/**
 * The game's own pass-through: set when the server answered, or — when this
 * page is served from a real address — the same address, before anybody has
 * checked. A page opened as a file has none.
 */
function proxyFor(): string | null {
  if (proxyBroken) return null;
  if (proxyUrl) return proxyUrl;
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) return null;
  if (/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return null;
  return `${location.origin}/api/ai`;
}
/**
 * Providers to send through the server first. Empty: everyone is tried
 * directly, and the server only steps in when the browser blocks a call
 * (remembered per provider in `needsProxy`).
 */
const PROXY_FIRST = new Set<string>();
/** True once the page's own address turned out to be a static site (no server). */
export function aiHasNoServer(): boolean { return proxyBroken; }

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
  const body: Record<string, unknown> = { model: a.model, messages: [{ role: 'system', content: system }, ...req.messages], temperature: 0.9 };
  // Thinking models spend tokens before they answer: keep the thinking short
  // and give the budget room for both. Decided by the model, not the
  // provider — Llama on Groq doesn't think, GPT-OSS on Groq does.
  const thinks = a.def.reasoning === 'openai' || /gpt-oss|qwen3|deepseek-r|reasoner|\bo[34]\b/i.test(a.model);
  if (thinks) {
    body.reasoning_effort = /qwen/i.test(a.model) ? 'none' : 'low';
    if (a.def.id === 'groq' && /gpt-oss/i.test(a.model)) body.include_reasoning = false;
    if (a.def.id === 'openai') delete body.temperature;
    body.max_completion_tokens = max * 4 + 256;
  } else if (a.def.id === 'openai' || a.def.id === 'groq') {
    body.max_completion_tokens = max;
  } else {
    body.max_tokens = max;
  }
  if (req.json && a.def.id !== 'ollama' && a.def.id !== 'custom') body.response_format = { type: 'json_object' };
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
  const proxy = proxyFor();
  try {
    if (viaProxy && proxy) {
      const r = await fetch(proxy, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: w.url, headers: w.headers, body: w.body }), signal: ctrl.signal });
      // No pass-through here (a static host): stop trying it. A provider's own
      // 404 ("that model doesn't exist") comes back through the pass-through
      // too, so only a 404 that isn't the provider talking means "no server".
      // A static site answers every address with the game's own page: that
      // isn't a pass-through, whatever the status says.
      const type = r.headers.get('content-type') ?? '';
      const head = type.includes('json') ? '' : (await r.clone().text().catch(() => '')).trimStart().slice(0, 200);
      if (type.includes('text/html') || head.startsWith('<')) { proxyBroken = true; throw new TypeError('No game server to pass the request through'); }
      if (r.status === 404 || r.status === 405) {
        const txt = head || (await r.clone().text().catch(() => ''));
        const fromProvider = r.headers.get('x-rl-proxy') === '1' || /model|does not exist|not_found|invalid_request|"error"\s*:\s*\{/i.test(txt);
        if (!fromProvider) { proxyBroken = true; throw new TypeError('No game server to pass the request through'); }
      }
      return r;
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
    let proxied = (needsProxy.has(a.def.id) || PROXY_FIRST.has(a.def.id)) && !!proxyFor() && !local && a.def.id !== 'custom';
    const go = async (): Promise<Response> => {
      try {
        return await send(w, proxied);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e;
        // The pass-through isn't there: try the provider directly.
        if (proxied) { proxied = false; return await send(w, false); }
        // Blocked by the browser (CORS) or unreachable: try the game's server once.
        if (proxyFor() && !local && a.def.id !== 'custom') {
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
        } else if (/reasoning/i.test(txt) && (w.body.reasoning_effort || w.body.include_reasoning !== undefined)) { delete w.body.reasoning_effort; delete w.body.include_reasoning; changed = true; }
        else if (/response_format|json/i.test(txt) && w.body.response_format) { delete w.body.response_format; changed = true; }
        else if (/temperature/i.test(txt) && w.body.temperature !== undefined) { delete w.body.temperature; changed = true; }
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
      const msg = local
        ? `Can't reach ${a.base}. Is it running (and allowing this page)?`
        : e instanceof DOMException && e.name === 'AbortError'
          ? `${a.def.label} took too long to answer. Try again, or pick a faster model.`
          : proxyBroken
            ? `${a.def.label} blocked the call from this page, and this site has no game server to pass it through (it's hosted as a static site). Host the game as a Render Web Service with "npm start" — or use OpenRouter, which allows calls from web pages.`
            : `Couldn't reach ${a.def.label} — check your internet connection.`;
      bumpUsage({ errors: 1, lastError: msg });
      throw new AIError(msg, 'network');
    }

    // The model isn't on this key (a typo, a retired model, something pasted
    // into the wrong box): fall back to the provider's recommended model once,
    // and keep it if it works.
    // If even that isn't there, ask the provider which models this key CAN
    // use and take the best chat model on the list.
    if (!res.ok) {
      const txt = await res.clone().text().catch(() => '');
      const missing = res.status === 404 || (res.status === 400 && /model/i.test(txt) && /not found|does not exist|decommission|not supported|invalid/i.test(txt));
      if (missing) {
        const bad = a.model;
        const tried = new Set([bad]);
        const candidates: string[] = [];
        if (a.def.defaultModel && !tried.has(a.def.defaultModel)) candidates.push(a.def.defaultModel);
        try { candidates.push(...rankChatModels(await fetchModels(a.def.id))); } catch { /* the list isn't reachable: just the default */ }
        for (const m of candidates) {
          if (tried.has(m)) continue;
          tried.add(m);
          if (tried.size > 4) break;
          w.body.model = m;
          // Thinking settings belong to the model, so rebuild them for this one.
          const fresh = buildRequest({ ...a, model: m }, req);
          w.body = fresh.body;
          try { res = await go(); } catch { continue; }
          if (res.ok) {
            saveAISettings({ models: { [a.def.id]: m } });
            bumpUsage({ lastError: `"${bad}" isn't available on your ${a.def.label} key — switched to ${m}.` });
            break;
          }
        }
      }
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
      let why = '';
      try { const j = JSON.parse(txt) as { error?: { message?: string } | string }; why = typeof j.error === 'string' ? j.error : j.error?.message ?? ''; } catch { why = txt.slice(0, 160); }
      const model = String(w.body.model ?? a.model);
      throw new AIError(res.status === 404
        ? `${a.def.label} says the model "${model}" doesn't exist on your key${why ? ` (${why.slice(0, 120)})` : ''}. Pick one from the list.`
        : `API error ${res.status}${/model/i.test(why) ? ` with model "${model}"` : ''}${why ? `: ${why.slice(0, 160)}` : ''}`, 'bad');
    }
    let data: unknown;
    try { data = await res.json(); } catch {
      bumpUsage({ errors: 1, lastError: 'The answer wasn\'t JSON' });
      throw new AIError(proxyBroken || proxyFor() ? 'Got a web page back instead of an AI answer — this site has no game server. Host it as a Render Web Service ("npm start"), or use OpenRouter.' : 'The provider sent back something that isn\'t an answer. Try again.', 'network');
    }
    const parsed = parseResponse(a.def.wire, data);
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
  const viaProxy = async () => {
    const proxy = proxyFor();
    if (!proxy) throw new TypeError('no proxy');
    return fetch(proxy, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ target: url, method: 'GET', headers }) });
  };
  let res: Response;
  try {
    res = PROXY_FIRST.has(a.def.id) && proxyFor() ? await viaProxy() : await fetch(url, { headers });
  } catch {
    try { res = await viaProxy(); } catch { throw new AIError(`Couldn't reach ${a.def.label} to list models.`, 'network'); }
  }
  if ((res.headers.get('content-type') ?? '').includes('text/html')) { proxyBroken = true; throw new AIError(`Couldn't list ${a.def.label} models from this page — type the model name instead (e.g. ${a.def.defaultModel}).`, 'network'); }
  if (!res.ok) throw new AIError(res.status === 401 || res.status === 403 ? 'The API key was rejected' : `Could not list models (${res.status})`, res.status === 401 ? 'auth' : 'bad');
  const d = (await res.json()) as { data?: { id: string }[]; models?: { name: string; supportedGenerationMethods?: string[] }[] };
  if (d.models) return d.models.filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')).map((m) => m.name.replace(/^models\//, ''));
  return (d.data ?? []).map((m) => m.id).sort();
}

/**
 * The chat models in a provider's list, best first for writing dialogue.
 * Speech, transcription and safety models are dropped.
 */
export function rankChatModels(ids: string[]): string[] {
  const chat = ids.filter((id) => !/whisper|tts|orpheus|playai|guard|safeguard|embed|vision-only|distil|compound|audio|transcri|moderation|image|dall-e|sora/i.test(id));
  const prefer = [/llama-3\.3-70b/i, /gpt-oss-120b/i, /llama-4/i, /kimi/i, /gpt-oss-20b/i, /qwen/i, /llama-3\.1-8b/i, /gemma/i, /mistral|mixtral/i, /llama/i];
  const score = (id: string) => { const i = prefer.findIndex((re) => re.test(id)); return i < 0 ? prefer.length : i; };
  return [...chat].sort((x, y) => score(x) - score(y));
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
