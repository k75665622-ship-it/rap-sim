// "Hire an accountant" should land on the accountants, not the top of the Team page.
import type { NPCRole } from '../types/game';

let pending: NPCRole | null = null;
export function focusTeamRole(role: NPCRole): void { pending = role; }
export function takeTeamFocus(): NPCRole | null { const r = pending; pending = null; return r; }
