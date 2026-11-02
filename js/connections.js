import {createNode} from '../hierarchy.js';

/** Hanya pendekatan utama InfinITS; fasilitas taman tidak memiliki cabang akses. */
export function createConnections(_loop,{entrance}={}) {
  const root=createNode('Pendekatan utama InfinITS');
  const paving={color:[.66,.64,.58,1],texture:'paving',shininess:4,specular:.025};
  const routes=[],kerbOpenings=[];
  const add=(name,mesh,material=paving)=>root.add(createNode(name,{mesh,material}));
  // The raised forecourt needs a supported approach, rather than a new abrupt
  // edge at the front of the old low paving. The near strip is level; the broad
  // approach then grades down to the surrounding ground without extra stairs.
  const forecourt=entrance?.measurements.forecourtBounds;
  const frontY=entrance?.measurements.accessStair.lowerLandingTop??.12;
  const frontZ=forecourt?.max[2]??24.4,frontWidth=forecourt?forecourt.max[0]-forecourt.min[0]:22.8;
  const approach=[[0,frontZ],[0,frontZ+.55],[0,29.0]],heights=[frontY,frontY,.04];
  add('Pendekatan paving depan mengikuti elevasi landing',strip(approach,frontWidth,heights));
  routes.push({name:'Pendekatan paving depan',centerline:approach.map((p,i)=>[p[0],heights[i],p[1]]),width:frontWidth,levels:heights});
  const hierarchy={name:root.name,description:'Fasilitas taman berdiri terpisah dari jalan. Hanya pendekatan depan dan dua ramp utama InfinITS yang terhubung dengan jalan.',children:[]};
  return {root,routes,hierarchy,kerbOpenings};
}
function strip(points,width,top){
  const m={positions:[],normals:[],uvs:[],indices:[]},left=[],right=[];
  for(let i=0;i<points.length;i++){
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
    const level=Array.isArray(top)?top[i]:top;
    left.push([points[i][0]-dz/length*width/2,level,points[i][1]+dx/length*width/2]);
    right.push([points[i][0]+dz/length*width/2,level,points[i][1]-dx/length*width/2]);
  }
  const down=p=>[p[0],.015,p[2]];
  for(let i=0;i<points.length-1;i++){
    const a=left[i],b=right[i],c=right[i+1],d=left[i+1];
    quad(m,a,b,c,d,[0,1,0]);quad(m,down(a),down(b),down(c),down(d),[0,-1,0]);
    quad(m,down(a),a,d,down(d),[a[0]-b[0],0,a[2]-b[2]]);
    quad(m,b,down(b),down(c),c,[b[0]-a[0],0,b[2]-a[2]]);
  }
  const a=left[0],b=right[0],c=left.at(-1),d=right.at(-1);
  const t0=[points[1][0]-points[0][0],0,points[1][1]-points[0][1]],t1=[points.at(-1)[0]-points.at(-2)[0],0,points.at(-1)[1]-points.at(-2)[1]];
  quad(m,down(a),down(b),b,a,t0.map(x=>-x));quad(m,c,d,down(d),down(c),t1);
  return m;
}
function tri(m,a,b,c,normal){
  let u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);
  let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(n.reduce((sum,x,i)=>sum+x*normal[i],0)<0){[b,c]=[c,b];n=n.map(x=>-x);}
  const length=Math.hypot(...n),start=m.positions.length/3;
  for(const p of [a,b,c]){m.positions.push(...p);m.normals.push(...n.map(x=>x/length));m.uvs.push(p[0]*.8,p[2]*.8);}
  m.indices.push(start,start+1,start+2);
}
function quad(m,a,b,c,d,n){tri(m,a,b,c,n);tri(m,a,c,d,n);}
