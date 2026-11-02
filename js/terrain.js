import {createNode} from '../hierarchy.js';
import {SITE_LEVELS as L} from './site-levels.js';

/** Solid tanah tertutup dengan cekungan danau, bukan bidang rumput di bawah air. */
export function createTerrain(shore,{minX=-44,maxX=44,minZ=-32,maxZ=32,bankRings=[]}={}) {
  const root=createNode('Lanskap & tanah');
  const boxX=(minX+maxX)/2,boxZ=(minZ+maxZ)/2,halfX=(maxX-minX)/2,halfZ=(maxZ-minZ)/2;
  const center=shore.reduce((a,p)=>[a[0]+p[0]/shore.length,a[1]+p[1]/shore.length],[0,0]);
  const outer=shore.map(p=>{
    const v=[p[0]-center[0],p[1]-center[1]],length=Math.hypot(...v),direction=v.map(x=>x/length);
    let low=0,high=Math.max(maxX-minX,maxZ-minZ)*2;
    for(let n=0;n<40;n++){
      const distance=(low+high)/2,x=center[0]+direction[0]*distance,z=center[1]+direction[1]*distance;
      const qx=Math.abs(x-boxX)-(halfX-6),qz=Math.abs(z-boxZ)-(halfZ-6);
      const sdf=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-6;
      if(sdf<=0)low=distance;else high=distance;
    }
    return [center[0]+direction[0]*low,center[1]+direction[1]*low];
  });
  const core=shore.map(p=>[center[0]+(p[0]-center[0])*.78,center[1]+(p[1]-center[1])*.78]);
  const add=(name,mesh,color,texture)=>root.add(createNode(name,{mesh,material:{color,texture,shininess:3,specular:0}}));
  const land=empty(),bank=empty(),basin=empty(),walls=empty(),bottom=empty();
  const rings=[{contour:shore,level:L.shore},...bankRings],crest=rings.at(-1).contour;
  const crestLevel=bankRings.length?rings.at(-1).level:L.shore;
  for(let i=0;i<shore.length;i++) {
    const j=(i+1)%shore.length,a=shore[i],b=shore[j],c=outer[j],d=outer[i],ci=core[i],cj=core[j];
    const ca=crest[i],cb=crest[j];
    quad(land,[ca[0],crestLevel,ca[1]],[cb[0],crestLevel,cb[1]],[c[0],L.lawn,c[1]],[d[0],L.lawn,d[1]],[0,1,0]);
    for(let r=1;r<rings.length;r++){
      const lo=rings[r-1],hi=rings[r],p=lo.contour[i],q=lo.contour[j],s=hi.contour[j],t=hi.contour[i];
      quad(bank,[p[0],lo.level,p[1]],[q[0],lo.level,q[1]],[s[0],hi.level,s[1]],[t[0],hi.level,t[1]],[0,1,0]);
    }
    quad(basin,[ci[0],L.bed,ci[1]],[cj[0],L.bed,cj[1]],[b[0],L.shore,b[1]],[a[0],L.shore,a[1]],[0,1,0]);
    tri(basin,[center[0],L.bed,center[1]],[ci[0],L.bed,ci[1]],[cj[0],L.bed,cj[1]],[0,1,0]);
    const dx=c[0]-d[0],dz=c[1]-d[1];
    quad(walls,[d[0],L.bottom,d[1]],[c[0],L.bottom,c[1]],[c[0],L.lawn,c[1]],[d[0],L.lawn,d[1]],[dz,0,-dx]);
    tri(bottom,[center[0],L.bottom,center[1]],[d[0],L.bottom,d[1]],[c[0],L.bottom,c[1]],[0,-1,0]);
  }
  add('Tanah taman dengan lubang cekungan',land,[.43,.48,.29,1],'grass');
  if(bankRings.length)add('Lereng rumput turun menuju air',bank,[.38,.45,.26,1],'grass');
  add('Dasar dan lereng cekungan danau',basin,[.35,.29,.21,1],'soil');
  add('Dinding lapisan tanah tertutup',walls,[.31,.29,.23,1],'soil');
  add('Sisi bawah tanah tertutup',bottom,[.25,.24,.20,1],'soil');
  // Sample the same triangles used for rendering, so shoreline planting does
  // not float when the grassy bank descends below the walkway.
  root.heightAt=(x,z)=>{
    for(const m of [bank,land,basin])for(let i=0;i<m.indices.length;i+=3){
      const [a,b,c]=m.indices.slice(i,i+3).map(j=>m.positions.slice(j*3,j*3+3));
      const det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
      if(Math.abs(det)<1e-10)continue;
      const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det;
      if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)return u*a[1]+v*b[1]+(1-u-v)*c[1];
    }
    return L.lawn;
  };
  return root;
}
function empty(){return {positions:[],normals:[],uvs:[],indices:[]};}
function tri(m,a,b,c,wanted){
  let u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);
  let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(n.reduce((s,x,i)=>s+x*wanted[i],0)<0){[b,c]=[c,b];n=n.map(x=>-x);}
  const length=Math.hypot(...n),start=m.positions.length/3;
  for(const p of [a,b,c]){m.positions.push(...p);m.normals.push(...n.map(x=>x/length));m.uvs.push(p[0]*.6,p[2]*.6);}
  m.indices.push(start,start+1,start+2);
}
function quad(m,a,b,c,d,n){tri(m,a,b,c,n);tri(m,a,c,d,n);}
