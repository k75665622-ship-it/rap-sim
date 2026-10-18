// ─── THE BILL ──────────────────────────────────────────────────────────────
// Who else is playing. Used on show offers, booked dates and your own shows.

import type { LineupAct } from '../../types/game';
import { SLOT_LABEL } from '../../sim/scene';
import { useGameStore } from '../../store/gameStore';

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export function LineupStrip({ acts, you, compact }: { acts: LineupAct[]; you?: string; compact?: boolean }) {
  const { selectNPC, setScreen } = useGameStore();
  if (!acts.length && !you) return null;
  if (compact) {
    const names = acts.slice(0, 3).map((a) => a.name);
    const more = acts.length - names.length;
    const beef = acts.find((a) => a.beef);
    return (
      <div className="text-[11px] text-gray-400 truncate">
        With {names.join(', ')}{more > 0 ? ` +${more}` : ''}
        {beef && <span className="ml-1.5 text-red-300 font-semibold">🔥 {beef.name} is on it</span>}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {you && (
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/30">
          <span className="w-7 h-7 rounded-full bg-yellow-400 text-black text-[11px] font-black flex items-center justify-center">YOU</span>
          <span className="text-xs text-white font-semibold flex-1">{you}</span>
        </div>
      )}
      {acts.map((a) => (
        <button
          key={a.npcId}
          onClick={() => { selectNPC(a.npcId); setScreen('npc_profile'); }}
          className={`w-full text-left flex items-center gap-2 rounded-lg px-2 py-1.5 border ${a.beef ? 'bg-red-500/10 border-red-500/40' : a.friend ? 'bg-green-500/5 border-green-500/25' : 'bg-gray-900 border-gray-800'} hover:border-gray-600`}
        >
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 text-white text-[10px] font-bold flex items-center justify-center">{initials(a.name)}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs text-white truncate">{a.name}</span>
            <span className="block text-[10px] text-gray-500">{SLOT_LABEL[a.slot]} · fame {a.fame}</span>
          </span>
          {a.beef && <span className="text-[10px] font-bold text-red-300">🔥 BEEF</span>}
          {a.friend && !a.beef && <span className="text-[10px] font-bold text-green-300">🤝 cool</span>}
        </button>
      ))}
    </div>
  );
}
