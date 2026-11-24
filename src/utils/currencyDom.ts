// Many screens write "$1,234" straight into their text. Rather than rewrite
// hundreds of strings, show them in local money as they reach the screen.
import { currencySymbol, isUsd, onCurrencyChange, toLocal } from './currency';
import { compact } from './format';

const RE = /([−-]?)\$(\d[\d,]*(?:\.\d+)?)([KMBT])?(?![A-Za-z])/g;
const MULT: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

function conv(text: string): string {
  if (!text.includes('$')) return text;
  return text.replace(RE, (_m, neg: string, num: string, suf?: string) => {
    const usd = parseFloat(num.replace(/,/g, '')) * (suf ? MULT[suf] : 1);
    const v = toLocal(usd);
    const S = currencySymbol();
    let body: string;
    if (suf || v >= 1e7) body = compact(v);
    else if (num.includes('.') && v < 100) body = v.toFixed(2);
    else body = Math.round(v).toLocaleString();
    return `${neg}${S}${body}`;
  });
}

function walk(n: Node): void {
  if (n.nodeType === 3) {
    const t = n as Text;
    if (t.nodeValue && t.nodeValue.includes('$')) {
      const p = t.parentElement?.tagName;
      if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') return;
      const next = conv(t.nodeValue);
      if (next !== t.nodeValue) t.nodeValue = next;
    }
    return;
  }
  if (n.nodeType === 1) { const tag = (n as Element).tagName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS') return; for (let c = n.firstChild; c; c = c.nextSibling) walk(c); }
}

export function startCurrencyDom(): void {
  let queued = false;
  const pending = new Set<Node>();
  const flush = () => { queued = false; if (isUsd()) { pending.clear(); return; } pending.forEach((n) => walk(n)); pending.clear(); };
  const mo = new MutationObserver((recs) => {
    if (isUsd()) return;
    for (const r of recs) {
      if (r.type === 'characterData') pending.add(r.target);
      else r.addedNodes.forEach((n) => pending.add(n));
    }
    if (!queued) { queued = true; requestAnimationFrame(flush); }
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  onCurrencyChange(() => { if (!isUsd()) walk(document.body); });
}
