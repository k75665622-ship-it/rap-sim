// Lesson demos: the real beat engine playing through one effect you can switch on and off.
import { BeatPlayer, beatSpecFor } from './beat';
import { createBus } from './vocalfx';
import type { DemoKind } from '../sim/academy';

function room(ctx: BaseAudioContext, secs: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * secs); const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}

export function startDemo(ctx: AudioContext, kind: DemoKind): { setOn(on: boolean): void; stop(): void } {
  const spec = beatSpecFor('trap', 140, 'academy-demo', 82);
  const out = createBus(ctx, ctx.destination);
  const src = ctx.createGain();
  const player = new BeatPlayer(ctx, spec, src, 0.9);
  const now = () => ctx.currentTime;
  let setOn: (on: boolean) => void = () => {};
  const g = (v: number) => { const n = ctx.createGain(); n.gain.value = v; return n; };

  if (kind === 'eq-low' || kind === 'eq-high') {
    const f = ctx.createBiquadFilter(); f.type = kind === 'eq-low' ? 'lowshelf' : 'highshelf'; f.frequency.value = kind === 'eq-low' ? 200 : 6000; f.gain.value = 0;
    src.connect(f).connect(out);
    setOn = (on) => f.gain.setTargetAtTime(on ? (kind === 'eq-low' ? 9 : -12) : 0, now(), 0.03);
  } else if (kind === 'compress') {
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -34; comp.ratio.value = 14; comp.attack.value = 0.002; comp.release.value = 0.12; comp.knee.value = 0;
    const dry = g(1), wet = g(0), make = g(2.2);
    src.connect(dry).connect(out); src.connect(comp).connect(make).connect(wet).connect(out);
    setOn = (on) => { dry.gain.setTargetAtTime(on ? 0 : 1, now(), 0.02); wet.gain.setTargetAtTime(on ? 1 : 0, now(), 0.02); };
  } else {
    const dry = g(1); src.connect(dry).connect(out);
    const send = g(0);
    if (kind === 'reverb') { const conv = ctx.createConvolver(); conv.buffer = room(ctx, 2.4, 2.2); src.connect(send).connect(conv).connect(out); }
    else { const d = ctx.createDelay(1); d.delayTime.value = (60 / spec.bpm) * 0.75; const fb = g(0.4); src.connect(send).connect(d); d.connect(fb).connect(d); d.connect(out); }
    setOn = (on) => send.gain.setTargetAtTime(on ? (kind === 'reverb' ? 0.9 : 0.7) : 0, now(), 0.03);
  }
  player.start(now() + 0.08);
  return { setOn, stop: () => { player.stop(); window.setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, 600); } };
}
