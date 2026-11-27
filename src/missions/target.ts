// Where a live mission wants you. Kept in its own tiny module so the GPS can
// read it without importing the mission runtime (which itself uses the GPS).
export interface MissionTarget { x: number; z: number; label: string; placeId: string }

export const missionGps: { target: MissionTarget | null; live: boolean } = { target: null, live: false };
