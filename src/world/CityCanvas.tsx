// ─── THE CITY: SCENE ───────────────────────────────────────────────────────
//
// The 3D view. Builds the city once, then every frame: read input, move the
// player or the car, pose the models, and put the camera behind them.

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Bin, blobTexture, buildCar, buildCity, buildPlayer } from './build';
import { cityLayout, type Place } from './layout';
import { handbrake, hudStore, moveAxis, sprinting, takeAction, takeJump, takeLook } from './input';
import { distToCar, ensureSpawned, exitCar, groundAt, idleCar, lerpAngle, live, stepCar, stepPlayer } from './sim';
import type { Look } from '../sim/look';

const SKY = '#9cc3e6';
/** How close to a door marker counts as "at the door". */
const DOOR_REACH = 1.9;
const CAR_REACH = 3.4;
/** Above this speed you have to slow down before getting out. */
const EXIT_SPEED = 7;

export function CityCanvas({ look, onEnter }: { look?: Look; onEnter: (p: Place) => void }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 62, near: 0.1, far: 420 }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(SKY);
        scene.fog = new THREE.Fog(SKY, 70, 240);
      }}
    >
      <hemisphereLight args={['#e4f0ff', '#6b6050', 1.25]} />
      <directionalLight position={[60, 100, 40]} intensity={1.9} color="#fff2dc" />
      <World look={look} onEnter={onEnter} />
    </Canvas>
  );
}

