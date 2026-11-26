// A test drive from a car dealership: the car on the road looks like the one you tried, for a while.
export const testDrive = {
  id: '',
  until: 0,
  /** Where to bring the car round to (the dealership's door). */
  spawn: null as { x: number; z: number; heading: number } | null,
  start(id: string, x: number, z: number, heading: number) { this.id = id; this.until = Date.now() + 10 * 60_000; this.spawn = { x, z, heading }; },
  end() { this.id = ''; this.until = 0; },
  active() { return !!this.id && Date.now() < this.until; },
};
