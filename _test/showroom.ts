// Dev-only page: lines up every vehicle and the walk cycle so they can be looked at (and photographed in tests).
import * as THREE from 'three';
import { Bin } from '../src/world/build';
import { buildVehicle, CAR_KINDS } from '../src/world/vehicles';
import { buildCrowdModel, buildPlayerModel } from '../src/world/characters';

const mode = new URLSearchParams(location.search).get('mode') ?? 'cars';
const W = mode === 'sit' ? 700 : 1500, H = mode === 'cars' ? 560 : mode === 'sit' ? 420 : 520;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9ec7ee');
scene.add(new THREE.HemisphereLight('#ffffff', '#6b6f7a', 1.6));
const sun = new THREE.DirectionalLight('#fff3dd', 2.2);
sun.position.set(-8, 14, 10);
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshLambertMaterial({ color: '#3a3d45' }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const bin = new Bin();

const paints = ['#c0392b', '#ecf0f1', '#1f4e79', '#2b2f36', '#f2c200', '#f5d400', '#16a085'];
if (mode === 'cars') {
  const kinds = [...CAR_KINDS];
  kinds.forEach((k, i) => {
    const v = buildVehicle(k, k === 'taxi' ? '#f2c200' : k === 'minibus' ? '#f5d400' : paints[i % paints.length], bin, i === 0);
    v.group.position.set((i - (kinds.length - 1) / 2) * 6.6, 0, 0);
    v.group.rotation.y = -0.6;
    scene.add(v.group);
  });
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);
  cam.position.set(-6, 7.5, -30);
  cam.lookAt(0, 1.0, 0);
  renderer.render(scene, cam);
} else if (mode === 'sit') {
  // A seated person, side-on, as the interiors pose them.
  const m = buildPlayerModel(undefined, bin);
  m.group.position.set(0, 0.42, 0);
  m.group.rotation.y = Math.PI / 2;
  m.legL.rotation.x = -1.45; m.legR.rotation.x = -1.45; m.kneeL.rotation.x = 1.45; m.kneeR.rotation.x = 1.45;
  scene.add(m.group);
  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.7), new THREE.MeshLambertMaterial({ color: '#2b6c8f' }));
  chair.position.set(-0.05, 0.21, 0);
  scene.add(chair);
  const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
  cam.position.set(0, 1.3, 9);
  cam.lookAt(0, 1.0, 0);
  renderer.render(scene, cam);
} else {
  // Eight moments of the walk cycle, side on, then idle and phone.
  const people = Array.from({ length: 10 }, (_, i) => ({ colors: { skin: ['#6b3f2a', '#8d5a3b', '#4a2c20', '#c68a62'][i % 4], top: ['#c0392b', '#2b6cb0', '#d69e2e', '#2f855a', '#6b46c1'][i % 5], bottom: ['#2c4a78', '#2b2f3a', '#4a5568'][i % 3], shoes: '#f4f4f4', hair: ['#141110', '#3b2a20', '#141110', '#7a4b2a'][i % 4], bald: i === 7 }, scale: 1 }));
  const crowd = buildCrowdModel(people, bin, new THREE.Texture());
  scene.add(crowd.group);
  const poses = people.map((_, i) => ({
    visible: true, x: (i - 4.5) * 1.5, y: 0, z: 0, rot: Math.PI / 2, phase: i < 8 ? (i * Math.PI) / 4 : 1.2, moving: i < 8,
    activity: (i === 8 ? 'idle' : i === 9 ? 'phone' : 'walk') as 'walk' | 'idle' | 'phone',
  }));
  crowd.update(poses);
  const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 200);
  cam.position.set(0, 1.25, 16);
  cam.lookAt(0, 1.05, 0);
  renderer.render(scene, cam);
  // And the player model standing by itself, front on, for the face.
  const pm = buildPlayerModel(undefined, bin);
  pm.group.position.set(0, 0, 0);
  void pm;
}
(window as unknown as { __done: boolean }).__done = true;
