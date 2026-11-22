// What you walked up to in Studio 9, so the studio opens on that.
export type StudioIntent = 'record' | 'mix' | 'beats' | 'write';
let intent: StudioIntent | null = null;
export const setStudioIntent = (i: StudioIntent | null) => { intent = i; };
export const takeStudioIntent = (): StudioIntent | null => { const i = intent; intent = null; return i; };
