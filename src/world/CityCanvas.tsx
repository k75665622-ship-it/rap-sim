// ─── THE CITY: SCENE ───────────────────────────────────────────────────────
//
// The 3D view. Builds the city once, then every frame: read input, move the
// player or the car, pose the models, and put the camera behind them.

import { shootCam } from './shootcam';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Bin, blobTexture, buildCar, buildCity, buildCrowd, buildPlayer, buildSky, type CrowdPose } from './build';
import { cast, isOut, stepPeople, type Resident } from './people';
import { radio } from './radio';
import { drivePrefs } from './drivePrefs';
import { daylightAt, minuteDelta } from './daylight';
import { phone } from './phone';
import { useGameStore } from '../store/gameStore';
import { cityLayout, type Place } from './layout';
import { handbrake, hudStore, moveAxis, sprinting, takeAction, takeJump, takeLook } from './input';
import { CAR, PLAYER_R, distToCar, ensureSpawned, exitCar, groundAt, idleCar, lerpAngle, live, stepCar, stepPlayer } from './sim';
import type { Look } from '../sim/look';

const SKY = '#9cc3e6';
/** How close to a door marker counts as "at the door". */
const DOOR_REACH = 1.9;
const CAR_REACH = 3.4;
/** Above this speed you have to slow down before getting out. */
const EXIT_SPEED = 7;

const COARSE = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

