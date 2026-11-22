// How much to shrink the on-screen controls so they fit short phone screens
// (landscape with a browser bar leaves only ~350 px).
import { useEffect, useState } from 'react';
const calc = () => Math.max(0.62, Math.min(1, window.innerHeight / 430));
export function useUi(): number {
  const [u, setU] = useState(calc);
  useEffect(() => { const f = () => setU(calc()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return u;
}
