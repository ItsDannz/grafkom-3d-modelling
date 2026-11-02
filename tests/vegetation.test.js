import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createVegetation} from '../js/vegetation.js';
import {createPrimitives} from '../js/geometry.js';
import {Mat4} from '../js/math.js';

// A pond-sized fixture exercises shore planting without requiring Canvas or a
// browser. The integrated scene test separately checks the park's actual shore.
const shore=Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2;return [-4+23*Math.cos(a),-4+10*Math.sin(a)];});
const vegetation=()=>createVegetation({shore});
const list=root=>{const result=[];const walk=n=>{result.push(n);n.children.forEach(walk);};walk(root);return result;};
const transformSnapshot=root=>list(root).map(n=>({name:n.name,position:[...n.position],rotation:[...n.rotation],scale:[...n.scale]}));
const pointAt=(node,p=[0,0,0])=>Mat4.transformPoint(node.worldMatrix,p);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('vegetation contains the distinct planted layers documented around the pond',()=>{
  const {root,hierarchy}=vegetation(),nodes=list(root),names=nodes.map(n=>n.name);
  assert.ok(nodes.length<2200,'planting remains a practical scene graph');
  assert.ok(names.filter(n=>/Pohon peneduh/.test(n)).length>=14,'a mature tree belt surrounds the pond');
  assert.ok(names.some(n=>/Cabang utama/.test(n))&&names.some(n=>/Ranting/.test(n)),'visible branches and twigs support canopy foliage');
  assert.ok(names.some(n=>/Daun kanopi|Rumpun daun/.test(n)),'canopy has real leaf geometry');
  assert.ok(names.some(n=>/palem/i.test(n)),'feather palms are represented');
  assert.ok(names.some(n=>/kuning|pita/i.test(n)),'yellow strap-leaf beds are represented');
  assert.ok(names.some(n=>/merah|pucuk/i.test(n)),'reddish low border planting is represented');
  assert.ok(names.some(n=>/tepian|tepi air|rumput air|pesisir/i.test(n)),'shoreline has its own planting layer');
  assert.ok(JSON.stringify(hierarchy).includes('Cabang utama'),'public diagram describes the working hierarchy');
});

test('plant meshes have finite attributes, usable faces, valid indices and bounded GPU cost',()=>{
  const {root}=vegetation(),primitives=createPrimitives();root.updateWorldMatrix();
  let triangles=0,customMeshes=0,checkedVertices=0;
  const checked=new Set();
  for(const node of list(root)){
    assert.ok([node.position,node.rotation,node.scale].every(v=>v.length===3&&v.every(Number.isFinite)),`${node.name}: finite transform`);
    assert.ok(node.scale.every(v=>v>0),`${node.name}: non-singular transform`);
    if(!node.mesh)continue;
    const m=typeof node.mesh==='string'?primitives[node.mesh]:node.mesh;
    assert.ok(m,`${node.name}: supported mesh`);
    triangles+=m.indices.length/3;
    const n=m.positions.length/3;
    assert.ok(n>=3&&Number.isInteger(n),`${node.name}: complete vertices`);
    assert.equal(m.normals.length,m.positions.length,`${node.name}: normals`);
    assert.equal(m.uvs.length,n*2,`${node.name}: UVs`);
    for(let i=0;i<m.positions.length;i+=3){
      const p=pointAt(node,m.positions.slice(i,i+3));
      assert.ok(p.every(Number.isFinite)&&Math.abs(p[0])<48&&Math.abs(p[2])<33&&p[1]>-2&&p[1]<18,`${node.name}: in-bounds world vertex ${p}`);
      checkedVertices++;
    }
    if(checked.has(m))continue;
    checked.add(m);
    assert.equal(m.indices.length%3,0,`${node.name}: triangle list`);
    for(const a of [m.positions,m.normals,m.uvs])assert.ok(a.every(Number.isFinite),`${node.name}: finite attributes`);
    for(const index of m.indices)assert.ok(Number.isInteger(index)&&index>=0&&index<n,`${node.name}: valid index ${index}`);
    const isCustom=typeof node.mesh!=='string';
    if(isCustom)customMeshes++;
    let usefulFaces=0;
    for(let i=0;i<m.indices.length;i+=3){
      const ids=m.indices.slice(i,i+3),[a,b,c]=ids.map(index=>m.positions.slice(index*3,index*3+3));
      const u=b.map((v,k)=>v-a[k]),v=c.map((w,k)=>w-a[k]);
      const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],area=Math.hypot(...cross);
      if(area<1e-12){assert.ok(!isCustom,`${node.name}: degenerate face ${i/3}`);continue;}
      const average=[0,1,2].map(k=>ids.reduce((sum,id)=>sum+m.normals[id*3+k],0));
      assert.ok(cross.reduce((sum,val,k)=>sum+val*average[k],0)>0,`${node.name}: face ${i/3} agrees with declared normals`);
      usefulFaces++;
    }
    assert.ok(usefulFaces>0,`${node.name}: useful triangles`);
  }
  assert.ok(customMeshes>=8,'plant types use dedicated leaf/frond/grass geometry');
  assert.ok(checkedVertices>10000,'tree silhouettes have adequate geometric detail');
  assert.ok(triangles<450000,`${triangles} triangles should fit the vegetation budget`);
});

test('the seeded landscape reconstructs identical geometry and placements each time',()=>{
  function fingerprint(root){
    const hash=createHash('sha256');
    for(const n of list(root)){
      hash.update(JSON.stringify([n.name,n.position,n.rotation,n.scale,n.material]));
      if(typeof n.mesh==='string')hash.update(n.mesh);
      else if(n.mesh)for(const key of ['positions','normals','uvs','indices'])hash.update(JSON.stringify(Array.from(n.mesh[key])));
    }
    return hash.digest('hex');
  }
  assert.equal(fingerprint(vegetation().root),fingerprint(vegetation().root));
});

test('wind moves leaf descendants through branch pivots while their parent trunks stay fixed',()=>{
  const {root,update}=vegetation(),nodes=list(root);
  const branch=nodes.find(n=>/Cabang utama/.test(n.name));
  assert.ok(branch,'the canopy has an actual branch pivot');
  const descendant=list(branch).find(n=>n!==branch&&n.mesh&&/daun|leaf|tajuk|kanopi/i.test(n.name));
  assert.ok(descendant,'leaf geometry is a branch descendant');
  const trunk=nodes.find(n=>/Batang utama/.test(n.name));assert.ok(trunk,'stable trunk geometry');
  update(0,{windStrength:1});root.updateWorldMatrix();
  // A non-origin vertex detects inherited rotation even when the leaf's own
  // local origin happens to lie exactly on the branch pivot.
  const leafBefore=pointAt(descendant,[.27,.19,.13]),trunkBefore=pointAt(trunk),rotationBefore=[...branch.rotation];
  update(2,{windStrength:1});root.updateWorldMatrix();
  assert.ok(distance(rotationBefore,branch.rotation)>1e-4,'a local branch rotation responds to wind');
  assert.ok(distance(leafBefore,pointAt(descendant,[.27,.19,.13]))>1e-3,'leaf world position follows branch motion');
  assert.ok(distance(trunkBefore,pointAt(trunk))<1e-7,'wind never displaces parent trunk');
  update(0,{windStrength:0});const calm=transformSnapshot(root);
  update(8,{windStrength:0});assert.deepEqual(transformSnapshot(root),calm,'zero wind remains stable at different times');
});
