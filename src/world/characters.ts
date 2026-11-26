// ─── THE CITY: CHARACTERS ──────────────────────────────────────────────────
//
// The people of the city: you, the NPCs inside buildings, and the street crowd.
// All three are built from the same rounded body parts (capsules and spheres, not
// boxes) with real joints: hips, knees, shoulders and elbows, a waist that twists
// and a neck that turns. That is what lets them walk like people instead of
// swinging stiff planks.
//
// The street crowd draws every part of every person with one instanced mesh per
// part, so a whole crowd costs a few dozen draw calls however many people are out,
// and only the people actually on screen are drawn.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SKIN, defaultLook, type Look } from '../sim/look';
import type { Bin } from './build';

/** Joint positions, in the character's own space (feet on y = 0, facing +z). */
export const J = {
  hipX: 0.125,
  hipY: 0.92,
  thigh: 0.43,
  shin: 0.43,
  waist: 0.95,
  shoulderX: 0.345,
  shoulderY: 1.56,
  upperArm: 0.27,
  neck: 1.68,
};

export type HairKind = 'none' | 'crop' | 'afro' | 'long';

export function hairKindFor(style: string | undefined): HairKind {
  const s = String(style ?? '');
  if (s.includes('bald') || s.includes('shaved')) return 'none';
  if (/braid|loc|dread/.test(s)) return 'long';
  if (/afro|puff|twist/.test(s)) return 'afro';
  return 'crop';
}

export interface CharacterGeo {
  thigh: THREE.BufferGeometry;
  shin: THREE.BufferGeometry;
  shoe: THREE.BufferGeometry;
  pelvis: THREE.BufferGeometry;
  torso: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  eyes: THREE.BufferGeometry;
  hairCrop: THREE.BufferGeometry;
  hairAfro: THREE.BufferGeometry;
  hairLong: THREE.BufferGeometry;
  upperArm: THREE.BufferGeometry;
  foreArm: THREE.BufferGeometry;
}

const capsule = (r: number, len: number, seg = 6) => new THREE.CapsuleGeometry(r, len, 2, seg);
const ball = (r: number, ws = 8, hs = 6) => new THREE.SphereGeometry(r, ws, hs);
const put = (g: THREE.BufferGeometry, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
};

/** The shared body parts. `slim` narrows or fills out the build (0.9 slim, 1.15 heavy). */
export function characterGeometry(bin: Bin, slim = 1): CharacterGeo {
  const w = slim;
  const keep = (g: THREE.BufferGeometry) => bin.add(g);

  // A short cap of hair tilted back so the forehead shows.
  const crop = () => {
    const g = new THREE.SphereGeometry(0.218, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.52);
    g.scale(0.97, 1.08, 1.02);
    g.rotateX(-0.28);
    g.translate(0, 1.885, -0.015);
    return g;
  };

  return {
    // Legs hang from the hip joint (y = 0); the shin hangs from the knee; the shoe sits at the ankle.
    thigh: keep(put(capsule(0.105 * w, 0.26), 0, -0.215, 0)),
    shin: keep(put(capsule(0.082 * w, 0.27), 0, -0.215, 0)),
    shoe: keep(put(ball(0.1, 8, 6), 0, -0.035, 0.065, 0.95 * w, 0.62, 1.7)),
    pelvis: keep(put(ball(0.18, 9, 6), 0, 0.97, 0, 1.3 * w, 0.78, 0.92 * w)),
    torso: keep(put(capsule(0.19, 0.34, 7), 0, 1.3, 0, 1.4 * w, 1, 0.82 * w)),
    head: keep(
      mergeGeometries([
        put(ball(0.2, 10, 8), 0, 1.88, 0, 0.95, 1.08, 1),
        put(new THREE.CylinderGeometry(0.055, 0.062, 0.14, 6), 0, 1.68, 0),
        put(ball(0.04, 5, 4), 0.19, 1.87, 0),
        put(ball(0.04, 5, 4), -0.19, 1.87, 0),
        put(ball(0.038, 5, 4), 0, 1.85, 0.2),
      ])!,
    ),
    eyes: keep(mergeGeometries([put(ball(0.027, 5, 4), 0.075, 1.9, 0.188), put(ball(0.027, 5, 4), -0.075, 1.9, 0.188)])!),
    hairCrop: keep(crop()),
    hairAfro: keep(put(ball(0.3, 10, 8), 0, 1.97, -0.035, 1, 0.92, 1)),
    hairLong: keep(
      mergeGeometries([
        crop(),
        put(capsule(0.05, 0.3, 5), -0.12, 1.66, -0.16),
        put(capsule(0.05, 0.34, 5), 0, 1.64, -0.19),
        put(capsule(0.05, 0.3, 5), 0.12, 1.66, -0.16),
      ])!,
    ),
    // Arms hang from the shoulder joint; the forearm (with the hand) from the elbow.
    upperArm: keep(put(capsule(0.07 * w, 0.14), 0, -0.13, 0)),
    foreArm: keep(mergeGeometries([put(capsule(0.058 * w, 0.15), 0, -0.135, 0), put(ball(0.066 * w, 6, 5), 0, -0.3, 0)])!),
  };
}

