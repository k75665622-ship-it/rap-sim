// Four camera angles for the video shoot. Each one runs for ANGLE_SEC seconds;
// the shoot films them back to back so the editor has coverage to cut between.
export const ANGLE_SEC = 3;
export const ANGLES = [
  { id: 0, name: 'Wide orbit', emoji: '🎥' },
  { id: 1, name: 'Close-up', emoji: '🧑‍🎤' },
  { id: 2, name: 'Low hero', emoji: '🦶' },
  { id: 3, name: 'Drone', emoji: '🚁' },
] as const;
export const SHOOT_SEC = ANGLE_SEC * ANGLES.length;

export function angleAt(t: number): number { return Math.max(0, Math.min(ANGLES.length - 1, Math.floor(t / ANGLE_SEC))); }

/** Camera position and look-at for shoot time `t` around a performer at (x,y,z) facing `rot`. */
export function shootCam(t: number, p: { x: number; y: number; z: number; rot: number }, portrait: boolean) {
  const a = angleAt(t);
  const lt = t - a * ANGLE_SEC;
  const k = portrait ? 1.25 : 1;
  let ang: number, r: number, h: number, ly: number;
  if (a === 0) { ang = p.rot + 0.6 + lt * 0.38; r = (4.6 - lt * 0.18) * k; h = 1.1 + Math.sin(lt * 0.7) * 0.7; ly = 1.35; }
  else if (a === 1) { ang = p.rot + 0.25 - lt * 0.1; r = (2.7 - lt * 0.28) * k; h = 1.62; ly = 1.6; }
  else if (a === 2) { ang = p.rot + 2.2 - lt * 0.32; r = (3.6 + lt * 0.1) * k; h = 0.32; ly = 1.9; }
  else { ang = p.rot + lt * 0.9; r = (4.8 + lt * 0.25) * k; h = 6.4 - lt * 0.5; ly = 1.2; }
  return { px: p.x + Math.sin(ang) * r, py: p.y + h, pz: p.z + Math.cos(ang) * r, lx: p.x, ly: p.y + ly, lz: p.z, angle: a };
}
