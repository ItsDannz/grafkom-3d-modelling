import test from 'node:test';
import assert from 'node:assert/strict';
import {createLakesideSeating,SEATING_DEFAULTS} from '../js/lakeside-seating.js';

const shore=Array.from({length:112},(_,i)=>{const t=i/112*Math.PI*2;return [-4+23*Math.cos(t),-4+10.8*Math.sin(t)*Math.sqrt(.48+.88*Math.abs(Math.cos(t)))];});
const nodes=root=>[root,...root.children.flatMap(nodes)];
const p=(m,i)=>m.positions.slice(i*3,i*3+3),sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function topContains(node,x,z){
  const m=node.mesh;
  for(let i=0;i<m.indices.length;i+=3){const ids=m.indices.slice(i,i+3);if(ids.some(j=>m.normals[j*3+1]<.99))continue;
    const a=p(m,ids[0]),b=p(m,ids[1]),c=p(m,ids[2]),det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
    if(Math.abs(det)<1e-9)continue;
    const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det;
    if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)return true;
  }return false;
}

test('all seating strips, wedge walls, steps and caps are finite closed outward solids',()=>{
  const scene=createLakesideSeating({shore}),list=nodes(scene.root);let triangles=0;
  assert.ok(list.length<32,'seating is batched per physical part rather than per face');
  for(const n of list.filter(n=>n.mesh)){
    const m=n.mesh,count=m.positions.length/3,edges=new Map(),key=i=>p(m,i).map(v=>Math.round(v*1e6)).join(',');let volume=0;
    assert.equal(m.normals.length,m.positions.length,n.name);assert.equal(m.uvs.length,count*2,n.name);
    for(const data of [m.positions,m.normals,m.uvs])assert.ok(data.every(Number.isFinite),n.name);
    for(let i=0;i<m.indices.length;i+=3){
      const ids=m.indices.slice(i,i+3);assert.ok(ids.every(j=>Number.isInteger(j)&&j>=0&&j<count));
      const [a,b,c]=ids.map(j=>p(m,j)),normal=cross(sub(b,a),sub(c,a));
      assert.ok(Math.hypot(...normal)>1e-10,n.name);
      assert.ok(normal.reduce((sum,v,k)=>sum+v*m.normals[ids[0]*3+k],0)>0,`${n.name}: winding`);
      volume+=a.reduce((sum,v,k)=>sum+v*cross(b,c)[k],0)/6;
      for(let j=0;j<3;j++){const pair=[key(ids[j]),key(ids[(j+1)%3])].sort().join('|');edges.set(pair,(edges.get(pair)||0)+1);}
    }
    for(const [edge,hits] of edges)assert.equal(hits%2,0,`${n.name}: open edge ${edge}`);
    assert.ok(volume>1e-4,`${n.name}: outward volume`);triangles+=m.indices.length/3;
  }
  assert.ok(triangles<10000,'moderate mesh density');
});

test('two access steps reach every seat row without a vertical jump or floating tread',()=>{
  const {measurements:m}=createLakesideSeating({shore});
  assert.equal(m.steps.length,m.tierCount*2);assert.ok(m.aisleWidth>=1.2);
  assert.ok(m.stairRiser>=.14&&m.stairRiser<=.22,'human-scaled steps');assert.ok(m.stairTread>=.28,'room for a whole foot');
  for(let i=0;i<m.steps.length;i++){
    const prev=i?m.steps[i-1].level:m.frontLevel;
    assert.ok(Math.abs(m.steps[i].level-prev-m.stairRiser)<1e-9);
    if(i)assert.ok(Math.abs(m.steps[i].frontOffset-m.steps[i-1].backOffset)<1e-9);
  }
  for(let i=0;i<m.seatRows.length;i++){
    const row=m.seatRows[i];assert.ok(Math.abs(row.level-m.steps[i*2+1].level)<1e-9);
    assert.ok(row.seatHeight>=.36&&row.seatHeight<=.46,'plausible concrete seat height');
  }
  assert.ok(Math.abs(m.steps.at(-1).level-m.upperLevel)<1e-9);
});