// ─── you, and the people inside buildings ──────────────────────────────────

export interface PlayerModel {
  group: THREE.Group;
  body: THREE.Group;
  /** The hip joints: rotate x to swing a leg. */
  legL: THREE.Group; legR: THREE.Group;
  /** The knees: rotate x (positive bends the shin back). */
  kneeL: THREE.Group; kneeR: THREE.Group;
  /** The shoulder joints: rotate x to swing an arm. */
  armL: THREE.Group; armR: THREE.Group;
  /** The elbows: rotate x (negative lifts the hand forward). */
  elbowL: THREE.Group; elbowR: THREE.Group;
  /** The upper body, which twists at the waist. */
  torso: THREE.Group;
  /** The head, which turns on the neck. */
  head: THREE.Group;
  handset: THREE.Mesh;
}

export function buildPlayerModel(look: Look | undefined, bin: Bin): PlayerModel {
  const l = look ?? defaultLook();
  const skin = SKIN[l.skin]?.base ?? '#6b3f2a';
  const top = l.outfit.top?.c1 ?? '#2b2f3a';
  const bottom = l.outfit.bottom?.c1 ?? '#2c4a78';
  const shoes = l.outfit.shoes?.c1 ?? '#f4f4f4';
  const hairColor = l.hairColor ?? '#141110';
  const slim = l.build === 'slim' ? 0.9 : l.build === 'heavy' ? 1.15 : 1;
  const g = characterGeometry(bin, slim);

  const mat = (c: string) => bin.add(new THREE.MeshLambertMaterial({ color: c }));
  const mesh = (geo: THREE.BufferGeometry, c: string, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const me = new THREE.Mesh(geo, mat(c));
    me.position.set(x, y, z);
    parent.add(me);
    return me;
  };
  const joint = (parent: THREE.Object3D, x: number, y: number, z = 0) => {
    const j = new THREE.Group();
    j.position.set(x, y, z);
    parent.add(j);
    return j;
  };

  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const leg = (side: number) => {
    const hip = joint(body, side * J.hipX * slim, J.hipY);
    mesh(g.thigh, bottom, hip);
    const knee = joint(hip, 0, -J.thigh);
    mesh(g.shin, bottom, knee);
    const ankle = joint(knee, 0, -J.shin);
    mesh(g.shoe, shoes, ankle);
    return { hip, knee };
  };
  const legL = leg(1), legR = leg(-1);

  mesh(g.pelvis, bottom, body);

  // The upper body pivots at the waist; the head at the neck.
  const torso = joint(body, 0, J.waist);
  mesh(g.torso, top, torso, 0, -J.waist, 0);

  const arm = (side: number) => {
    const shoulder = joint(torso, side * (J.shoulderX * slim), J.shoulderY - J.waist);
    mesh(g.upperArm, top, shoulder);
    const elbow = joint(shoulder, 0, -J.upperArm);
    mesh(g.foreArm, skin, elbow);
    return { shoulder, elbow };
  };
  const armL = arm(1), armR = arm(-1);

  // A phone in the right hand, shown when you take it out.
  const handset = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.09, 0.17, 0.02)), mat('#0d0e12'));
  handset.position.set(0, -0.3, 0.09);
  const screenGlow = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.075, 0.145, 0.005)), bin.add(new THREE.MeshBasicMaterial({ color: '#7fb4ff', toneMapped: false })));
  screenGlow.position.set(0, 0, 0.013);
  handset.add(screenGlow);
  handset.visible = false;
  armR.elbow.add(handset);

  const head = joint(torso, 0, J.neck - J.waist);
  mesh(g.head, skin, head, 0, -J.neck, 0);
  mesh(g.eyes, '#111111', head, 0, -J.neck, 0);
  const kind = hairKindFor(l.hair);
  if (kind !== 'none') mesh(kind === 'afro' ? g.hairAfro : kind === 'long' ? g.hairLong : g.hairCrop, hairColor, head, 0, -J.neck, 0);

  body.scale.setScalar(0.92);
  return { group, body, legL: legL.hip, legR: legR.hip, kneeL: legL.knee, kneeR: legR.knee, armL: armL.shoulder, armR: armR.shoulder, elbowL: armL.elbow, elbowR: armR.elbow, torso, head, handset };
}

