import test from 'node:test';
import assert from 'node:assert/strict';
import {createInfinitsScene} from '../js/scene.js';
import {Mat4} from '../js/math.js';

const canvasDocument={createElement(){const canvas={};canvas.getContext=()=>({measureText:t=>({width:t.length*58}),fillText(){},getImageData(_x,_y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let y=20;y<90;y++)for(let x=5;x<w-5;x++)if(x%58<40)data[(y*w+x)*4+3]=255;return {data};}});return canvas;}};
const nodes=root=>[root,...root.children.flatMap(nodes)];
test('persistent layout rule keeps every park facility disconnected before relocation',()=>{
  globalThis.document=canvasDocument;
  const {root,structures}=createInfinitsScene(),all=nodes(root);
  assert.deepEqual(structures.routes.map(r=>r.name),['Pendekatan paving depan'],'only the main InfinITS approach remains');
  assert.ok(!all.some(n=>/Jalur menuju|Akses masuk pad|Akses tanah samping dudukan|Ambang masuk dari jalur/.test(n.name)),'no old branch or child threshold connects a facility to the footpath');
});

function scene(){globalThis.document=canvasDocument;const s=createInfinitsScene();s.root.updateWorldMatrix();return s;}
const cross2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function hull(points){
  const p=[...new Map(points.map(p=>[p.map(v=>v.toFixed(6)).join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const chain=a=>{const out=[];for(const q of a){while(out.length>1&&cross2(out.at(-2),out.at(-1),q)<=0)out.pop();out.push(q);}return out.slice(0,-1);};
  return [...chain(p),...chain([...p].reverse())];
}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i][1]>p[1])!==(poly[j][1]>p[1])&&p[0]<(poly[j][0]-poly[i][0])*(p[1]-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0])yes=!yes;return yes;}
const pointSegment=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};
function separation(a,b){
  if(inside(a[0],b)||inside(b[0],a))return 0;
  let gap=Infinity;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    if(cross2(p,q,r)*cross2(p,q,s)<0&&cross2(r,s,p)*cross2(r,s,q)<0)return 0;
    gap=Math.min(gap,pointSegment(p,r,s),pointSegment(q,r,s),pointSegment(r,p,q),pointSegment(s,p,q));
  }return gap;
}
function vertices(node){
  if(node.mesh==='box')return [-.5,.5].flatMap(x=>[-.5,.5].flatMap(y=>[-.5,.5].map(z=>Mat4.transformPoint(node.worldMatrix,[x,y,z]))));
  if(!node.mesh||typeof node.mesh==='string')return [];
  const p=node.mesh.positions,out=[];for(let i=0;i<p.length;i+=3)out.push(Mat4.transformPoint(node.worldMatrix,p.slice(i,i+3)));return out;
}
function roadTriangles(root){
  return nodes(root).filter(n=>['Jalur taman terbuka','Kerb dalam jalur','Kerb luar jalur'].includes(n.name)).flatMap(n=>{
    const m=n.mesh,out=[];
    for(let i=0;i<m.indices.length;i+=3){const ids=m.indices.slice(i,i+3);if(ids.every(j=>m.normals[j*3+1]>.99))out.push(ids.map(j=>{const p=Mat4.transformPoint(n.worldMatrix,m.positions.slice(j*3,j*3+3));return [p[0],p[2]];}));}
    return out;
  });
}

test('all facility children, foundations, steps and hill have a real grass gap from paving and kerbs',t=>{
  const {root}=scene(),all=nodes(root),roads=roadTriangles(root),facilities=[
    'Permainan dua menara beratap merah','Peralatan kebugaran biru dan perak','Area duduk rendah berangka biru–kuning','Tribun atau panggung di tengah kiri','Pos ronda beratap pelana'
  ];
  const footprints=facilities.map(name=>({name,outline:hull(nodes(all.find(n=>n.name===name)).flatMap(vertices).map(p=>[p[0],p[2]]))}));
  for(const {name,outline} of footprints){
    const gap=Math.min(...roads.map(p=>separation(outline,p)));
    assert.ok(gap>.75,`${name}: full child footprint is only ${gap} from the road/kerb`);
    t.diagnostic(`${name}: minimum grass gap ${gap.toFixed(2)} model units`);
  }
  for(let i=0;i<footprints.length;i++)for(let j=i+1;j<footprints.length;j++)assert.ok(separation(footprints[i].outline,footprints[j].outline)>.5,'separate facilities do not overlap after relocation');
});

test('red and blue facilities follow the marked order and the yellow platform stays on flat land closer to water',()=>{
  const {structures:s,inspection}=scene();
  assert.ok(s.fitness.position[2]<s.platform.position[2]-6,'right equipment moves behind the platform');
  assert.ok(s.pavilion.position[2]<s.fitness.position[2]-6&&s.pavilion.position[2]>s.platform.position[2]-25,'security post moves forward from the far rear, behind the equipment');
  assert.ok(s.platform.position[0]<14,'platform moves toward the water');
  for(const [x,,z] of s.platform.footprint)assert.ok(Math.abs(inspection.terrain.heightAt(x,z)-.015)<1e-6,'entire platform foundation remains on flat soil');
});

test('dense path planting uses bounded batches and its actual leaf vertices stay clear of the walking surface',t=>{
  const {root,vegetationMetrics:m}=scene(),all=nodes(root),batches=all.filter(n=>n.name.startsWith('Semak rapat tepi jalan ·'));
  assert.ok(m.pathShrubs>350,'dense planting runs along both sides of the walking route');
  assert.ok(batches.length>0&&batches.length<=16,'static shrubs are batched instead of hundreds of extra scene nodes');
  for(const b of batches)assert.ok(b.mesh.positions.length/3<=40000,'each foliage batch stays within the vertex budget');
  const road=roadTriangles(root).map(p=>({p,minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[1])),maxZ:Math.max(...p.map(v=>v[1]))}));
  let count=0;
  for(const b of batches){const v=vertices(b);for(let i=0;i<v.length;i+=9){const p=[v[i][0],v[i][2]];assert.ok(!road.some(r=>p[0]>=r.minX&&p[0]<=r.maxX&&p[1]>=r.minZ&&p[1]<=r.maxZ&&inside(p,r.p)),'foliage remains beside the paving and kerbs');count++;}}
  assert.ok(count>8000,'inspect actual dense foliage geometry');
  t.diagnostic(`${m.pathShrubs} shrubs in ${batches.length} batches`);
});
