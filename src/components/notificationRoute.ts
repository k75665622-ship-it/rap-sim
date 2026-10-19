// Where tapping a notification takes you. One map, used by the bell panel and
// the Updates screen, so the two can never send the same notification to two
// different places.

import type { GameNotification, GameScreen } from '../types/game';
import { useGameStore } from '../store/gameStore';

export function openNotificationAction(a: NonNullable<GameNotification['action']>): void {
  const st = useGameStore.getState();
  if (a.type === 'artist') st.selectNPC(a.id);
  if (a.type === 'features') { st.openStudioAt('guest'); return; }
  const to: Record<string, GameScreen> = {
    chart: 'charts', platform: 'streaming', video: 'watch', inbound: 'mailbox', artist: 'npc_profile',
    court: 'court', awards: 'awards', home: 'lifestyle', song: 'studio',
  };
  st.setScreen(to[a.type] ?? 'studio');
}
