import test from 'node:test';
import assert from 'node:assert/strict';
import {createSitePlan} from '../js/site-plan.js';

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const pointSegment=(p,a,b)=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);
};
const crosses=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
const segmentGap=(a,b,c,d)=>crosses(a,b,c,d)?0:Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));

test('the blue guide keeps the existing site with varied clearance around the lake',t=>{
  const p=createSitePlan(),kerb=p.path(2.1),gaps=[];
  for(let i=0;i<kerb.length;i++)if(p.active[i]){
    const gap=Math.min(...p.shore.map((a,j)=>segmentGap(kerb[i],kerb[(i+1)%kerb.length],a,p.shore[(j+1)%p.shore.length])));
    gaps.push(gap);
  }
  gaps.sort((a,b)=>a-b);
  const minimum=gaps[0],median=gaps[Math.floor(gaps.length/2)],maximum=gaps.at(-1);
  assert.ok(minimum>1.9,'road stays clear of the lake and its bank');
  assert.ok(median>6&&median<12,`blue route has a varied landscape gap: ${median}`);
  assert.ok(maximum<20&&maximum>median+4,'wider grassy waists accommodate the detached facilities');
  const b=p.groundBounds;
  assert.ok(b.maxX-b.minX<=100&&b.maxZ-b.minZ<=100,'the site does not expand to the rejected 25 m ring');
  t.diagnostic(`shore to inner kerb: minimum ${minimum.toFixed(2)}, median ${median.toFixed(2)}, maximum ${maximum.toFixed(2)} model units`);
});

test('the blue route is a simple ribbon with two broad mirrored entrance mouths and an elongated pond',()=>{
  const p=createSitePlan(),order=p.openCenterline.map(q=>p.center.findIndex(v=>Math.hypot(v[0]-q[0],v[1]-q[1])<1e-7));
  assert.ok(order.every(i=>i>=0));
  const border=[...order.map(i=>p.inner[i]),...order.toReversed().map(i=>p.outer[i])];
  for(let i=0;i<border.length;i++)for(let j=i+2;j<border.length;j++){
    if(i===0&&j===border.length-1)continue;
    assert.ok(!crosses(border[i],border[(i+1)%border.length],border[j],border[(j+1)%border.length]),`paving edges cross at ${i}/${j}`);
  }
  for(const [point,x] of [[p.openCenterline[0],-24.4],[p.openCenterline.at(-1),24.4]])assert.ok(Math.abs(point[0]-x)<1e-7&&Math.abs(point[1]-7.2)<1e-7);
  const span=k=>Math.max(...p.shore.map(v=>v[k]))-Math.min(...p.shore.map(v=>v[k]));
  assert.ok(Math.abs(span(1)-58)<1e-7&&span(1)/span(0)>1.8,'elongated pond keeps its size');
});
