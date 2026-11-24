// Lightweight bridge between pedestrians and ambient traffic.
// No physics engine: only a few crossing hazards are shared each frame.
export interface PedestrianHazard {
  x: number;
  z: number;
  axis: 'x' | 'z';
  road: number;
  active: boolean;
}

let hazards: PedestrianHazard[] = [];

export function setPedestrianHazards(next: PedestrianHazard[]) {
  hazards = next;
}

export function pedestrianHazards(): readonly PedestrianHazard[] {
  return hazards;
}