test('center aisle is open through both halves of every seating tier',()=>{
  const scene=createLakesideSeating({shore}),list=nodes(scene.root),steps=list.filter(n=>n.name.startsWith('Anak tangga akses'));
  const seats=list.filter(n=>n.name.startsWith('Ambang duduk'));
  for(const step of steps){
    const m=step.mesh,top=[];for(let i=0;i<m.positions.length;i+=3)if(m.normals[i+1]>.99)top.push(m.positions.slice(i,i+3));
    const center=top.reduce((s,p)=>s.map((v,k)=>v+p[k]/top.length),[0,0,0]);
    assert.ok(topContains(step,center[0],center[2]),'access sample lies on its tread');
    assert.ok(seats.every(n=>!topContains(n,center[0],center[2])),'seat mass does not block the central passage');
  }
});

test('placement is configurable along the real shore and publishes an explicit exclusion footprint',()=>{
  const a=createLakesideSeating({shore}),b=createLakesideSeating({shore,frontOffset:4.75});
  assert.equal(a.measurements.frontOffset,SEATING_DEFAULTS.frontOffset);assert.equal(b.measurements.frontOffset,4.75);
  assert.equal(a.measurements.footprint.length,50);assert.ok(a.measurements.arcLength>8);
  assert.ok(Math.hypot(...a.anchors.seatingFront.map((v,k)=>v-b.anchors.seatingFront[k]))>3.5,'offset changes placement instead of metadata only');
  for(const {mesh} of nodes(a.root).filter(n=>n.mesh))for(let i=0;i<mesh.positions.length;i+=3){
    assert.ok(mesh.positions[i]>=a.measurements.bounds.min[0]-.03&&mesh.positions[i]<=a.measurements.bounds.max[0]+.03);
    assert.ok(mesh.positions[i+2]>=a.measurements.bounds.min[2]-.03&&mesh.positions[i+2]<=a.measurements.bounds.max[2]+.03);
  }
  assert.ok(a.presets.length>=2&&a.presets.every(p=>p.target.every(Number.isFinite)));
});

test('ground-level side access goes around wedge ends and the high landing has a solid rear closure',()=>{
  const scene=createLakesideSeating({shore}),list=nodes(scene.root),m=scene.measurements;
  assert.equal(m.sideAccess.length,2);assert.ok(m.sideAccess.every(r=>r.width>=1&&r.level===m.frontLevel));
  const walls=list.filter(n=>n.name.startsWith('Dinding baji'));
  for(const route of m.sideAccess){
    const path=list.find(n=>n.name===`Akses tanah samping dudukan indeks ${route.index}`);
    assert.ok(topContains(path,route.front[0],route.front[2]));assert.ok(topContains(path,route.outer[0],route.outer[2]));
    const samples=12;
    for(let i=0;i<=samples;i++){
      const p=route.front.map((v,k)=>v+(route.outer[k]-v)*i/samples);
      assert.ok(walls.every(w=>!topContains(w,p[0],p[2])),'access does not cross an end wall');
    }
  }
  const back=list.find(n=>n.name==='Dinding penutup belakang tanpa bukaan');
  assert.ok(back,'a closed rear upstand prevents treating the high landing as a ground exit');
  assert.ok(m.rearBarrierHeight>0,'rear closure rises above the last seat');
  assert.ok(Math.abs(Math.max(...back.mesh.positions.filter((_,i)=>i%3===1))-m.upperLevel-m.rearBarrierHeight)<1e-6,'the solid rear upstand reaches its configured coping height');
});