export function CityCanvas({ look, onEnter, paused }: { look?: Look; onEnter: (p: Place) => void; paused?: boolean }) {
  return (
    <Canvas
      // Phones: fewer pixels and no antialiasing — the biggest single saving.
      dpr={COARSE ? [1, 1.3] : [1, 1.75]}
      frameloop={paused ? 'never' : 'always'}
      gl={{ antialias: !COARSE, powerPreference: 'high-performance' }}
      camera={{ fov: 62, near: 0.1, far: 300 }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(SKY);
        scene.fog = new THREE.Fog(SKY, 70, 240);
      }}
    >
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
    const sky = buildSky(bin);
    // Lights. Made here rather than in JSX so the day/night loop can drive them.
    const hemi = new THREE.HemisphereLight('#e4f0ff', '#6b6050', 1.25);
    const sun = new THREE.DirectionalLight('#fff2dc', 1.9);
    // Headlights on your car, faded in after dark. Always present, so turning
    // them on doesn't make every material recompile mid-drive.
    const beam = new THREE.SpotLight('#fff1d0', 0, 55, 0.55, 0.55, 1);
    beam.position.set(0, 0.9, 2.1);
    beam.target.position.set(0, -0.6, 16);
    car.group.add(beam, beam.target);
    // A soft light that follows you after dark, so your artist is a person
    // under the street lamps rather than a silhouette.
    const fill = new THREE.PointLight('#ffe6c8', 0, 16, 1);
    // The people of the city, all drawn by one set of instanced meshes.
    const residents = cast();
    const crowd = buildCrowd(residents, bin);
    const poses: CrowdPose[] = residents.map(() => ({ visible: false, x: 0, y: 0, z: 0, rot: 0, phase: 0, moving: false }));
    const scene = new THREE.Group();
    scene.add(city.root, player.group, car.group, pShadow, cShadow, sky.group, hemi, sun, fill, crowd.group);
    const doors = cityLayout().buildings
      .filter((b) => b.place && b.door)
      .map((b) => ({ place: b.place!, door: b.door!, x: b.door!.x + b.door!.nx * 1.6, z: b.door!.z + b.door!.nz * 1.6 }));
    return { bin, city, player, car, pShadow, cShadow, scene, doors, sky, hemi, sun, beam, fill, residents, crowd, poses, ray: new THREE.Raycaster() };
  }, []);

  useEffect(() => () => {
    built.bin.dispose();
    // Leaving the city: the radio goes quiet, and nobody is mid-conversation.
    radio.pause();
    hudStore.set({ talk: null });
  }, [built]);

  // Put the camera in place before the first frame so it doesn't swoop in.
  useEffect(() => {
    hudStore.set({ mode: live.mode, prompt: null, speedKmh: 0 });
  }, []);

  const tmp = useMemo(() => ({
    target: new THREE.Vector3(), want: new THREE.Vector3(), dir: new THREE.Vector3(), lastHud: 0, first: true,
    /** The minute of the day being shown; eases after the game clock. */
    minute: useGameStore.getState().clockMinute ?? 720,
    mode: live.mode as typeof live.mode,
    talking: null as Resident | null,
    lastScare: -10,
  }), []);

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

    // With the phone out, or while talking to someone, you stand still (and
    // the car rolls to a stop).
    const phoneOut = phone.isOpen();
    const hs = hudStore.get();
    const talkId = hs.talk;
    if (!talkId && tmp.talking) { tmp.talking.hold = 0.6; tmp.talking = null; }
    const busy = phoneOut || !!talkId || hs.gig || hs.shooting;
    const action = takeAction() && !busy;
    const jump = takeJump() && !busy;
    const move = busy ? { x: 0, y: 0 } : moveAxis();
    let prompt: string | null = null;
    const { residents } = built;

    if (live.mode === 'foot') {
      let door: (typeof doors)[number] | null = null;
      let best = DOOR_REACH;
      for (const d of doors) {
        const dist = Math.hypot(live.p.x - d.x, live.p.z - d.z);
        if (dist < best) { best = dist; door = d; }
      }
      const nearCar = distToCar() < CAR_REACH;
      // Somebody close enough to talk to (and facing-ish doesn't matter).
      let person: Resident | null = null;
      let pd = 2.1;
      for (const r of residents) {
        if (!isOut(r)) continue;
        const d = Math.hypot(r.x - live.p.x, r.z - live.p.z);
        if (d < pd) { pd = d; person = r; }
      }
      // Standing by your car with someone walking past: the car wins.
      if (person && nearCar && distToCar() - 1.3 < pd) person = null;
      // The Stage's open mic runs in the evening.
      const hr = (useGameStore.getState().clockMinute ?? 0) / 60;
      hudStore.set({ nearStage: door?.place.id === 'stage' && (hr >= 19 || hr < 3) });
      if (door) prompt = door.place.screen ? `Enter ${door.place.name}` : `${door.place.name} · opening soon`;
      else if (person) prompt = person.local ? `Say hi to ${person.name}` : `Talk to ${person.name}`;
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
        } else if (person) {
          // They stop and turn to you; you turn to them.
          person.hold = 1e6;
          person.rot = Math.atan2(live.p.x - person.x, live.p.z - person.z);
          live.p.rot = Math.atan2(person.x - live.p.x, person.z - live.p.z);
          live.p.speed = 0;
          tmp.talking = person;
          hudStore.set({ talk: person.id });
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
        // Brush past people rather than walking through them.
        for (const r of residents) {
          if (!isOut(r)) continue;
          const dx = live.p.x - r.x, dz = live.p.z - r.z;
          const d = Math.hypot(dx, dz);
          const min = PLAYER_R + 0.34;
          if (d < min && d > 1e-4) { live.p.x = r.x + (dx / d) * min; live.p.z = r.z + (dz / d) * min; }
        }
      }
    } else {
      if (hs.nearStage) hudStore.set({ nearStage: false });
      // Asking to get out at speed brakes to a stop first, then steps out.
      if (action) live.exitQueued = !live.exitQueued || Math.abs(live.car.v) < EXIT_SPEED;
      if (live.exitQueued && Math.abs(live.car.v) < 1.2) exitCar();
      else {
        prompt = live.exitQueued ? 'Stopping…' : Math.abs(live.car.v) < EXIT_SPEED ? 'Get out' : null;
        const stop = live.exitQueued || phoneOut;
        for (let i = 0; i < steps; i++) stepCar(dt, stop ? null : move, stop || handbrake());
      }
    }

    // ── the radio follows you in and out of the car ─────────────────────
    if (tmp.mode !== live.mode) {
      if (live.mode === 'car') radio.start(); else radio.pause();
      tmp.mode = live.mode;
    }

    // ── everybody else ──────────────────────────────────────────────────
    const c0 = live.car;
    const scared = stepPeople(frameDt, useGameStore.getState().clockMinute ?? 720, { x: c0.x, z: c0.z, heading: c0.heading, v: c0.v, halfW: CAR.halfW, halfL: CAR.halfL });
    if (scared && t - tmp.lastScare > 6 && live.mode === 'car') {
      tmp.lastScare = t;
      hudStore.toast(['"Hey! Watch where you\'re driving!"', '"Ei! You want to kill me?!"', '"Slow down, superstar!"', '"This is a pavement, not a road!"'][Math.floor(Math.random() * 4)], 2200);
    }
    const camX = camera.position.x, camZ = camera.position.z;
    built.residents.forEach((r, i) => {
      const pose = built.poses[i];
      const out = isOut(r) && Math.abs(r.x - camX) < 130 && Math.abs(r.z - camZ) < 130;
      pose.visible = out;
      if (!out) return;
      pose.x = r.x; pose.z = r.z; pose.y = groundAt(r.x, r.z);
      pose.rot = r.rot; pose.phase = r.phase;
      pose.moving = r.hold <= 0 && r.path.length > 0;
      pose.arms = r.startle > 0 ? 2.7 : 0;
    });
    built.crowd.update(built.poses);

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
    // Dancing for the camera.
    if (live.shoot.on) {
      const b = Math.sin(t * 8);
      player.armL.rotation.x = -2.3 + b * 0.6;
      player.armR.rotation.x = -2.3 - b * 0.6;
      player.legL.rotation.x = b * 0.25;
      player.legR.rotation.x = -b * 0.25;
      player.body.position.y = Math.abs(b) * 0.09;
      player.group.rotation.y = p.rot + Math.sin(t * 2) * 0.5;
    }
    // Phone up to your face.
    player.handset.visible = phoneOut;
    if (phoneOut) { player.armR.rotation.x = -1.25; player.armR.rotation.z = 0.35; }
    else player.armR.rotation.z = 0;
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

    // ── day and night ───────────────────────────────────────────────────
    // Ease after the game clock (it moves in 10-minute ticks, and sleeping
    // jumps hours) so the light glides instead of stepping.
    const clock = useGameStore.getState().clockMinute ?? 720;
    tmp.minute = (tmp.minute + minuteDelta(tmp.minute, clock) * Math.min(1, frameDt * 2.5) + 1440) % 1440;
    const day = daylightAt(tmp.minute);
    const { sky, hemi, sun, beam } = built;
    const scene = state.scene;
    if (scene.background instanceof THREE.Color) scene.background.copy(day.sky);
    if (scene.fog instanceof THREE.Fog) { scene.fog.color.copy(day.sky); scene.fog.near = day.fogNear; scene.fog.far = day.fogFar; }
    hemi.color.copy(day.hemiSky);
    hemi.groundColor.copy(day.hemiGround);
    hemi.intensity = day.hemiIntensity;
    sun.color.copy(day.sunColor);
    sun.intensity = day.sunIntensity;
    sun.position.copy(day.lightDir).multiplyScalar(100);
    for (const g of city.glow) g.mat.emissiveIntensity = g.day + (g.night - g.day) * day.night;
    city.pools.opacity = day.night * 0.8;
    // Headlights come on when you're behind the wheel after dark.
    beam.intensity = live.mode === 'car' ? day.night * 45 : 0;
    sky.stars.opacity = Math.max(0, day.night - 0.35) * 1.4;
    sky.group.position.copy(camera.position);
    // Sun and moon sit on the light's side of the sky.
    sky.sun.visible = day.sunUp;
    sky.moon.visible = !day.sunUp || day.night > 0.6;
    const ang = ((tmp.minute / 60 - 6) / 12) * Math.PI;
    sky.sun.position.set(Math.cos(ang), Math.sin(ang), 0.35).normalize().multiplyScalar(280);
    sky.moon.position.set(-Math.cos(ang), Math.max(0.12, -Math.sin(ang)), -0.35).normalize().multiplyScalar(280);
    (sky.sun.material as THREE.SpriteMaterial).opacity = Math.min(1, Math.max(0, Math.sin(ang) + 0.15) * 3);

    // ── camera ──────────────────────────────────────────────────────────
    const driving = live.mode === 'car';
    const cockpit = driving && drivePrefs.get().view === 'cockpit' && !live.shoot.on;
    car.group.visible = !cockpit;
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
    if (live.shoot.on) {
      // Director's camera: four angles, three seconds each (see shootcam.ts).
      const sc = shootCam(live.shoot.t, p, portrait);
      camera.position.set(sc.px, sc.py, sc.pz);
      camera.lookAt(sc.lx, sc.ly, sc.lz);
      dist = -1;
    }
    if (cockpit) {
      // Eyes at the windscreen, looking where the car points (drag to glance about).
      const look = live.cam.manualAt > 0 && t - live.cam.manualAt < 1.2 ? live.cam.yaw - (c.heading + Math.PI) : 0;
      const hd = c.heading + look;
      camera.position.set(c.x + Math.sin(c.heading) * 0.25, c.y + 1.22, c.z + Math.cos(c.heading) * 0.25);
      camera.lookAt(camera.position.x + Math.sin(hd) * 10, c.y + 1.0, camera.position.z + Math.cos(hd) * 10);
      dist = -1; tmp.first = false;
    }
    if (dist > 0) {
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
    }
    // Fill light between the camera and you, a little above.
    built.fill.position.lerpVectors(tmp.target, camera.position, 0.35).y += 2.2;
    built.fill.intensity = day.night * (driving ? 2 : 4.5);

    // ── HUD ─────────────────────────────────────────────────────────────
    const speedKmh = driving ? Math.round(Math.abs(c.v) * 3.6) : 0;
    const hudPatch: { mode: typeof live.mode; prompt: string | null; speedKmh?: number } = { mode: live.mode, prompt };
    if (t - tmp.lastHud > 0.1) { hudPatch.speedKmh = speedKmh; tmp.lastHud = t; }
    hudStore.set(hudPatch);
  });

  return <primitive object={built.scene} />;
}
