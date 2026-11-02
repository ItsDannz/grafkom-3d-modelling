import test from 'node:test';
import assert from 'node:assert/strict';
import { Mat4 } from '../js/math.js';
import { createInfinitsScene } from '../js/scene.js';

// The scene uses Canvas only to turn a font into extruded mesh. This small text
// raster adapter lets Node validate the graph and geometry without a browser.
// Actual typography and visual composition are verified in the browser separately.
const canvasDocument={
  createElement(tag){
    assert.equal(tag,'canvas');
    const canvas={width:0,height:0};
    canvas.getContext=()=>({
      measureText(text){return {width:text.length*58};},
      fillText(){},
      getImageData(_x,_y,width,height){
        const data=new Uint8ClampedArray(width*height*4);
        for(let y=18;y<90;y++)for(let x=4;x<width-5;x++){
          // Repeated separated glyph-like shapes exercise exposed side faces.
          if(x%58<41&&(x%58<10||y<30||y>77))data[(y*width+x)*4+3]=255;
        }
        return {data};
      }
    });
    return canvas;
  }
};
function scene(){globalThis.document=canvasDocument;return createInfinitsScene();}
function nodes(root){const result=[];const walk=n=>{result.push(n);n.children.forEach(walk);};walk(root);return result;}
function find(root,name){return nodes(root).find(n=>n.name===name);}
function worldMatrices(root){
  const map=new Map();
  function walk(node,parent){const world=Mat4.multiply(parent,Mat4.compose(node.position,node.rotation,node.scale));map.set(node,world);node.children.forEach(child=>walk(child,world));}
  walk(root,Mat4.identity());return map;
}
function origin(world,node){return Mat4.transformPoint(world.get(node),[0,0,0]);}
function near(a,b,tolerance=1e-6){return Math.hypot(...a.map((v,i)=>v-b[i]))<tolerance;}

test('scene graph has a single owner for each node, valid transforms, and bounded complexity',()=>{
  const {root}=scene(),seen=new Set();
  function walk(node,ancestors){
    assert.ok(!ancestors.has(node),`cycle at ${node.name}`);
    assert.ok(!seen.has(node),`node has more than one parent: ${node.name}`);seen.add(node);
    for(const vector of [node.position,node.rotation,node.scale])assert.ok(vector.length===3&&vector.every(Number.isFinite),`${node.name}: finite transform`);
    assert.ok(node.scale.every(s=>s>0),`${node.name}: invertible scale`);
    const next=new Set(ancestors);next.add(node);node.children.forEach(child=>walk(child,next));
  }
  walk(root,new Set());
  assert.ok(seen.size>300,'scene should include the actual park objects');
  assert.ok(seen.size<2200,'scene must remain practical for WebGL without excessive nodes');
});

test('custom meshes have finite complete attributes and valid in-bounds triangle indices',()=>{
  const {root,structures}=scene(),world=worldMatrices(root),bounds=structures.groundBounds;let customCount=0;
  for(const node of nodes(root)){
    if(!node.mesh||typeof node.mesh==='string')continue;
    customCount++;
    const m=node.mesh,n=m.positions.length/3;
    assert.ok(Number.isInteger(n)&&n>2,`${node.name}: vertices`);
    assert.equal(m.normals.length,m.positions.length,`${node.name}: normals`);
    assert.equal(m.uvs.length,n*2,`${node.name}: UVs`);
    assert.equal(m.indices.length%3,0,`${node.name}: triangle list`);
    for(const values of [m.positions,m.normals,m.uvs])assert.ok(values.every(Number.isFinite),`${node.name}: finite mesh data`);
    for(const index of m.indices)assert.ok(Number.isInteger(index)&&index>=0&&index<n,`${node.name}: index ${index}`);
    for(let i=0;i<m.indices.length;i+=3){
      const ids=m.indices.slice(i,i+3),[a,b,c]=ids.map(j=>m.positions.slice(j*3,j*3+3));
      const u=b.map((v,k)=>v-a[k]),v=c.map((w,k)=>w-a[k]);
      const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const declared=m.normals.slice(ids[0]*3,ids[0]*3+3);
      assert.ok(normal.reduce((sum,value,k)=>sum+value*declared[k],0)>=-1e-7,`${node.name}: winding must face its declared normal`);
    }
    for(let i=0;i<m.positions.length;i+=3){
      const p=Mat4.transformPoint(world.get(node),m.positions.slice(i,i+3));
      assert.ok(p[0]>=bounds.minX-.01&&p[0]<=bounds.maxX+.01&&p[1]>-2&&p[1]<18&&p[2]>=bounds.minZ-.01&&p[2]<=bounds.maxZ+.01,`${node.name}: vertex within bounded park ${p}`);
    }
  }
  assert.ok(customCount>=10,'water, shoreline, paving, ramp, lettering and planting use actual custom geometry');
});

