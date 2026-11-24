// Shared traffic-light timing for vehicles and pedestrians.
// Keeping this in one module means pedestrians and cars always agree on a light.
export type SignalAxis = 'x' | 'z';
export type SignalState = 'red' | 'yellow' | 'green';

export function signalState(axis: SignalAxis, road: number, now: number): SignalState {
  const p = ((now + road * 0.011) % 14 + 14) % 14;
  if (axis === 'x') {
    if (p < 6.1) return 'green';
    if (p < 7.0) return 'yellow';
    return 'red';
  }
  if (p < 7.0) return 'red';
  if (p < 7.9) return 'yellow';
  return 'green';
}

/** A pedestrian crossing this road may go only when vehicles on that road stop. */
export function pedestrianCanCross(axis: SignalAxis, road: number, now: number): boolean {
  return signalState(axis, road, now) === 'red';
}