// ─── the street crowd ──────────────────────────────────────────────────────

export interface CrowdPerson {
  colors: { skin: string; top: string; bottom: string; shoes: string; hair: string; bald: boolean };
  scale: number;
}

export interface CrowdPose {
  visible: boolean; x: number; y: number; z: number; rot: number; phase: number; moving: boolean;
  arms?: number; activity?: 'walk' | 'idle' | 'phone'; startle?: number;
}

export interface Crowd {
  group: THREE.Group;
  update(poses: CrowdPose[]): void;
}

/** Each person keeps the same hairstyle: about half crop, a quarter afro, a quarter long. */
function hairOf(i: number, bald: boolean): HairKind {
  if (bald) return 'none';
  const h = (i * 2654435761) >>> 0;
  const r = (h >>> 8) % 4;
  return r < 2 ? 'crop' : r === 2 ? 'afro' : 'long';
}

export function buildCrowdModel(people: CrowdPerson[], bin: Bin, shadowMap: THREE.Texture): Crowd {
  const group = new THREE.Group();
  const n = Math.max(1, people.length);
  const g = characterGeometry(bin, 1);
  const mat = bin.add(new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  const eyeMat = bin.add(new THREE.MeshBasicMaterial({ color: '#111111' }));

  const part = (geo: THREE.BufferGeometry, per: number, material: THREE.Material = mat) => {
    const im = new THREE.InstancedMesh(geo, material, n * per);
    im.frustumCulled = false; // instances move about; the bounds would be stale
    im.count = 0;
    group.add(im);
    return { im, per };
  };
  const thighs = part(g.thigh, 2), shins = part(g.shin, 2), shoes = part(g.shoe, 2);
  const pelvis = part(g.pelvis, 1), torso = part(g.torso, 1);
  const uppers = part(g.upperArm, 2), fores = part(g.foreArm, 2);
  const heads = part(g.head, 1), eyes = part(g.eyes, 1, eyeMat);
  const hairs = { crop: part(g.hairCrop, 1), afro: part(g.hairAfro, 1), long: part(g.hairLong, 1) };
  const shadowGeo = bin.add(new THREE.PlaneGeometry(1.1, 1.1));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadows = part(shadowGeo, 1, bin.add(new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false })));
  const all = [thighs, shins, shoes, pelvis, torso, uppers, fores, heads, eyes, hairs.crop, hairs.afro, hairs.long, shadows];

  const hairKinds = people.map((p, i) => hairOf(i, p.colors.bald));

  // Only the people who are out and on screen are drawn: they are packed into the
  // first slots, so the GPU never touches the rest. Colours follow the packing and
  // are rewritten only when somebody appears or disappears.
  let packed: number[] = [];
  const col = new THREE.Color();
  const paint = (vis: number[]) => {
    vis.forEach((pi, j) => {
      const c = people[pi].colors;
      const set = (m: { im: THREE.InstancedMesh; per: number }, k: number, hex: string) => m.im.setColorAt(j * m.per + k, col.set(hex));
      for (const k of [0, 1]) { set(thighs, k, c.bottom); set(shins, k, c.bottom); set(shoes, k, c.shoes); set(uppers, k, c.top); set(fores, k, c.skin); }
      set(pelvis, 0, c.bottom); set(torso, 0, c.top); set(heads, 0, c.skin);
      set(hairs.crop, 0, c.hair); set(hairs.afro, 0, c.hair); set(hairs.long, 0, c.hair);
    });
    for (const m of all) if (m.im.instanceColor) m.im.instanceColor.needsUpdate = true;
  };

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const base = new THREE.Matrix4(), torsoM = new THREE.Matrix4(), headM = new THREE.Matrix4();
  const hipM = new THREE.Matrix4(), kneeM = new THREE.Matrix4(), ankleM = new THREE.Matrix4();
  const shoulderM = new THREE.Matrix4(), elbowM = new THREE.Matrix4();
  const mT = new THREE.Matrix4(), mR = new THREE.Matrix4();
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), scl = new THREE.Vector3();

  const move = (out: THREE.Matrix4, from: THREE.Matrix4, x: number, y: number, z: number, rx = 0, ry = 0) => {
    out.copy(from).multiply(mT.makeTranslation(x, y, z));
    if (ry) out.multiply(mR.makeRotationY(ry));
    if (rx) out.multiply(mR.makeRotationX(rx));
    return out;
  };

  const update = (poses: CrowdPose[]) => {
    const vis: number[] = [];
    for (let i = 0; i < people.length; i++) if (poses[i]?.visible) vis.push(i);
    let same = vis.length === packed.length;
    for (let j = 0; same && j < vis.length; j++) if (vis[j] !== packed[j]) same = false;
    if (!same) { packed = vis; paint(vis); }
    const k = vis.length;
    for (const m of all) m.im.count = k * m.per;
    if (k === 0) return;

    for (let j = 0; j < k; j++) {
      const i = vis[j];
      const p = poses[i];
      const s = people[i].scale;
      const activity = p.activity ?? (p.moving ? 'walk' : 'idle');
      const ph = p.phase;
      const walking = p.moving;
      const bob = walking ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(ph * 0.7) * 0.01;
      // Idle people shift their weight; phone users lean over the screen.
      const sway = activity === 'idle' ? Math.sin(ph * 0.7) * 0.025 : activity === 'phone' ? -0.035 : 0;
      base.compose(pos.set(p.x, p.y + bob, p.z), q.setFromAxisAngle(up, p.rot + sway), scl.set(s, s, s));

      // The upper body twists against the stride and leans into it.
      const twist = walking ? Math.sin(ph) * 0.14 : activity === 'idle' ? Math.sin(ph * 0.5) * 0.04 : 0;
      const lean = walking ? 0.07 : activity === 'phone' ? 0.16 : 0;
      move(torsoM, base, 0, J.waist, 0, lean, twist).multiply(mT.makeTranslation(0, -J.waist, 0));
      // The head counter-turns while walking, scans the street when idle, looks down at a phone.
      const headYaw = walking ? -twist * 0.6 : activity === 'idle' ? Math.sin(ph * 0.55) * 0.35 : activity === 'phone' ? -0.15 : 0;
      const headPitch = activity === 'phone' ? 0.35 : 0;
      move(headM, torsoM, 0, J.neck, 0, headPitch, headYaw).multiply(mT.makeTranslation(0, -J.neck, 0));

      pelvis.im.setMatrixAt(j, base);
      torso.im.setMatrixAt(j, torsoM);
      heads.im.setMatrixAt(j, headM);
      eyes.im.setMatrixAt(j, headM);
      hairs.crop.im.setMatrixAt(j, hairKinds[i] === 'crop' ? headM : zero);
      hairs.afro.im.setMatrixAt(j, hairKinds[i] === 'afro' ? headM : zero);
      hairs.long.im.setMatrixAt(j, hairKinds[i] === 'long' ? headM : zero);
      shadows.im.setMatrixAt(j, mT.makeTranslation(p.x, p.y + 0.02, p.z));

      // Legs: the thigh swings, and the knee bends while that leg is carried forward.
      const swing = walking ? Math.sin(ph) * 0.62 : activity === 'idle' ? Math.sin(ph * 0.7) * 0.05 : 0;
      for (const side of [1, -1]) {
        const idx = side === 1 ? 0 : 1;
        const thighA = side * swing;
        const carry = walking ? Math.max(0, -Math.cos(ph) * side) : 0;
        const kneeA = carry * 1.0 + 0.05;
        move(hipM, base, side * J.hipX, J.hipY, 0, thighA);
        thighs.im.setMatrixAt(j * 2 + idx, hipM);
        move(kneeM, hipM, 0, -J.thigh, 0, kneeA);
        shins.im.setMatrixAt(j * 2 + idx, kneeM);
        move(ankleM, kneeM, 0, -J.shin, 0, -(thighA + kneeA) * 0.7);
        shoes.im.setMatrixAt(j * 2 + idx, ankleM);
      }

      // Arms swing against the legs; the elbow bends more as the hand comes forward.
      const startle = p.arms ?? 0;
      for (const side of [1, -1]) {
        const idx = side === 1 ? 0 : 1;
        let armA = walking ? -side * swing * 0.9 : activity === 'idle' ? side * Math.sin(ph * 0.7) * 0.05 : 0;
        let elbowA = -(0.18 + Math.max(0, -armA) * 0.75);
        if (startle) { armA = -startle; elbowA = -0.3; }
        else if (activity === 'phone') {
          if (side === -1) { armA = -0.95; elbowA = -1.25; } else { armA = -0.08; elbowA = -0.2; }
        }
        move(shoulderM, torsoM, side * J.shoulderX, J.shoulderY, 0, armA);
        uppers.im.setMatrixAt(j * 2 + idx, shoulderM);
        move(elbowM, shoulderM, 0, -J.upperArm, 0, elbowA);
        fores.im.setMatrixAt(j * 2 + idx, elbowM);
      }
    }
    for (const m of all) m.im.instanceMatrix.needsUpdate = true;
  };

  return { group, update };
}
