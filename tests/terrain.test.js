import test from 'node:test';
import assert from 'node:assert/strict';
import {createTerrain} from '../js/terrain.js';
import {Mat4} from '../js/math.js';
import {createSitePlan} from '../js/site-plan.js';
import {SITE_LEVELS} from '../js/site-levels.js';

function shore(){return Array.from({length:112},(_,i)=>{const t=i/112*Math.PI*2;return [-4+23*Math.cos(t),-4+10.8*Math.sin(t)*Math.sqrt(.48+.88*Math.abs(Math.cos(t)))];});}
test('soil body is a closed outward solid with a real lake depression',()=>{
  const plan=createSitePlan();
  const variants=[createTerrain(shore()),createTerrain(plan.shore,{...plan.groundBounds,bankRings:[{contour:plan.offset(.85),level:SITE_LEVELS.bankMiddle},{contour:plan.offset(2.1),level:SITE_LEVELS.lawn}]})];
  for(const root of variants){
  const edges=new Map();let volume=0,min=Infinity;
  for(const node of root.children){
    const m=node.mesh;
    assert.ok([...m.positions,...m.normals,...m.uvs].every(Number.isFinite));
    for(let i=0;i<m.indices.length;i+=3){
      const ids=m.indices.slice(i,i+3),p=ids.map(j=>m.positions.slice(j*3,j*3+3));
      min=Math.min(min,...p.map(q=>q[1]));
      const [a,b,c]=p;
      volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
      for(let k=0;k<3;k++){
        const keys=[p[k],p[(k+1)%3]].map(v=>v.map(n=>n.toFixed(5)).join(','));
        const key=keys.sort().join('|');edges.set(key,(edges.get(key)||0)+1);
      }
    }
  }
  assert.ok(volume>5000,'outward faces enclose a positive ground volume');
  assert.equal(min,-1.85);
  assert.deepEqual([...edges].filter(([,count])=>count!==2),[],'every welded edge has two adjoining faces, including underside and basin');
  const basin=root.children.find(n=>n.name.includes('cekungan danau'));
  assert.ok(basin.mesh.positions.some((y,i)=>i%3===1&&y<-1),'lake bed is below water, not a grassy plane');
  }
});

test('orthographic camera keeps scale while mapping frustum bounds correctly',()=>{
  const m=Mat4.orthographic(-8,8,-4,4,.2,200);
  const near=Mat4.transformPoint(m,[-8,-4,-.2]),far=Mat4.transformPoint(m,[8,4,-200]);
  near.forEach((value,i)=>assert.ok(Math.abs(value-[-1,-1,-1][i])<1e-5));
  far.forEach((value,i)=>assert.ok(Math.abs(value-1)<1e-5));
  assert.equal(Mat4.transformPoint(m,[2,1,-2])[0],Mat4.transformPoint(m,[2,1,-120])[0]);
});
