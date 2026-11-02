import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntrance} from '../js/entrance.js';
import {Mat4} from '../js/math.js';

// Only rasterising a font needs a browser. The geometry and walkable layout
// remain inspectable with deterministic silhouette pixels in Node.
const canvasDocument={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({
  measureText:text=>({width:text.length*58}),fillText(){},
  getImageData(_x,_y,width,height){const data=new Uint8ClampedArray(width*height*4);for(let y=18;y<90;y++)for(let x=4;x<width-5;x++)if(x%58<41&&(x%58<10||y<30||y>77))data[(y*width+x)*4+3]=255;return {data};}
});return canvas;}};
function entrance(options){globalThis.document=canvasDocument;return createEntrance(options);}
function descendants(n){return [n,...n.children.flatMap(descendants)];}
function find(root,name){const n=descendants(root).find(n=>n.name===name);assert.ok(n,`missing ${name}`);return n;}
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<2e-6,`${msg}: ${a} != ${b}`);
function bounds(node){
  let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const visit=(n,parent)=>{
    const world=Mat4.multiply(parent,Mat4.compose(n.position,n.rotation,n.scale));
    const positions=n.mesh==='box'?[-.5,-.5,-.5,.5,-.5,-.5,.5,.5,-.5,-.5,.5,-.5,-.5,-.5,.5,.5,-.5,.5,.5,.5,.5,-.5,.5,.5]:typeof n.mesh==='object'&&n.mesh?n.mesh.positions:[];
    for(let i=0;i<positions.length;i+=3){const p=Mat4.transformPoint(world,positions.slice(i,i+3));p.forEach((v,k)=>{min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);});}
    n.children.forEach(c=>visit(c,world));
  };visit(node,Mat4.identity());return {min,max};
}

test('two front risers remain grounded and meet the raised plaza',()=>{
 const {root,measurements}=entrance(),landing=bounds(find(root,'Landing bawah berpaving')),deck=bounds(find(root,'Paving persegi pelataran'));
 const steps=[1,2].map(i=>bounds(find(root,`Anak tangga akses ${i}`)));
 near(landing.max[1],.32,'forecourt');near(deck.max[1],.68,'plaza');
 for(let i=0;i<2;i++){near(steps[i].max[1]-(i?steps[i-1].max[1]:landing.max[1]),.18,'physical riser');near(steps[i].min[1],.015,'foundation reaches ground');}
 near(steps[1].min[2],deck.max[2],'top tread meets plaza');near(steps[0].max[2],landing.min[2],'first tread meets forecourt');
 assert.equal(measurements.accessStair.count,2);
});

test('left and right approaches are exact mirrors with equal widths and level lower landings',()=>{
 const {root,measurements}=entrance(),{left,right}=measurements.ramps;
 assert.equal(left.width,right.width);near(left.length,right.length,'same route length');
 for(let i=0;i<left.centerline.length;i++){const a=left.centerline[i],b=right.centerline[i];near(a[0],-b[0],'mirrored X');near(a[1],b[1],'same Y');near(a[2],b[2],'same Z');}
 for(const r of[left,right]){near(r.upperLandingTop,.68,'top landing');near(r.lowerLandingTop,.115,'lower landing');assert.ok(r.slope<1/12);for(const p of r.lowerLine)near(p[1],.115,'physical bottom section is flat');
 const n=find(root,`Landing bawah ramp ${r.label}`);for(let i=1;i<n.mesh.positions.length;i+=3)assert.ok(n.mesh.positions[i]<=.115+1e-6);}
 const a=bounds(find(root,'Ramp lengkung sisi kiri')),b=bounds(find(root,'Ramp lengkung sisi kanan'));near(a.min[0],-b.max[0],'full structure left boundary');near(a.max[0],-b.min[0],'full structure right boundary');
});