test('optional grassy hill is a closed sloping solid attached to the actual rear wall, without side access',()=>{
  const {root,measurements:m}=createLakesideSeating({shore,sideAccessEnabled:false,hillDepth:4.2}),all=nodes(root);
  assert.equal(m.sideAccess.length,0);assert.ok(!all.some(n=>n.name.startsWith('Akses tanah samping')));
  const hill=all.find(n=>n.name==='Bukit rumput menempel belakang tribun').mesh,wall=all.find(n=>n.name==='Dinding penutup belakang tanpa bukaan').mesh;
  const vertices=[];for(let i=0;i<wall.positions.length;i+=3)vertices.push(wall.positions.slice(i,i+3));
  assert.ok(m.backHill.attachmentLine.length>20);
  for(const q of m.backHill.attachmentLine){
    assert.ok(topContains({mesh:{...wall,normals:wall.normals.map((v,i)=>i%3===1?1:v)}},q[0],q[2]),'buried hill front lies within the actual concrete back footprint');
    assert.ok(Math.abs(q[1]-m.upperLevel)<1e-8,'hill attachment meets the concrete landing height');
    assert.ok(!vertices.some(v=>Math.hypot(...q.map((x,k)=>x-v[k]))<1e-6),'soil is buried inside the back wall rather than sharing its exposed face');
  }
  const edges=new Map();let volume=0;
  for(let i=0;i<hill.indices.length;i+=3){const points=hill.indices.slice(i,i+3).map(j=>p(hill,j)),[a,b,c]=points;volume+=a.reduce((s,v,k)=>s+v*cross(b,c)[k],0)/6;
    for(let k=0;k<3;k++){const key=[points[k],points[(k+1)%3]].map(v=>v.map(x=>x.toFixed(6)).join(',')).sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
  assert.ok(volume>1);assert.ok([...edges.values()].every(n=>n===2),'hill has top, ground underside and closed perimeter');
  const sides=all.filter(n=>n.name.startsWith('Dinding beton samping bukit '));assert.equal(sides.length,2,'both ends of the grassy hill have concrete retaining walls');
  for(const {mesh:m} of sides){
    const edges=new Map();let volume=0;
    for(let i=0;i<m.indices.length;i+=3){const points=m.indices.slice(i,i+3).map(j=>p(m,j)),[a,b,c]=points;volume+=a.reduce((s,v,k)=>s+v*cross(b,c)[k],0)/6;
      for(let k=0;k<3;k++){const key=[points[k],points[(k+1)%3]].map(v=>v.map(x=>x.toFixed(6)).join(',')).sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
    assert.ok(volume>0);assert.ok([...edges.values()].every(n=>n===2),'retaining wall has capped ends and a solid underside');
    const ys=m.positions.filter((_,i)=>i%3===1);assert.ok(Math.max(...ys)>1.5);assert.ok(Math.min(...ys)<=.015);
  }
  const heights=hill.positions.filter((_,i)=>i%3===1);assert.ok(Math.max(...heights)>1.3&&Math.min(...heights)<=.015,'hill descends from seat height to the lawn');
});


test('grass side faces are buried behind concrete and retaining caps follow the slope without coplanar patches',()=>{
  const {root}=createLakesideSeating({shore,sideAccessEnabled:false,hillDepth:4.2}),all=nodes(root);
  const triangles=m=>{const out=[];for(let i=0;i<m.indices.length;i+=3){const ids=m.indices.slice(i,i+3),q=ids.map(j=>p(m,j)),n=cross(sub(q[1],q[0]),sub(q[2],q[0])),l=Math.hypot(...n);if(Math.abs(n[1])/l<.05)out.push({p:q,n:n.map(v=>v/l)});}return out;};
  const grass=triangles(all.find(n=>n.name==='Bukit rumput menempel belakang tribun').mesh);
  const concrete=all.filter(n=>n.name.startsWith('Dinding beton samping bukit ')||n.name==='Dinding penutup belakang tanpa bukaan');
  for(const node of concrete)for(const a of triangles(node.mesh))for(const b of grass){
    const coplanar=b.p.every(q=>Math.abs(sub(q,a.p[0]).reduce((sum,v,k)=>sum+v*a.n[k],0))<1e-6);
    assert.equal(coplanar,false,'exposed vertical concrete must not share a plane with the grass side');
  }
  for(const n of concrete.filter(n=>n.name.startsWith('Dinding beton samping bukit '))){
    const heights=new Set(n.mesh.positions.filter((_,i)=>i%3===1).map(y=>y.toFixed(5)));
    assert.ok(heights.size>12,'retaining wall is sampled along the curved hill profile');
  }
});