function World({ look, onEnter }: { look?: Look; onEnter: (p: Place) => void }) {
  const camera = useThree((s) => s.camera);
  const enterRef = useRef(onEnter);
  enterRef.current = onEnter;

  // The look is read once: the city is built for the player who walked in.
  const lookRef = useRef(look);

  const built = useMemo(() => {
    ensureSpawned();
    const bin = new Bin();
    const city = buildCity(bin);
    const player = buildPlayer(lookRef.current, bin);
    const car = buildCar('#ffb800', bin);
    const blob = blobTexture(bin);
    const shadowMat = bin.add(new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false }));
    const plane = bin.add(new THREE.PlaneGeometry(1, 1));
    const pShadow = new THREE.Mesh(plane, shadowMat);
    pShadow.rotation.x = -Math.PI / 2;
    pShadow.scale.set(1.1, 1.1, 1);
    const cShadow = new THREE.Mesh(plane, shadowMat);
    cShadow.rotation.x = -Math.PI / 2;
    cShadow.scale.set(2.8, 5.4, 1);
    // Parked cars get a shadow too.
    for (const pc of cityLayout().parked) {
      const s = new THREE.Mesh(plane, shadowMat);
      s.rotation.set(-Math.PI / 2, 0, pc.heading);
      s.scale.set(2.8, 5.4, 1);
      s.position.set(pc.x, 0.02, pc.z);
      city.root.add(s);
    }
    const scene = new THREE.Group();
    scene.add(city.root, player.group, car.group, pShadow, cShadow);
    const doors = cityLayout().buildings
      .filter((b) => b.place && b.door)
      .map((b) => ({ place: b.place!, door: b.door!, x: b.door!.x + b.door!.nx * 1.6, z: b.door!.z + b.door!.nz * 1.6 }));
    return { bin, city, player, car, pShadow, cShadow, scene, doors, ray: new THREE.Raycaster() };
  }, []);

  useEffect(() => () => built.bin.dispose(), [built]);

  // Put the camera in place before the first frame so it doesn't swoop in.
  useEffect(() => {
    hudStore.set({ mode: live.mode, prompt: null, speedKmh: 0 });
  }, []);

  const tmp = useMemo(() => ({ target: new THREE.Vector3(), want: new THREE.Vector3(), dir: new THREE.Vector3(), lastHud: 0, first: true }), []);

  useFrame((state, rawDt) => {
    // On a slow phone, take a couple of small steps rather than going into
    // slow motion; after a long pause (tab hidden), just carry on.
    const frameDt = Math.min(rawDt, 0.1);
    const steps = Math.max(1, Math.ceil(frameDt / 0.034));
    const dt = frameDt / steps;
    const t = state.clock.elapsedTime;
    const { player, car, pShadow, cShadow, city, doors, ray } = built;

    // ── camera drag ─────────────────────────────────────────────────────
    const look = takeLook();
    if (look.dx || look.dy) {
      live.cam.yaw -= look.dx * 0.0065;
      live.cam.pitch = Math.max(0.04, Math.min(1.25, live.cam.pitch + look.dy * 0.0045));
      live.cam.manualAt = t;
    }

    const action = takeAction();
    const jump = takeJump();
    const move = moveAxis();
    let prompt: string | null = null;

    if (live.mode === 'foot') {
      let door: (typeof doors)[number] | null = null;
      let best = DOOR_REACH;
      for (const d of doors) {
        const dist = Math.hypot(live.p.x - d.x, live.p.z - d.z);
        if (dist < best) { best = dist; door = d; }
      }
      const nearCar = distToCar() < CAR_REACH;
      if (door) prompt = door.place.screen ? `Enter ${door.place.name}` : `${door.place.name} · opening soon`;
      else if (nearCar) prompt = 'Get in your car';

      if (action) {
        if (door) {
          if (door.place.screen) {
            // Step back out facing the street when you return.
            live.p.x = door.x;
            live.p.z = door.z;
            live.p.rot = Math.atan2(door.door.nx, door.door.nz);
            live.p.speed = 0;
            // Camera over the shoulder, looking down the street rather than
            // pressed against the wall behind you.
            live.cam.yaw = live.p.rot + Math.PI - 0.75;
            live.cam.pitch = 0.3;
          }
          enterRef.current(door.place);
        } else if (nearCar) {
          live.mode = 'car';
          live.exitQueued = false;
          live.cam.manualAt = -10;
        }
      }
      if (live.mode === 'foot') {
        for (let i = 0; i < steps; i++) {
          stepPlayer(dt, move, sprinting(), jump && i === 0);
          idleCar(dt);
        }
      }
    } else {
      // Asking to get out at speed brakes to a stop first, then steps out.
      if (action) live.exitQueued = !live.exitQueued || Math.abs(live.car.v) < EXIT_SPEED;
      if (live.exitQueued && Math.abs(live.car.v) < 1.2) exitCar();
      else {
        prompt = live.exitQueued ? 'Stopping…' : Math.abs(live.car.v) < EXIT_SPEED ? 'Get out' : null;
        for (let i = 0; i < steps; i++) stepCar(dt, live.exitQueued ? null : move, live.exitQueued || handbrake());
      }
    }

    // ── pose the player ─────────────────────────────────────────────────
    const p = live.p;
    player.group.visible = live.mode === 'foot';
    player.group.position.set(p.x, p.y, p.z);
    player.group.rotation.y = p.rot;
    const stride = Math.min(1, p.speed / 3.4);
    const swing = Math.sin(p.phase) * (0.35 + 0.45 * Math.min(1, p.speed / 7)) * stride;
    if (p.grounded) {
      player.legL.rotation.x = swing;
      player.legR.rotation.x = -swing;
      player.armL.rotation.x = -swing * 0.9;
      player.armR.rotation.x = swing * 0.9;
      player.body.position.y = Math.abs(Math.sin(p.phase)) * 0.06 * stride;
      player.body.rotation.x = 0.12 * Math.min(1, p.speed / 7);
    } else {
      player.legL.rotation.x = -0.6;
      player.legR.rotation.x = 0.25;
      player.armL.rotation.x = -1.6;
      player.armR.rotation.x = -1.4;
    }
    // Idle breathing.
    if (p.speed < 0.2 && p.grounded) player.body.scale.y = 0.92 * (1 + Math.sin(t * 2.2) * 0.008);
    else player.body.scale.y = 0.92;
    pShadow.visible = player.group.visible;
    pShadow.position.set(p.x, groundAt(p.x, p.z) + 0.02, p.z);
    const air = Math.max(0, p.y - groundAt(p.x, p.z));
    pShadow.scale.set(1.1 - Math.min(0.5, air * 0.3), 1.1 - Math.min(0.5, air * 0.3), 1);

    // ── pose the car ────────────────────────────────────────────────────
    const c = live.car;
    car.group.position.set(c.x, c.y, c.z);
    car.group.rotation.y = c.heading;
    car.body.rotation.z = THREE.MathUtils.clamp(-c.steer * c.v * 0.012, -0.08, 0.08);
    car.body.position.y = c.bump > 0 ? Math.sin(t * 60) * 0.03 * c.bump : 0;
    car.wheels.forEach((w) => { w.rotation.x = c.spin; });
    car.steer.forEach((s) => { s.rotation.y = c.steer; });
    cShadow.position.set(c.x, c.y + 0.02, c.z);
    cShadow.rotation.z = c.heading;

    // ── door markers ────────────────────────────────────────────────────
    for (const mk of city.markers) {
      // The floating gem is for finding a door from down the street; up close
      // it would only get in the way of the camera.
      mk.gem.visible = Math.hypot(mk.ring.position.x - p.x, mk.ring.position.z - p.z) > 4 || live.mode === 'car';
      mk.gem.rotation.y = t * 1.6;
      mk.gem.position.y = mk.baseY + Math.sin(t * 2.4) * 0.15;
      (mk.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 3.2) * 0.3;
    }

    // ── camera ──────────────────────────────────────────────────────────
    const driving = live.mode === 'car';
    if (driving) {
      tmp.target.set(c.x, c.y + 1.5, c.z);
      // Swing round behind the car unless the player is looking about.
      if (t - live.cam.manualAt > 1.2 && Math.abs(c.v) > 1.5) {
        live.cam.yaw = lerpAngle(live.cam.yaw, c.heading + Math.PI, Math.min(1, frameDt * 2.6));
        live.cam.pitch += (0.26 - live.cam.pitch) * Math.min(1, frameDt * 1.5);
      }
    } else {
      tmp.target.set(p.x, p.y + 1.55, p.z);
    }
    // A phone held upright sees a narrow slice of the world: pull back and
    // widen the lens so the street around you is still on screen.
    const portrait = state.size.width < state.size.height;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = portrait ? 72 : 62;
    if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
    let dist = (driving ? 8.2 + Math.min(4, Math.abs(c.v) * 0.09) : 5.2) * (portrait ? 1.3 : 1);
    const cp = Math.cos(live.cam.pitch);
    tmp.dir.set(Math.sin(live.cam.yaw) * cp, Math.sin(live.cam.pitch), Math.cos(live.cam.yaw) * cp).normalize();
    ray.set(tmp.target, tmp.dir);
    ray.far = dist + 0.5;
    const hit = ray.intersectObjects(city.occluders, false)[0];
    if (hit) dist = Math.max(1.1, hit.distance - 0.45);
    tmp.want.copy(tmp.target).addScaledVector(tmp.dir, dist);
    tmp.want.y = Math.max(tmp.want.y, 0.4);
    if (tmp.first) { camera.position.copy(tmp.want); tmp.first = false; }
    else {
      // Pull in fast when a wall gets in the way, ease out slowly.
      const k = hit ? 1 - Math.exp(-frameDt * 25) : 1 - Math.exp(-frameDt * (driving ? 9 : 12));
      camera.position.lerp(tmp.want, k);
    }
    camera.lookAt(tmp.target);

    // ── HUD ─────────────────────────────────────────────────────────────
    const speedKmh = driving ? Math.round(Math.abs(c.v) * 3.6) : 0;
    const hudPatch: { mode: typeof live.mode; prompt: string | null; speedKmh?: number } = { mode: live.mode, prompt };
    if (t - tmp.lastHud > 0.1) { hudPatch.speedKmh = speedKmh; tmp.lastHud = t; }
    hudStore.set(hudPatch);
  });

  return <primitive object={built.scene} />;
}
