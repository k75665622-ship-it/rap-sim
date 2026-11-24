// Lightweight ambient air + harbour traffic.
// These are background vehicles, not gameplay physics: a few animated meshes
// make the port and airport feel alive without adding a physics engine.

import * as THREE from 'three';
import { Bin } from './build';

function mat(bin: Bin, color: string, glow = false) {
  return bin.add(new THREE.MeshLambertMaterial({
    color,
    emissive: glow ? color : '#000000',
    emissiveIntensity: glow ? 1.5 : 0,
  }));
}

function boat(bin: Bin, color: string, cargo = false): THREE.Group {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(bin.add(new THREE.BoxGeometry(cargo ? 10 : 4.2, cargo ? 1.2 : 0.7, cargo ? 3 : 1.8)), mat(bin, color));
  hull.position.y = 0.7;
  g.add(hull);

  const deck = new THREE.Mesh(bin.add(new THREE.BoxGeometry(cargo ? 7 : 2.4, 0.35, cargo ? 2.4 : 1.3)), mat(bin, cargo ? '#d9dde3' : '#f1f1f1'));
  deck.position.y = 1.35;
  g.add(deck);

  if (cargo) {
    for (let i = 0; i < 3; i++) {
      const container = new THREE.Mesh(bin.add(new THREE.BoxGeometry(1.9, 1.0, 2.1)), mat(bin, ['#c0392b', '#2d6a9f', '#e6a23c'][i]));
      container.position.set(-2 + i * 2, 2.0, 0);
      g.add(container);
    }
    const bridge = new THREE.Mesh(bin.add(new THREE.BoxGeometry(2.2, 2.1, 2.2)), mat(bin, '#eef1f5'));
    bridge.position.set(3.0, 2.2, 0);
    g.add(bridge);
  } else {
    const cabin = new THREE.Mesh(bin.add(new THREE.BoxGeometry(1.4, 1.0, 1.1)), mat(bin, '#eef1f5'));
    cabin.position.y = 1.75;
    g.add(cabin);
  }

  const wake = new THREE.Mesh(
    bin.add(new THREE.ConeGeometry(cargo ? 1.2 : 0.6, cargo ? 4.5 : 2.2, 6, 1, true)),
    bin.add(new THREE.MeshBasicMaterial({ color: '#dcefff', transparent: true, opacity: 0.22 })),
  );
  wake.rotation.z = Math.PI / 2;
  wake.position.set(cargo ? -5 : -2.4, 0.25, 0);
  g.add(wake);
  return g;
}

function plane(bin: Bin, cargo = false): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(bin.add(new THREE.CylinderGeometry(cargo ? 0.48 : 0.32, cargo ? 0.55 : 0.36, cargo ? 5.6 : 4.0, 8)), mat(bin, cargo ? '#cfd5dc' : '#f2f4f7'));
  body.rotation.z = Math.PI / 2;
  g.add(body);

  const wing = new THREE.Mesh(bin.add(new THREE.BoxGeometry(2.2, 0.12, cargo ? 5.0 : 4.0)), mat(bin, cargo ? '#8b96a4' : '#d7dbe2'));
  wing.position.y = 0.02;
  g.add(wing);
  const tail = new THREE.Mesh(bin.add(new THREE.BoxGeometry(0.8, 1.0, 0.12)), mat(bin, '#9aa4b2'));
  tail.position.x = cargo ? -2.2 : -1.6;
  g.add(tail);

  const nav = new THREE.Mesh(bin.add(new THREE.SphereGeometry(0.09, 6, 5)), mat(bin, '#ff304f', true));
  nav.position.set(0, 0.1, 1.9);
  g.add(nav);
  return g;
}

type BoatUnit = { group: THREE.Group; x: number; z: number; speed: number; phase: number; cargo: boolean };
type AirUnit = { group: THREE.Group; angle: number; radius: number; speed: number; y: number; cargo: boolean };

export interface TransportSystem {
  group: THREE.Group;
  update(dt: number, now: number, night: number): void;
}

export function buildTransport(bin: Bin): TransportSystem {
  const group = new THREE.Group();
  const boats: BoatUnit[] = [];
  const aircraft: AirUnit[] = [];

  // Harbour water is kept to the southern edge of the harbour district so it
  // does not cover the existing road grid. The moving boats stay inside it.
  const water = new THREE.Mesh(
    bin.add(new THREE.PlaneGeometry(280, 90)),
    bin.add(new THREE.MeshLambertMaterial({ color: '#286b82', transparent: true, opacity: 0.78 })),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(300, 0.04, 790);
  group.add(water);

  const waterLine = new THREE.Mesh(
    bin.add(new THREE.PlaneGeometry(280, 1.2)),
    bin.add(new THREE.MeshBasicMaterial({ color: '#8ed8e8', transparent: true, opacity: 0.32 })),
  );
  waterLine.rotation.x = -Math.PI / 2;
  waterLine.position.set(300, 0.055, 746);
  group.add(waterLine);

  const boatStarts: Array<[number, number, number, boolean]> = [
    [205, 775, 3.8, false],
    [330, 800, -2.8, true],
    [410, 765, 2.6, false],
  ];
  boatStarts.forEach(([x, z, speed, cargo]) => {
    const g = boat(bin, cargo ? '#596773' : '#e5eef3', cargo);
    group.add(g);
    boats.push({ group: g, x, z, speed, phase: x * 0.02, cargo });
  });

  // Aircraft circle over the airport district (roughly x/z 450–750).
  const airStarts: Array<[number, number, number, number, boolean]> = [
    [0.2, 105, 10, 55, false],
    [3.5, 135, -7, 72, true],
  ];
  airStarts.forEach(([angle, radius, speed, y, cargo]) => {
    const g = plane(bin, cargo);
    group.add(g);
    aircraft.push({ group: g, angle, radius, speed, y, cargo });
  });

  return {
    group,
    update(dt, now, night) {
      const day = 1 - night;
      water.visible = true;

      for (const b of boats) {
        b.x += b.speed * dt;
        if (b.x > 438) b.x = 165;
        if (b.x < 162) b.x = 438;
        b.group.position.set(b.x, 0, b.z + Math.sin(now * 0.8 + b.phase) * 0.18);
        b.group.rotation.y = b.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      for (const a of aircraft) {
        a.angle += a.speed * dt * 0.004;
        const x = 600 + Math.cos(a.angle) * a.radius;
        const z = 600 + Math.sin(a.angle) * a.radius;
        a.group.position.set(x, a.y + 4.0, z);
        a.group.rotation.y = -a.angle + Math.PI / 2;
        a.group.rotation.z = 0.04;
        const nav = a.group.children.find((c) => c.geometry instanceof THREE.SphereGeometry) as THREE.Mesh | undefined;
        if (nav) (nav.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.7 + night * 2.2 + Math.sin(now * 7) * 0.4;
      }

      // At night the harbour and airport remain active, but background water is
      // slightly dimmer rather than disappearing.
      (water.material as THREE.MeshLambertMaterial).emissive.set('#07151c');
      (water.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.05 + night * 0.15;
      (water.material as THREE.MeshLambertMaterial).opacity = 0.72 + day * 0.08;
    },
  };
}
