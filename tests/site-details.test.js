import test from 'node:test';
import assert from 'node:assert/strict';
import {createSiteDetails,siteDetailsHierarchy} from '../js/site-details.js';

const all=(root)=>{const nodes=[];const visit=n=>{nodes.push(n);n.children.forEach(visit);};visit(root);return nodes;};
const find=(root,name)=>{const n=all(root).find(n=>n.name===name);assert.ok(n,`missing ${name}`);return n;};

// Weld by geometry, not vertex index: flat-shaded roof faces intentionally have
// separate vertices and normals at the folds.
function orientedEdges(meshes){
  const edges=new Map();
  const key=p=>p.map(v=>Math.round(v*1e6)).join(',');
  let volume=0;
  for(const m of meshes)for(let i=0;i<m.indices.length;i+=3){
    const [a,b,c]=m.indices.slice(i,i+3).map(j=>m.positions.slice(j*3,j*3+3));
    volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    for(const [u,v] of [[a,b],[b,c],[c,a]]){
      const x=key(u),y=key(v),k=x<y?`${x}|${y}`:`${y}|${x}`;
      edges.set(k,(edges.get(k)||0)+(x<y?1:-1));
    }
  }
  return {edges,volume};
}

test('utility roof is a thick closed gable with an actual underside',()=>{
  const root=createSiteDetails();
  const meshes=['Lembaran seng sisi atas','Sisi bawah lembaran atap','Ketebalan lis dan tepi atap'].map(name=>find(root,name).mesh);
  const {edges,volume}=orientedEdges(meshes);
  assert.ok(volume>0,'outward roof surfaces enclose positive volume');
  for(const [edge,balance] of edges)assert.equal(balance,0,`open or reversed roof boundary ${edge}`);
  const under=meshes[1];
  for(let i=1;i<under.normals.length;i+=3)assert.ok(under.normals[i]<0,'soffit faces a camera beneath the roof');
  for(const name of ['Bidang segitiga fasad','Bidang segitiga belakang']){
    const g=orientedEdges([find(root,name).mesh]);
    assert.ok(g.volume>0,`${name} has outward winding`);
    assert.ok([...g.edges.values()].every(v=>v===0),`${name} closes both faces and its perimeter`);
  }
});

test('small entrance steps touch the ground and lead continuously to the terrace',()=>{
  const root=createSiteDetails(),lower=find(root,'Tangga pendek terhubung lantai'),upper=find(root,'Ambang teras depan'),floor=find(root,'Lantai teras menyatu');
  const bottom=n=>n.position[1]-n.scale[1]/2,top=n=>n.position[1]+n.scale[1]/2;
  assert.equal(bottom(lower),0,'first riser stands on local ground');
  assert.ok(Math.abs(bottom(upper)-top(lower))<1e-9,'second riser begins at first tread level');
  assert.ok(Math.abs(top(upper)-top(floor))<1e-9,'upper tread meets terrace height');
  assert.ok(lower.position[2]-lower.scale[2]/2<upper.position[2]+upper.scale[2]/2,'treads overlap in depth');
  assert.ok(upper.position[2]-upper.scale[2]/2<floor.position[2]+floor.scale[2]/2,'upper tread connects the floor slab');
});

test('documented detail stays finite, bounded and affordable for the shared park scene',()=>{
  const root=createSiteDetails(),nodes=all(root);let triangles=0;
  assert.ok(nodes.length<160,'veranda details are batched where practical');
  for(const n of nodes){
    for(const v of [n.position,n.rotation,n.scale])assert.ok(v.every(Number.isFinite));
    if(!n.mesh||typeof n.mesh==='string')continue;
    const m=n.mesh,count=m.positions.length/3;triangles+=m.indices.length/3;
    assert.equal(m.normals.length,m.positions.length);assert.equal(m.uvs.length,count*2);
    assert.ok(m.positions.every(Number.isFinite)&&m.normals.every(Number.isFinite));
    assert.ok(m.indices.every(i=>Number.isInteger(i)&&i>=0&&i<count));
  }
  assert.ok(triangles<20000,'roof and facade detail do not dominate total geometry');
  assert.ok(JSON.stringify(siteDetailsHierarchy).includes('pelana'),'diagram describes the observed gable rather than the superseded hip roof');
  assert.ok(!nodes.some(n=>n.name==='Jendela belakang'),'unrecorded rear window is not invented');
});
