import {createNode} from '../hierarchy.js';

/** Pelataran rendah dan rangka biru–kuning dari foto lokal IMG_164440.
 * Kursi rendah mengikuti bagian papan yang terlihat; tidak diasumsikan ayunan
 * atau hammock karena sambungan gantungnya tidak terbaca pada foto. */
export function createLakesidePlatform({bankZ=-4,bankX=16.7}={}){
  const root=createNode('Area duduk rendah berangka biru–kuning',{position:[bankX,0,bankZ],rotation:[0,-Math.PI/2,0]});
  const mat=(color,texture='none')=>({color,texture,shininess:14,specular:.10});
  const concrete=mat([.60,.58,.52,1],'concrete'),pink=mat([.70,.50,.46,1],'concrete');
  const blue=mat([.10,.48,.66,1],'metal'),yellow=mat([.92,.68,.10,1],'metal'),wood=mat([.51,.40,.28,1],'bark');
  const add=(name,mesh,position,scale,material)=>{const n=createNode(name,{mesh,position,scale,material});root.add(n);return n;};
  const outline=roundedRect(7.8,4.2,.42);
  add('Fondasi pelataran rendah',slab(outline,.015,.17),[0,0,0],[1,1,1],concrete);
  add('Lantai merah muda berambang tipis',slab(outline,.17,.20),[0,0,0],[1,1,1],pink);
  const portal=(span,height,z)=>{
    const r=.25,left=-span/2,right=span/2,points=[[left,.20,z],[left,height-r,z]];
    for(let i=1;i<=7;i++){const a=Math.PI-i/7*Math.PI/2;points.push([left+r+r*Math.cos(a),height-r+r*Math.sin(a),z]);}
    points.push([right-r,height,z]);
    for(let i=1;i<=7;i++){const a=Math.PI/2-i/7*Math.PI/2;points.push([right-r+r*Math.cos(a),height-r+r*Math.sin(a),z]);}
    points.push([right,.20,z]);return points;
  };
  for(const z of [-1.25,1.25])add('Portal biru dengan siku melengkung',tube(portal(6.65,3.30,z),.065),[0,0,0],[1,1,1],blue);
  const center=portal(2.50,3.52,0).map(p=>[0,p[1],p[0]]);
  add('Portal tengah kuning',tube(center,.068),[0,0,0],[1,1,1],yellow);
  for(const x of [-3.325,3.325])for(const z of [-1.25,1.25])add('Pelat jangkar rangka','box',[x,.214,z],[.22,.028,.22],blue);
  for(const z of [-1.25,1.25])add('Pelat jangkar kuning','box',[0,.214,z],[.24,.028,.24],yellow);
  for(const x of [-1.65,1.65]){
    for(const side of [-1,1])add('Tumpuan papan duduk rendah','box',[x+side*1.12,.255,.82],[.14,.11,.44],wood);
    add('Papan duduk rendah dekat air','box',[x,.3325,.82],[2.65,.045,.56],wood);
  }
  const world=p=>[bankX-p[1],0,bankZ+p[0]];
  const footprint=outline.map(world),entry=[bankX+2.1,.20,bankZ],target=[bankX,1.2,bankZ];
  return {root,anchors:{platformEntry:entry,platformTarget:target},measurements:{sourcePhoto:'IMG_20261101_164440.jpg',footprint,floorLevel:.20,entryLevel:.20,frameTop:3.52,framePosts:6,entry,position:[bankX,0,bankZ]},
    hierarchy:{name:root.name,description:'Pelataran rendah di tepi air → lantai merah muda → dua portal biru dan portal tengah kuning → papan duduk rendah. Mengikuti foto 164440, terpisah dari tribun.',children:[]},
    presets:[{id:'platform',label:'Dudukan rendah • foto 164440',yaw:-Math.PI/2+.25,pitch:.15,distance:14,target,fov:48}]};
}
function roundedRect(w,d,r){const p=[];for(const [x,z,a] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])for(let i=0;i<=6;i++){const t=a+i/6*Math.PI/2;p.push([x+Math.cos(t)*r,z+Math.sin(t)*r]);}return p;}
const mesh=()=>({positions:[],normals:[],uvs:[],indices:[]});
function tri(m,a,b,c,n){let u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(cross.reduce((s,x,i)=>s+x*n[i],0)<0)[b,c]=[c,b];const len=Math.hypot(...n),j=m.positions.length/3;for(const p of[a,b,c]){m.positions.push(...p);m.normals.push(...n.map(x=>x/len));m.uvs.push(p[0],Math.abs(n[1])>.5?p[2]:p[1]);}m.indices.push(j,j+1,j+2);}
const quad=(m,a,b,c,d,n)=>{tri(m,a,b,c,n);tri(m,a,c,d,n);};
function slab(p,low,high){const m=mesh();for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];tri(m,[0,high,0],[a[0],high,a[1]],[b[0],high,b[1]],[0,1,0]);tri(m,[0,low,0],[b[0],low,b[1]],[a[0],low,a[1]],[0,-1,0]);const dx=b[0]-a[0],dz=b[1]-a[1];quad(m,[a[0],low,a[1]],[b[0],low,b[1]],[b[0],high,b[1]],[a[0],high,a[1]],[dz,0,-dx]);}return m;}
function tube(points,r){
 const m=mesh(),rings=[],sides=12,unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const initial=unit(points[1].map((x,k)=>x-points[0][k]));let binormal;
 for(let i=2;i<points.length;i++){const n=cross(initial,points[i].map((x,k)=>x-points[0][k]));if(Math.hypot(...n)>1e-5){binormal=unit(n);break;}}
 binormal??=[0,0,1];
 for(let i=0;i<points.length;i++){
   const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],t=unit(b.map((x,k)=>x-a[k])),u=unit(cross(binormal,t));
   rings.push(Array.from({length:sides},(_,j)=>points[i].map((x,k)=>x+r*(u[k]*Math.cos(j/sides*Math.PI*2)+binormal[k]*Math.sin(j/sides*Math.PI*2)))));
 }
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
   const k=(j+1)%sides,a=rings[i][j],b=rings[i][k],c=rings[i+1][k],d=rings[i+1][j],center=points[i].map((x,k)=>(x+points[i+1][k])/2),n=a.map((x,k)=>(x+b[k]+c[k]+d[k])/4-center[k]);quad(m,a,b,c,d,n);
 }
 for(const i of[0,rings.length-1]){const j=i?i-1:1,n=points[i].map((x,k)=>x-points[j][k]);for(let k=0;k<sides;k++)tri(m,points[i],rings[i][k],rings[i][(k+1)%sides],n);}return m;
}
