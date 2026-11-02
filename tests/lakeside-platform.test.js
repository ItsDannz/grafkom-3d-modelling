import test from 'node:test';
import assert from 'node:assert/strict';
import {createLakesidePlatform} from '../js/lakeside-platform.js';
import {Mat4} from '../js/math.js';
const nodes=n=>[n,...n.children.flatMap(nodes)];

test('photo 164440 produces a low pink platform with six blue-yellow frame feet',()=>{
 const {root,measurements}=createLakesidePlatform(),all=nodes(root);
 assert.equal(measurements.sourcePhoto,'IMG_20261101_164440.jpg');
 assert.equal(measurements.floorLevel,.20);assert.equal(measurements.framePosts,6);
 assert.equal(all.filter(n=>n.name==='Portal biru dengan siku melengkung').length,2);
 assert.equal(all.filter(n=>n.name==='Portal tengah kuning').length,1);
 assert.ok(!all.some(n=>/atap|tingkat|ayun|rantai/i.test(n.name)),'unseen roof or suspension is not assumed');
 for(const n of all.filter(n=>/Pelat jangkar/.test(n.name)))assert.ok(Math.abs(n.position[1]-n.scale[1]/2-.20)<1e-6,'anchors rest on the deck');
});

test('platform, portal tubes and slab ends form finite closed outward volumes',()=>{
 const {root}=createLakesidePlatform();let triangles=0;
 for(const n of nodes(root).filter(n=>n.mesh&&typeof n.mesh==='object')){
  const m=n.mesh,edges=new Map();let volume=0;triangles+=m.indices.length/3;
  assert.ok([...m.positions,...m.normals,...m.uvs].every(Number.isFinite));
  for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3).map(j=>m.positions.slice(j*3,j*3+3));volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  for(const [u,v] of[[a,b],[b,c],[c,a]]){const key=[u,v].map(p=>p.map(x=>x.toFixed(6)).join(',')).sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
  assert.ok(volume>0,n.name+' outward');assert.ok([...edges.values()].every(n=>n===2),n.name+' closed');
 }
 assert.ok(triangles<6000);
});

test('published platform footprint and access agree with the actual world orientation',()=>{
 const {root,measurements,anchors}=createLakesidePlatform();root.updateWorldMatrix();
 const floor=nodes(root).find(n=>n.name==='Lantai merah muda berambang tipis');
 const positions=floor.mesh.positions;
 const actual=[];for(let i=0;i<positions.length;i+=3)actual.push(Mat4.transformPoint(floor.worldMatrix,positions.slice(i,i+3)));
 for(const p of measurements.footprint)assert.ok(actual.some(q=>Math.hypot(p[0]-q[0],p[2]-q[2])<1e-5));
 assert.ok(actual.every(p=>p[0]>14&&p[0]<20&&p[2]>-9&&p[2]<1));
 assert.deepEqual(anchors.platformEntry,[18.8,.20,-4]);
});