test('the landmark has correctly wound front faces facing the entrance camera',()=>{
  const {root,presets}=scene();
  const entrance=presets.find(p=>p.id==='entrance');
  assert.ok(entrance&&Math.cos(entrance.yaw)>0,'entrance preset approaches the +Z letter fronts');
  for(const name of ['Huruf InfinITS','Huruf Park']){
    const m=find(root,name).mesh;let frontTriangles=0,sideVertices=0;
    for(let i=0;i<m.normals.length;i+=3)if(Math.abs(m.normals[i])+Math.abs(m.normals[i+1])>0)sideVertices++;
    for(let i=0;i<m.indices.length;i+=3){
      const ids=m.indices.slice(i,i+3);
      if(ids.every(j=>m.normals[j*3+2]>.99)){
        const [a,b,c]=ids.map(j=>m.positions.slice(j*3,j*3+3));
        const crossZ=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
        assert.ok(crossZ>0,`${name}: front triangle survives CCW back-face culling`);frontTriangles++;
      }
    }
    assert.ok(frontTriangles>0&&sideVertices>0,`${name}: lit extruded lettering, not a flat unlit label`);
  }
});

test('branch animation carries descendant leaves while the trunk stays in place',()=>{
  const {root,update}=scene();
  const branch=find(root,'Cabang utama'),leaf=find(branch,'Rumpun daun'),trunk=find(root,'Batang utama');
  assert.ok(branch&&leaf&&trunk,'actual branch → twig → canopy hierarchy');
  update(0,{windStrength:1});const before=worldMatrices(root),leafBefore=origin(before,leaf),trunkBefore=origin(before,trunk);
  update(2.1,{windStrength:1});const after=worldMatrices(root);
  assert.ok(!near(leafBefore,origin(after,leaf),.001),'parent movement changes leaf world position');
  assert.ok(near(trunkBefore,origin(after,trunk)),'branch movement does not move its parent trunk');
  const summary=JSON.stringify(scene().hierarchy);
  assert.ok(summary.includes('Cabang utama')&&summary.includes('Ranting')&&summary.includes('Daun kanopi'),'documented hierarchy matches the working scene');
});

test('animation is deterministic and zero wind restores stable branch transforms',()=>{
  const {root,update}=scene(),all=nodes(root),branches=all.filter(n=>n.name==='Cabang utama');
  const snapshot=()=>all.map(n=>[...n.position,...n.rotation,...n.scale]);
  update(3.25,{windStrength:1});const expected=snapshot();
  update(19,{windStrength:2});update(3.25,{windStrength:1});assert.deepEqual(snapshot(),expected,'update sets absolute state rather than accumulating transforms');
  update(0,{windStrength:0});const still=branches.map(n=>n.rotation.slice());
  update(100,{windStrength:0});assert.deepEqual(branches.map(n=>n.rotation),still,'zero wind stops every branch regardless of time');
  const water=find(root,'Air danau'),waterMesh=water.mesh,waterTransform=[...water.position,...water.rotation,...water.scale];
  update(120,{windStrength:0,waterStrength:0});
  assert.deepEqual([...water.position,...water.rotation,...water.scale],waterTransform,'water remains a stable surface for the renderer wave shader');
  assert.equal(water.mesh,waterMesh,'scene does not mutate shared water vertices while animating');
  assert.equal(water.material.water,true,'water animation is delegated to the explicitly flagged shader material');
});
