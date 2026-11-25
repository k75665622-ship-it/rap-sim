// The plots out past the city edge: bare ground, "for sale" boards, what
// neighbours have built, and whatever you are putting up on your own land.
import * as THREE from 'three';
import { BIZ_STYLE, cityLayout, worldKey, LAND_ZONES, type BizKind, type Plot } from './layout';
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

  // Forest: tents, campfires and cabins (built once).
  const fixed = (g: THREE.BufferGeometry, color: string, mats: THREE.Matrix4[], basic = false) => {
    if (!mats.length) return;
    const mat = bin.add(basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
    const im = new THREE.InstancedMesh(bin.add(g), mat, mats.length);
    mats.forEach((mm, i) => im.setMatrixAt(i, mm));
    im.frustumCulled = false;
    group.add(im);
  };
  const tents: THREE.Matrix4[] = [], fires: THREE.Matrix4[] = [], logs: THREE.Matrix4[] = [], cabW: THREE.Matrix4[] = [], cabR: THREE.Matrix4[] = [], doors: THREE.Matrix4[] = [];
  const one = new THREE.Vector3(1, 1, 1);
  for (const c of L.camps) {
    const rq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.rot);
    if (c.kind === 'camp') {
      const off = new THREE.Vector3(2.6, 0, 0).applyQuaternion(rq);
      tents.push(new THREE.Matrix4().compose(new THREE.Vector3(c.x + off.x, 0.19 + 1.1, c.z + off.z), rq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)), one));
      fires.push(new THREE.Matrix4().makeTranslation(c.x, 0.19 + 0.45, c.z));
      logs.push(new THREE.Matrix4().compose(new THREE.Vector3(c.x, 0.19 + 0.12, c.z), rq, new THREE.Vector3(1, 1, 1)));
    } else {
      cabW.push(new THREE.Matrix4().compose(new THREE.Vector3(c.x, 0.19 + 1.7, c.z), rq, new THREE.Vector3(6, 3.4, 4.6)));
      cabR.push(new THREE.Matrix4().compose(new THREE.Vector3(c.x, 0.19 + 3.4 + 1.1, c.z), rq.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)), new THREE.Vector3(1, 1, 1)));
      const d = new THREE.Vector3(0, 0, 2.31).applyQuaternion(rq);
      doors.push(new THREE.Matrix4().compose(new THREE.Vector3(c.x + d.x, 0.19 + 1.0, c.z + d.z), rq, new THREE.Vector3(1, 2, 0.1)));
    }
  }
  fixed(new THREE.ConeGeometry(1.9, 2.2, 4), '#c9703a', tents);
  fixed(new THREE.ConeGeometry(0.38, 0.9, 6), '#ff8a1f', fires, true);
  fixed(new THREE.BoxGeometry(1.5, 0.22, 0.3), '#4a3222', logs);
  fixed(new THREE.BoxGeometry(1, 1, 1), '#8a6240', cabW);
  fixed(new THREE.ConeGeometry(4.6, 2.2, 4), '#5b3a26', cabR);
  fixed(new THREE.BoxGeometry(0.9, 1, 1), '#3a281c', doors);
  // Shop awnings over each business door, coloured by what they are.
  const awn: Record<string, THREE.Matrix4[]> = {}, boards: Record<string, THREE.Matrix4[]> = {};
  for (const b of L.buildings) {
    if (!b.biz || !b.door) continue;
    const d = b.door, ew = d.nx !== 0;
    awn[b.biz.kind] ??= []; boards[b.biz.kind] ??= [];
    awn[b.biz.kind].push(new THREE.Matrix4().compose(new THREE.Vector3(d.x + d.nx * 0.9, 3.4, d.z + d.nz * 0.9), new THREE.Quaternion(), new THREE.Vector3(ew ? 1.8 : 5, 0.25, ew ? 5 : 1.8)));
    boards[b.biz.kind].push(new THREE.Matrix4().compose(new THREE.Vector3(d.x + d.nx * 0.2, 4.6, d.z + d.nz * 0.2), new THREE.Quaternion(), new THREE.Vector3(ew ? 0.2 : 4.2, 1.1, ew ? 4.2 : 0.2)));
  }
  for (const k of Object.keys(awn) as BizKind[]) { fixed(new THREE.BoxGeometry(1, 1, 1), BIZ_STYLE[k].color, awn[k]); fixed(new THREE.BoxGeometry(1, 1, 1), '#f4efe4', boards[k]); }

  // Boats in the harbour basin, and a jetty-side crane-ish mast for flavour.
  const hulls: THREE.Matrix4[] = [], cabins: THREE.Matrix4[] = [], masts: THREE.Matrix4[] = [];
  for (const b of L.blocks) {
    if (!b.water || (b.minZ + b.maxZ) / 2 > 750 || (b.minZ + b.maxZ) / 2 < 600) continue;
    for (let i = 0; i < 2; i++) {
      const bx = b.minX + 10 + i * 20 + ((b.minX * 7 + i * 5) % 5), bz = b.minZ + 14 + ((b.minZ * 3 + i * 11) % 14);
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ((b.minX + i * 40) % 6) * 0.5);
      hulls.push(new THREE.Matrix4().compose(new THREE.Vector3(bx, 0.15 + 0.35, bz), q2, new THREE.Vector3(2.4, 0.9, 7.5)));
      cabins.push(new THREE.Matrix4().compose(new THREE.Vector3(bx, 0.15 + 1.2, bz), q2, new THREE.Vector3(1.6, 1, 2.6)));
      masts.push(new THREE.Matrix4().compose(new THREE.Vector3(bx, 0.15 + 3, bz - 1), q2, new THREE.Vector3(0.12, 4.5, 0.12)));
    }
  }
  fixed(new THREE.BoxGeometry(1, 1, 1), '#e8e4d8', hulls);
  fixed(new THREE.BoxGeometry(1, 1, 1), '#2b5d8a', cabins);
  fixed(new THREE.BoxGeometry(1, 1, 1), '#d9d4c8', masts);
  return { group, refresh };
}

/** Build-type name for a plot's project, for the card. */
export const buildName = (b?: string) => BUILDS.find((x) => x.id === b)?.name ?? 'Empty land';