test('the plaza stops at the rear of the sign rather than forming a rear walkway',()=>{
 const {root,measurements,walkways}=entrance(),deck=bounds(find(root,'Paving persegi pelataran'));
 near(deck.min[2],13.49,'actual slab rear');near(deck.min[2],measurements.sign.rearZ,'rear edge matches sign');
 assert.ok(!descendants(root).some(n=>/undakan sisi kiri|jalan sisi kiri/i.test(n.name)),'old stair-and-wing assembly replaced by mirrored ramp');
 const ids=new Set(walkways.map(w=>w.id));for(const w of walkways)for(const id of w.connects)assert.ok(ids.has(id));
});

test('changing elevation grows supported foundations and carries dependent landmarks',()=>{
 const a=entrance(),b=entrance({plazaTop:.72,forecourtTop:.36});
 for(const name of['Huruf InfinITS','Huruf Park','Tutup atas dinding','Tutup undakan podium bawah'])near(bounds(find(b.root,name)).min[1]-bounds(find(a.root,name)).min[1],.04,'dependent elevation');
 near(bounds(find(b.root,'Pelat plaza dengan sisi dan bawah tertutup')).min[1],.015,'foundation stays grounded');
 for(const r of Object.values(b.measurements.ramps)){near(r.centerline[0][1],.72,'upper mouth');near(r.centerline.at(-1)[1],.115,'lower mouth');}
});

test('photo podium remains compact, rounded and separate from the access stairs',()=>{
 const {root}=entrance(),a=bounds(find(root,'Tutup undakan podium bawah')),b=bounds(find(root,'Tutup undakan podium atas'));
 near(b.max[1]-a.max[1],.16,'podium riser');assert.ok(a.max[0]-a.min[0]<7);assert.ok(b.min[0]>a.min[0]&&b.max[0]<a.max[0]);
 assert.ok(new Set(find(root,'Tutup undakan podium bawah').mesh.positions.filter((_,i)=>i%3===0)).size>12);
});

test('wall, podium and both side ramps have closed outward structural meshes',()=>{
 const {root}=entrance();
 const names=['Dinding plint dengan pipi miring','Undakan podium bawah','Undakan podium atas','Badan plakat putih tertutup',...['kanan','kiri'].flatMap(s=>[`Pelat ramp ${s} tertutup`,`Landing bawah ramp ${s}`,`Fondasi ramp ${s} sampai tanah`])];
 for(const name of names){const m=find(root,name).mesh,edges=new Map();let volume=0;
 for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3).map(j=>m.positions.slice(j*3,j*3+3));volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
 for(const [u,v] of[[a,b],[b,c],[c,a]]){const key=[u,v].map(p=>p.map(x=>x.toFixed(6)).join(',')).sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
 assert.ok(volume>0,`${name} outward volume`);assert.ok([...edges.values()].every(n=>n===2),`${name} closed edges`);}
});

test('letter faces retain thickness and the two-ramp structure stays within budget',()=>{
 const {root,measurements}=entrance();assert.ok(measurements.nodeCount<500);
 for(const name of['Huruf InfinITS','Huruf Park']){const n=find(root,name).mesh;assert.ok(n.normals.some((x,i)=>i%3===2&&x===1));assert.ok(n.normals.some((x,i)=>i%3===2&&x===-1));}
});

test('blue perimeter guards frame the plaza and both wider curved approaches meet the promenade width',()=>{
  const {root,measurements}=entrance();
  for(const side of['kiri','kanan']){
    for(const part of[`Railing sisi ${side} belakang`,`Railing sisi ${side} depan`,`Railing tepi tangga dan landing ${side}`])assert.ok(find(root,part).children.some(n=>n.mesh&&n.material.color[2]>.6),'physical blue rails around the platform');
    const ramp=measurements.ramps[side==='kiri'?'left':'right'];
    near(Math.hypot(...ramp.left[0].map((v,k)=>v-ramp.right[0][k])),3.2,'wide plaza mouth');
    near(Math.hypot(...ramp.left.at(-1).map((v,k)=>v-ramp.right.at(-1)[k])),2.22,'lower mouth matches park path');
    for(let i=0;i<ramp.left.length;i++)assert.ok(Math.hypot(ramp.left[i][0]-ramp.right[i][0],ramp.left[i][2]-ramp.right[i][2])>=2.22-1e-6,'curved approach never pinches');
  }
});
