// Lightweight ambient traffic. Fixed routes keep CPU cost predictable on phones.
import * as THREE from 'three';
import { buildCar, Bin } from './build';
import { ROAD_CENTRES, ROAD_HALF, WORLD } from './layout';

type Unit = { group: THREE.Group; axis: 'x'|'z'; road: number; lane: number; pos: number; speed: number; length: number };
type Signal = { group: THREE.Group; red: THREE.Mesh; yellow: THREE.Mesh; green: THREE.Mesh; axis:'x'|'z'; road:number };

const PAINTS = ['#c0392b','#1f4e79','#f1c40f','#ecf0f1','#34495e','#16a085','#7f8c8d','#d35400'];

function mat(bin: Bin, color: string, glow = false) {
  return bin.add(new THREE.MeshLambertMaterial({ color, emissive: glow ? color : '#000000', emissiveIntensity: glow ? 1.6 : 0 }));
}

function bike(bin: Bin, color: string, motorcycle = false) {
  const g = new THREE.Group();
  const dark = mat(bin, '#15171b');
  const frame = mat(bin, color);
  const wg = bin.add(new THREE.CylinderGeometry(motorcycle ? .30 : .22, motorcycle ? .30 : .22, .08, 10));
  wg.rotateZ(Math.PI/2);
  for (const z of [-.62,.62]) { const w=new THREE.Mesh(wg,dark); w.position.set(0,.28,z); g.add(w); }
  const body = new THREE.Mesh(bin.add(new THREE.BoxGeometry(motorcycle?.38:.14,motorcycle?.32:.12,motorcycle?1:.78)),frame);
  body.position.y = motorcycle?.64:.52; g.add(body);
  if (motorcycle) {
    const rider = new THREE.Mesh(bin.add(new THREE.BoxGeometry(.28,.55,.28)), mat(bin,'#222831'));
    rider.position.set(0,.98,-.08); g.add(rider);
  } else {
    const bar = new THREE.Mesh(bin.add(new THREE.BoxGeometry(.62,.06,.06)),frame);
    bar.position.y=.78; g.add(bar);
  }
  return g;
}

function signal(bin: Bin, x:number, z:number, axis:'x'|'z', road:number): Signal {
  const group=new THREE.Group(); group.position.set(x,0,z);
  const poleMat=mat(bin,'#25282e');
  const pole=new THREE.Mesh(bin.add(new THREE.CylinderGeometry(.08,.11,4.4,6)),poleMat); pole.position.y=2.2; group.add(pole);
  const housing=new THREE.Mesh(bin.add(new THREE.BoxGeometry(.42,1.45,.34)),poleMat);
  housing.position.set(axis==='x'?.42:0,4.0,axis==='z'?.42:0); group.add(housing);
  const red=new THREE.Mesh(bin.add(new THREE.SphereGeometry(.095,8,6)),mat(bin,'#ff3030',true));
  const yellow=new THREE.Mesh(bin.add(new THREE.SphereGeometry(.095,8,6)),mat(bin,'#ffd23f',true));
  const green=new THREE.Mesh(bin.add(new THREE.SphereGeometry(.095,8,6)),mat(bin,'#31e36f',true));
  const base=axis==='x'?new THREE.Vector3(.42,4.35,.02):new THREE.Vector3(.02,4.35,.42);
  red.position.copy(base); yellow.position.copy(base).add(new THREE.Vector3(0,-.31,0)); green.position.copy(base).add(new THREE.Vector3(0,-.62,0));
  group.add(red,yellow,green); return {group,red,yellow,green,axis,road};
}

export interface TrafficSystem { group: THREE.Group; update(dt:number,now:number):void; }

export function buildTraffic(bin: Bin): TrafficSystem {
  const group=new THREE.Group(); const units:Unit[]=[];
  // Cars use actual road centres plus a 3 m lane offset, so they stay on the road.
  const starts=[
    ['x',4, -120, 8.5],['x',-4, 40, 7.2],['x',8, 300, 9.0],['x',-8, 520, 6.8],
    ['z',4, 10, 8.0],['z',-4, 190, 7.0],['z',8, 410, 8.7],['z',-8, 640, 6.5]
  ] as const;
  starts.forEach(([axis,lane,road,pos],i)=>{
    const m=buildCar(PAINTS[i],bin); m.group.scale.setScalar(.9); m.group.position.y=.02;
    m.group.rotation.y=axis==='x'?(pos>0?Math.PI/2:-Math.PI/2):(pos>0?0:Math.PI);
    const roadCentre=ROAD_CENTRES[Math.max(0,Math.min(ROAD_CENTRES.length-1,Math.round(road/60)+2))];
    group.add(m.group); units.push({group:m.group,axis,road:roadCentre,lane,pos,speed, length:4.6});
  });

  const bikes=[['x',4,-60,6.0,false],['z',-4,150,5.4,true],['x',-4,360,5.8,false],['z',4,500,5.2,true]] as const;
  bikes.forEach(([axis,lane,pos,speed,motor],i)=>{
    const g=bike(bin,motor?'#d35400':'#2e86de',motor);
    g.position.y=.02; g.rotation.y=axis==='x'?Math.PI/2:0; group.add(g);
    const roadCentre=ROAD_CENTRES[Math.max(0,Math.min(ROAD_CENTRES.length-1,Math.round((axis==='x'?lane:pos)/60)+2))];
    units.push({group:g,axis,road:roadCentre,lane,pos,speed,length:1.4});
  });

  const signals:Array<Signal>=[];
  for (const road of [-60,120,300,480]) {
    signals.push(signal(bin,road+ROAD_HALF+1,road-ROAD_HALF-1,'x',road));
    signals.push(signal(bin,road-ROAD_HALF-1,road+ROAD_HALF+1,'z',road));
  }
  signals.forEach(s=>group.add(s.group));

  const phaseFor=(axis:'x'|'z',now:number,road:number)=>{
    const p=((now+road*.011)%14+14)%14;
    return axis==='x'?p:p-7;
  };

  return { group, update(dt,now) {
    for(const s of signals){
      const p=((now+s.road*.011)%14+14)%14;
      const red=s.axis==='x'?p>=7:p<7;
      s.red.visible=red; s.yellow.visible=!red && p>6.25 && p<7; s.green.visible=!red&&!s.yellow.visible;
    }
    for(const u of units){
      const p=((now+u.road*.011)%14+14)%14;
      const red=u.axis==='x'?p>=7:p<7;
      let stop=false;
      for(const c of ROAD_CENTRES){
        const d=c-u.pos;
        if(d>0&&d<8){ if(red) stop=true; break; }
      }
      if(!stop) u.pos += u.speed*dt;
      if(u.pos>WORLD.x1+25) u.pos=WORLD.x0-25;
      if(u.pos<WORLD.x0-25) u.pos=WORLD.x1+25;
      if(u.axis==='x'){u.group.position.x=u.pos;u.group.position.z=u.road+u.lane;}
      else {u.group.position.z=u.pos;u.group.position.x=u.road+u.lane;}
    }
  }};
}
