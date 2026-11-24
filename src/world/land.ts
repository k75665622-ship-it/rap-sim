// The plots out past the city edge: bare ground, "for sale" boards, what
// neighbours have built, and whatever you are putting up on your own land.
import * as THREE from 'three';
import { cityLayout, worldKey, LAND_ZONES, type Plot } from './layout';
import { useGameStore } from '../store/gameStore';
import { npcBuilding, plotKey, takenBy, type LandZone } from '../sim/land';
import { dateToSerial } from '../sim/gameClock';
import { BUILDS } from '../sim/realestate';
import type { Bin } from './build';

export type PlotStatus = 'sale' | 'yours' | 'taken' | 'auction';
export interface PlotView { plot: Plot; status: PlotStatus; owner?: string; projectId?: string; bid?: number; bidder?: string; endSerial?: number }

/** The plot under a point, if it is on open land. */
export function plotAt(x: number, z: number, pad = 2): Plot | null {
  if (x < 700 && z < 700) return null;
  for (const p of cityLayout().plots) if (x >= p.minX - pad && x <= p.maxX + pad && z >= p.minZ - pad && z <= p.maxZ + pad) return p;
  return null;
}

export function viewOf(p: Plot): PlotView {
  const st = useGameStore.getState();
  const country = worldKey();
  const mine = (st.devProjects ?? []).find((d) => d.plotId === p.id && d.country === country && d.stage !== 'sold');
  if (mine) return { plot: p, status: 'yours', projectId: mine.id };
  const au = (st.landAuctions ?? []).find((a) => a.plotId === p.id && a.country === country);
  if (au) return { plot: p, status: 'auction', bid: au.bid, bidder: au.bidder, endSerial: au.endSerial };
  const t = takenBy(st.landTaken, plotKey(country, p.id));
  return t ? { plot: p, status: 'taken', owner: t.by } : { plot: p, status: 'sale' };
}

export const landZoneOf = (p: Plot): LandZone => (LAND_ZONES.includes(p.zone) ? (p.zone as LandZone) : 'plots');

export function buildLand(bin: Bin) {
  const L = cityLayout();
  const group = new THREE.Group();
  const n = L.plots.length;
  const mk = (g: THREE.BufferGeometry, count: number, opacity = 1) => {
    const mat = bin.add(new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: opacity < 1, opacity }));
    const im = new THREE.InstancedMesh(bin.add(g), mat, count);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    im.frustumCulled = false;
    im.count = 0;
    group.add(im);
    return im;
  };
  const ground = mk(new THREE.BoxGeometry(1, 0.06, 1), n);
  const bldg = mk(new THREE.BoxGeometry(1, 1, 1), n);
  const roofs = mk(new THREE.BoxGeometry(1, 0.4, 1), n);
  // A board on a post: two boxes merged.
  const post = new THREE.BoxGeometry(0.12, 2.4, 0.12); post.translate(0, 1.2, 0);
  const board = new THREE.BoxGeometry(1.7, 1.0, 0.1); board.translate(0, 2.3, 0);
  const merged = new THREE.BufferGeometry();
  const pa = post.getAttribute('position'), ba = board.getAttribute('position');
  const pos = new Float32Array((pa.count + ba.count) * 3); pos.set(pa.array as Float32Array, 0); pos.set(ba.array as Float32Array, pa.count * 3);
  const nor = new Float32Array((pa.count + ba.count) * 3); nor.set(post.getAttribute('normal').array as Float32Array, 0); nor.set(board.getAttribute('normal').array as Float32Array, pa.count * 3);
  const idx: number[] = [...(post.index!.array as unknown as number[]), ...Array.from(board.index!.array as unknown as number[], (v) => v + pa.count)];
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); merged.setIndex(idx);
  post.dispose(); board.dispose();
  const signs = mk(merged, n);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let sig = '';
  const refresh = () => {
    const st = useGameStore.getState();
    const serial = dateToSerial(st.gameDate);
    const country = worldKey();
    const s = `${country}|${(st.devProjects ?? []).map((d) => d.plotId ? d.plotId + d.stage : '').join(',')}|${Object.keys(st.landTaken ?? {}).length}|${(st.landAuctions ?? []).map((a) => a.plotId + a.bidder).join(',')}|${Math.floor(serial / 10)}`;
    if (s === sig) return;
    sig = s;
    let gi = 0, bi = 0, si = 0;
    for (const p of L.plots) {
      const v = viewOf(p);
      const w = p.maxX - p.minX, d = p.maxZ - p.minZ, cx = (p.minX + p.maxX) / 2, cz = (p.minZ + p.maxZ) / 2;
      m.compose(new THREE.Vector3(cx, 0.19, cz), q, new THREE.Vector3(w - 1, 1, d - 1));
      ground.setMatrixAt(gi, m); ground.setColorAt(gi, c.set(v.status === 'yours' ? '#6fa95a' : v.status === 'taken' ? '#9c9486' : v.status === 'auction' ? '#a58ab8' : '#b99f72')); gi++;
      // Board at the front corner, facing the road side of the plot.
      m.compose(new THREE.Vector3(p.minX + 1.4, 0.15, p.minZ + 1.4), q, new THREE.Vector3(1, 1, 1));
      signs.setMatrixAt(si, m); signs.setColorAt(si, c.set(v.status === 'yours' ? '#2ed573' : v.status === 'taken' ? '#d6453d' : v.status === 'auction' ? '#b57bff' : '#ffc21a')); si++;
      // What stands on it.
      let h = 0, color = '#ddd', foot = 0.55;
      if (v.status === 'taken') {
        const nb = npcBuilding(plotKey(country, p.id));
        if (nb) { h = nb.floors * 3.2; color = nb.color; }
      } else if (v.status === 'yours') {
        const pr = (st.devProjects ?? []).find((x) => x.id === v.projectId)!;
        if (pr.stage === 'building' && pr.startSerial !== undefined && pr.doneSerial !== undefined) {
          const f = Math.max(0.12, Math.min(1, (serial - pr.startSerial) / Math.max(1, pr.doneSerial - pr.startSerial)));
          h = 1 + f * 9; color = '#d9a441'; foot = 0.42 + f * 0.13; // scaffolding yellow, growing
        } else if (pr.stage === 'done' && pr.build) {
          h = { apartments: 12, villas: 7, plaza: 6, hotel: 20 }[pr.build]; color = { apartments: '#e6cfa3', villas: '#f3ece0', plaza: '#b9c7d6', hotel: '#c9a7d6' }[pr.build]; foot = pr.build === 'villas' ? 0.5 : 0.62;
        }
      }
      if (h > 0) {
        m.compose(new THREE.Vector3(cx, 0.19 + h / 2, cz), q, new THREE.Vector3(w * foot, h, d * foot));
        bldg.setMatrixAt(bi, m); bldg.setColorAt(bi, c.set(color));
        m.compose(new THREE.Vector3(cx, 0.19 + h + 0.2, cz), q, new THREE.Vector3(w * foot + 0.6, 1, d * foot + 0.6));
        roofs.setMatrixAt(bi, m); roofs.setColorAt(bi, c.set('#6d6a66'));
        bi++;
      }
    }
    for (const [im, k] of [[ground, gi], [bldg, bi], [roofs, bi], [signs, si]] as Array<[THREE.InstancedMesh, number]>) {
      im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  };
  refresh();
  return { group, refresh };
}

/** Build-type name for a plot's project, for the card. */
export const buildName = (b?: string) => BUILDS.find((x) => x.id === b)?.name ?? 'Empty land';
