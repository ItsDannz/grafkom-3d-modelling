import test from 'node:test';
import assert from 'node:assert/strict';
import {createParkObjects} from '../js/park-objects.js';
import {Mat4} from '../js/math.js';
import {createSitePlan} from '../js/site-plan.js';

const flatten=root=>[root,...root.children.flatMap(flatten)];
const point=(m,i)=>m.positions.slice(i*3,i*3+3);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function worlds(root) {
  const result=new Map();
  function visit(n,parent){const world=Mat4.multiply(parent,Mat4.compose(n.position,n.rotation,n.scale));result.set(n,world);for(const child of n.children)visit(child,world);}
  visit(root,Mat4.identity());return result;
}
function weldedEdges(mesh) {
  const key=p=>p.map(v=>Math.round(v*1e6)).join(','),edges=new Map();
  for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3).map(j=>key(point(mesh,j)));for(let j=0;j<3;j++){const pair=[ids[j],ids[(j+1)%3]].sort().join('|');edges.set(pair,(edges.get(pair)||0)+1);}}
  return edges;
}

test('reference objects contain complete finite geometry within the site and a bounded render cost',()=>{
  const {root}=createParkObjects(),nodes=flatten(root),transforms=worlds(root),bounds=createSitePlan().groundBounds,postCount=nodes.filter(n=>n.name==='Bollard berlubang motif daun').length;let triangles=0;
  assert.ok(nodes.length<130+postCount*6,'static bolts, bars and cutouts are batched rather than individual nodes');
  for(const n of nodes){
    assert.equal(new Set(n.children).size,n.children.length,'one owner per child');
    if(!n.mesh)continue;const m=n.mesh,count=m.positions.length/3;
    assert.equal(m.normals.length,m.positions.length,n.name);assert.equal(m.uvs.length,count*2,n.name);assert.equal(m.indices.length%3,0);
    for(const data of [m.positions,m.normals,m.uvs])assert.ok(data.every(Number.isFinite),n.name);
    assert.ok(m.indices.every(i=>Number.isInteger(i)&&i>=0&&i<count),n.name);triangles+=m.indices.length/3;
    for(let i=0;i<count;i++){
      const p=Mat4.transformPoint(transforms.get(n),point(m,i));
      assert.ok(p[0]>bounds.minX&&p[0]<bounds.maxX&&p[1]>=0&&p[1]<9&&p[2]>bounds.minZ&&p[2]<bounds.maxZ,`${n.name}: grounded within site ${p}`);
    }
    for(let i=0;i<m.indices.length;i+=3){
      const [a,b,c]=m.indices.slice(i,i+3).map(j=>point(m,j));
      assert.ok(Math.hypot(...cross(sub(b,a),sub(c,a)))>1e-12,`${n.name}: nondegenerate triangle`);
    }
  }
  assert.ok(triangles<30000+postCount*3500,`triangles across repeated objects: ${triangles}`);
});

test('platforms, supports and roof plates are closed solids with outward-facing surfaces',()=>{
  const nodes=flatten(createParkObjects().root);
  const selected=nodes.filter(n=>['Permainan dua menara beratap merah','Peralatan kebugaran biru dan perak','Rangka dua dek dan jembatan','Stasiun rangka miring dengan pijakan','Perosotan merah dua jalur','Tangga akses permainan'].includes(n.name));
  assert.equal(selected.length,6);
  for(const n of selected){
    const m={positions:[],indices:[]};
    // A roof top and its underside deliberately use different materials;
    // closure is a property of the assembled solid, not one paint batch.
    for(const child of n.children.filter(c=>c.mesh&&(/Landasan|Baja permainan|Rangka tetap miring|Cangkang perosotan|Tangga berpijak datar/.test(c.name)))){const at=m.positions.length/3;m.positions.push(...child.mesh.positions);m.indices.push(...child.mesh.indices.map(i=>i+at));}
    const edges=weldedEdges(m);
    for(const [edge,count] of edges)assert.equal(count%2,0,`${n.name}: uncapped boundary ${edge}`);
    let volume=0;
    for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3).map(j=>point(m,j));volume+=a.reduce((s,v,k)=>s+v*cross(b,c)[k],0)/6;}
    assert.ok(volume>0,`${n.name}: solid normals must point outwards (volume ${volume})`);
  }
});

test('bollard has four perforated side panels and shared geometry, with clear leaf openings',()=>{
  const panels=flatten(createParkObjects().root).filter(n=>n.name==='Empat panel motif daun');
  assert.ok(panels.length>=14&&panels.length<=24);assert.ok(panels.every(n=>n.mesh===panels[0].mesh));
  const m=panels[0].mesh,normals=[];for(let i=0;i<m.normals.length;i+=3)normals.push(m.normals.slice(i,i+3));
  for(const [axis,sign] of [[0,1],[0,-1],[2,1],[2,-1]])assert.ok(normals.some(n=>n[axis]*sign>.99));
  const onFace=(x,y)=>{
    for(let i=0;i<m.indices.length;i+=3){const p=m.indices.slice(i,i+3).map(j=>point(m,j));if(!p.every(v=>Math.abs(v[2]-.135)<1e-8))continue;
      const sides=p.map((a,k)=>{const b=p[(k+1)%3];return (b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);});
      if(sides.every(v=>v>=-1e-10)||sides.every(v=>v<=1e-10))return true;
    }return false;
  };
  assert.equal(onFace(-.085,.31),false,'first front leaf is a real opening');
  assert.equal(onFace(-.164,.31),true,'metal remains around the opening');
});

test('moving pedals inherit upper axle transforms and stay clear of paving and frame',()=>{
  const scene=createParkObjects(),nodes=flatten(scene.root),fixed=nodes.find(n=>n.name==='Rangka tetap miring · blue');
  const fixedBefore=[...worlds(scene.root).get(fixed)];
  scene.update(0);assert.ok(Math.abs(scene.moving[0].pivot.rotation[0])<1e-9);
  scene.update(Math.PI/1.9);assert.ok(scene.moving[0].pivot.rotation[0]>.15);assert.ok(scene.moving[1].pivot.rotation[0]<-.15);
  assert.deepEqual([...worlds(scene.root).get(fixed)],fixedBefore,'frame is stationary while pedals pivot');
  for(let t=0;t<7;t+=.25){scene.update(t);const map=worlds(scene.root);
    for(const {pivot} of scene.moving)for(const n of flatten(pivot).filter(n=>n.mesh)){
      for(let i=0;i<n.mesh.positions.length;i+=3){const p=Mat4.transformPoint(map.get(n),n.mesh.positions.slice(i,i+3));assert.ok(p[1]>.37,`pedal stays above .24m paving: ${p}`);}
    }
  }
  scene.update(2.25);const first=scene.moving.map(p=>p.pivot.rotation[0]);scene.update(2.25);assert.deepEqual(scene.moving.map(p=>p.pivot.rotation[0]),first,'absolute-time update is repeatable when paused');
});
