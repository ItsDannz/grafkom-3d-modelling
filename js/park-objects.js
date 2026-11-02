import {createNode} from '../hierarchy.js';
import {createSitePlan} from './site-plan.js?v=blue-route-final-20261102';

/** Perabot dan permainan yang dibaca dari foto 164002, 164000, 164515 dan
 * 164623. Bentuk/warna yang terlihat dipertahankan; ukuran serta pengikat di
 * sisi tertutup direkonstruksi sebagai sambungan mekanis yang masuk akal. */
const TAU=Math.PI*2;
const vadd=(a,b)=>a.map((x,i)=>x+b[i]),vsub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(a,s)=>a.map(x=>x*s),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>mul(a,1/(Math.hypot(...a)||1));
const fresh=()=>({positions:[],normals:[],uvs:[],indices:[]});

// Mesh builders bake static components by material. Hundreds of welds, caps,
// balusters and bolts therefore do not require hundreds of renderer nodes.
function tri(m,a,b,c) {
  const n=unit(cross(vsub(b,a),vsub(c,a))),at=m.positions.length/3;
  for(const p of [a,b,c]){m.positions.push(...p);m.normals.push(...n);m.uvs.push(p[0],p[2]+p[1]);}
  m.indices.push(at,at+1,at+2);
}
function quad(m,a,b,c,d){tri(m,a,b,c);tri(m,a,c,d);}
function box(m,c,s) {
  const p=([-1,1]).flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[c[0]+x*s[0]/2,c[1]+y*s[1]/2,c[2]+z*s[2]/2])));
  for(const ids of [[1,5,7,3],[4,0,2,6],[0,1,3,2],[5,4,6,7],[2,3,7,6],[0,4,5,1]])quad(m,...ids.map(i=>p[i]));
}
function tube(m,points,r=.045,sides=10) {
  const rings=points.map((p,i)=>{
    const tangent=unit(vsub(points[Math.min(i+1,points.length-1)],points[Math.max(i-1,0)]));
    const u=unit(cross(tangent,Math.abs(tangent[1])<.9?[0,1,0]:[0,0,1])),v=cross(tangent,u);
    return Array.from({length:sides},(_,j)=>vadd(p,vadd(mul(u,Math.cos(j/sides*TAU)*r),mul(v,Math.sin(j/sides*TAU)*r))));
  });
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){const k=(j+1)%sides;quad(m,rings[i][j],rings[i][k],rings[i+1][k],rings[i+1][j]);}
  for(let j=0;j<sides;j++){const k=(j+1)%sides;tri(m,points[0],rings[0][k],rings[0][j]);tri(m,points.at(-1),rings.at(-1)[j],rings.at(-1)[k]);}
}
const pipe=(m,a,b,r=.045,n=10)=>tube(m,[a,b],r,n);
function roundedRect(w,d,r,steps=5) {
  const p=[];
  for(const [x,z,t] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]])
    for(let i=0;i<=steps;i++)p.push([x+r*Math.cos(t+i/steps*Math.PI/2),z+r*Math.sin(t+i/steps*Math.PI/2)]);
  return p;
}
function roundedPolygon(points,trim){
  return points.flatMap((p,i)=>{
    const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];
    const la=Math.hypot(a[0]-p[0],a[1]-p[1]),lb=Math.hypot(b[0]-p[0],b[1]-p[1]);
    const r=Math.min(trim,la*.3,lb*.3),start=p.map((x,k)=>x+(a[k]-x)*r/la),end=p.map((x,k)=>x+(b[k]-x)*r/lb);
    return Array.from({length:7},(_,j)=>{const t=j/6,u=1-t;return p.map((x,k)=>u*u*start[k]+2*u*t*x+t*t*end[k]);});
  });
}
function slab(m,outline,low,high) {
  const center=outline.reduce((s,p)=>[s[0]+p[0]/outline.length,s[1]+p[1]/outline.length],[0,0]);
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length];
    tri(m,[center[0],high,center[1]],[b[0],high,b[1]],[a[0],high,a[1]]);
    tri(m,[center[0],low,center[1]],[a[0],low,a[1]],[b[0],low,b[1]]);
    quad(m,[a[0],low,a[1]],[a[0],high,a[1]],[b[0],high,b[1]],[b[0],low,b[1]]);
  }
}
const mats={
  blue:{color:[.035,.30,.54,1],texture:'metal',shininess:44,specular:.3},
  yellow:{color:[.88,.69,.09,1],texture:'metal',shininess:38,specular:.25},
  silver:{color:[.57,.62,.61,1],texture:'metal',shininess:62,specular:.46},
  dark:{color:[.20,.22,.21,1],texture:'metal',shininess:24,specular:.18},
  red:{color:[.63,.22,.25,1],texture:'metal',shininess:27,specular:.24},
  roofDark:{color:[.34,.12,.15,1],texture:'metal',shininess:18,specular:.12},
  concrete:{color:[.67,.68,.63,1],texture:'concrete',shininess:5,specular:.04},
  paving:{color:[.65,.60,.55,1],texture:'paving',uvScale:[1,1],shininess:5,specular:.03},
  glass:{color:[.58,.61,.52,1],texture:'none',shininess:18,specular:.1},
  cream:{color:[.71,.70,.61,1],texture:'concrete',shininess:5,specular:.03},
  stone:{color:[.39,.44,.45,1],texture:'concrete',shininess:6,specular:.06},
};
const group=(parent,name,position=[0,0,0],rotation=[0,0,0])=>{const n=createNode(name,{position,rotation});parent.add(n);return n;};
function batch(parent,name,key,geometry){if(!geometry.indices.length)return null;const n=createNode(name,{mesh:geometry,material:mats[key]});parent.add(n);return n;}
function painter(parent,name) {
  const geometry={};return {
    get:key=>geometry[key]??=(fresh()),
    finish(){for(const [key,m] of Object.entries(geometry))batch(parent,`${name} · ${key}`,key,m);}
  };
}
function flange(p,c,r=.13) {
  pipe(p.get('dark'),[c[0],c[1],c[2]],[c[0],c[1]+.035,c[2]],r,12);
  for(const [x,z] of [[-.07,-.07],[.07,-.07],[.07,.07],[-.07,.07]])pipe(p.get('silver'),[c[0]+x,c[1]+.035,c[2]+z],[c[0]+x,c[1]+.065,c[2]+z],.018,6);
}

/** A two-deck playground, as visible in IMG_20261101_164002. The two red
 * chutes are curved closed shells, with a real underside and terminal legs. */
function playground(parent,anchor,yaw=-.25) {
  const root=group(parent,'Permainan dua menara beratap merah',anchor,[0,yaw,0]);
  const pad=painter(root,'Landasan permainan');
  const outline=roundedPolygon([[-4.3,-5.2],[4.3,-5.2],[5.2,-3.8],[1.0,6.1],[-1.0,6.1],[-5.2,-3.8]],.38);
  slab(pad.get('concrete'),outline,.015,.17);
  slab(pad.get('paving'),outline.map(([x,z])=>[x*.90,.45+(z-.45)*.92]),.17,.24);pad.finish();
  const structure=group(root,'Rangka dua dek dan jembatan');const p=painter(structure,'Baja permainan');
  const decks=[{x:0,z:0,y:2.12,w:2.20,d:1.8,roof:4.12},{x:0,z:-3.1,y:1.72,w:1.95,d:1.7,roof:3.53}];
  for(const deck of decks){
    const {x,z,y,w,d,roof}=deck;
    for(const px of [-w/2,w/2])for(const pz of [-d/2,d/2]){
      pipe(p.get('blue'),[x+px,.24,z+pz],[x+px,roof,z+pz],.055,12);
      pipe(p.get('yellow'),[x+px,.65,z+pz],[x+px,1.33,z+pz],.058,10);
      flange(p,[x+px,.24,z+pz]);
    }
    box(p.get('blue'),[x,y-.06,z],[w+.10,.16,d+.08]);
    box(p.get('dark'),[x,y+.03,z],[w-.1,.035,d-.1]);
    for(const side of [-1,1]){
      const xx=x+side*w/2;
      // The access stair must open into the rear deck, not terminate at a
      // continuous guardrail. Only this measured-width bay is left open.
      const sections=z<0&&side<0?[[z-d/2,z-.44],[z+.44,z+d/2]]:[[z-d/2,z+d/2]];
      for(const [za,zb] of sections){
        for(const zz of [za,zb])pipe(p.get('yellow'),[xx,y+.08,zz],[xx,y+1.08,zz],.037);
        for(const h of [.11,1.08])pipe(p.get('yellow'),[xx,y+h,za],[xx,y+h,zb],h===1.08?.04:.034);
        const count=Math.max(1,Math.floor((zb-za)/.24));
        for(let k=1;k<count;k++){const zz=za+(zb-za)*k/count;pipe(p.get('yellow'),[xx,y+.11,zz],[xx,y+1.08,zz],.025,8);}
      }
    }
    if(z<0){
      // The far rear edge is closed; stairs enter from the left side.
      for(const h of [.11,1.08])pipe(p.get('yellow'),[-w/2,y+h,z-d/2],[w/2,y+h,z-d/2],.035);
      for(let j=1;j<8;j++){const xx=-w/2+w*j/8;pipe(p.get('yellow'),[xx,y+.11,z-d/2],[xx,y+1.08,z-d/2],.025,8);}
    }
    // Close the small ledges beside the narrower bridge while leaving its
    // central passage clear. The front edge of the high deck opens to slides.
    const bridgeZ=z<0?z+d/2:z-d/2;
    for(const side of [-1,1]){
      const xa=side*.66,xb=side*w/2;
      for(const h of [.11,1.05])pipe(p.get('yellow'),[xa,y+h,bridgeZ],[xb,y+h,bridgeZ],.033,8);
      pipe(p.get('yellow'),[xa,y+.11,bridgeZ],[xa,y+1.05,bridgeZ],.028,8);
    }
    // Roof plates have thickness, closed eaves, and dark underside. They are
    // gables, not the hip roofs used elsewhere in the park.
    const rw=w*.64,rd=d*.65,ridge=roof+.36;
    for(const side of [-1,1]){
      const a=[x, ridge,z-rd],b=[x+side*rw,roof,z-rd],c=[x+side*rw,roof,z+rd],d1=[x,ridge,z+rd];
      const lo=q=>[q[0],q[1]-.065,q[2]],m=p.get('red');
      if(side===1){quad(m,a,d1,c,b);quad(p.get('roofDark'),lo(a),lo(b),lo(c),lo(d1));}
      else {quad(m,a,b,c,d1);quad(p.get('roofDark'),lo(a),lo(d1),lo(c),lo(b));}
      for(const [q,r] of [[a,b],[b,c],[c,d1],[d1,a]])quad(m,q,lo(q),lo(r),r);
    }
    for(const zz of [z-rd,z+rd]){
      pipe(p.get('blue'),[x-rw,roof-.10,zz],[x+rw,roof-.10,zz],.032,8);
      pipe(p.get('blue'),[x-rw,roof-.10,zz],[x,ridge-.10,zz],.027,8);
      pipe(p.get('blue'),[x,ridge-.10,zz],[x+rw,roof-.10,zz],.027,8);
    }
    pipe(p.get('blue'),[x,ridge-.10,z-rd],[x,ridge-.10,z+rd],.032,8);
  }
  // The bridge joins the rear deck to the high front deck without floating.
  const bridgeLow=-2.25,bridgeHigh=-.9;
  for(const side of [-1,1]){
    const x=side*.66;
    pipe(p.get('yellow'),[x,1.8,bridgeLow],[x,2.12,bridgeHigh],.045);
    pipe(p.get('yellow'),[x,2.7,bridgeLow],[x,3.02,bridgeHigh],.04);
    for(let j=0;j<=7;j++){const t=j/7,z=bridgeLow+(bridgeHigh-bridgeLow)*t,y=1.8+.32*t;pipe(p.get('yellow'),[x,y,z],[x,y+.9,z],.026,8);}
  }
  for(let j=0;j<9;j++){const t=(j+.5)/9,z=bridgeLow+(bridgeHigh-bridgeLow)*t,y=1.8+.32*t;box(p.get('blue'),[0,y-.03,z],[1.37,.09,.17]);}
  // Diagonal struts carry both elevated platforms and are legible underneath.
  for(const x of [-1.04,1.04]){pipe(p.get('blue'),[x,.3,-.85],[x,1.95,.85],.035);pipe(p.get('blue'),[x,.3,.85],[x,1.95,-.85],.035);}
  p.finish();
  // Rear access stair, with horizontal treads and two continuous round rails.
  const stair=group(root,'Tangga akses permainan');const st=painter(stair,'Tangga berpijak datar');
  const sx=-1.9,sz=-3.1,run=1.85,rise=1.48,steps=7;
  for(const dz of [-.40,.40]){
    pipe(st.get('blue'),[sx-run,.29,sz+dz],[sx+.95,1.70,sz+dz],.046);
    tube(st.get('yellow'),[[sx-run,.28,sz+dz],[sx-run,1.15,sz+dz],[sx+.95,2.58,sz+dz],[sx+1.0,2.58,sz+dz]],.034);
  }
  for(let i=0;i<steps;i++){
    const x=sx-run+(i+.5)*(run+1.0)/steps,y=.24+(i+1)*rise/steps;
    box(st.get('blue'),[x,y-.035,sz],[.40,.07,.78]);
  }
  st.finish();
  // Parametric double slide: flat first lip, steep middle, long low run-out.
  const slide=group(root,'Perosotan merah dua jalur');const s=painter(slide,'Cangkang perosotan');
  const profile=[];
  for(let i=0;i<=28;i++){
    const t=i/28,z=.86+t*3.65,y=.33+1.80*(1-(t*t*(3-2*t)));
    profile.push([z,y]);
  }
  for(const cx of [-.48,.48]){
    const w=.83,th=.05;
    for(let i=0;i<profile.length-1;i++){
      const [za,ya]=profile[i],[zb,yb]=profile[i+1];
      quad(s.get('red'),[cx-w/2,ya,za],[cx-w/2,yb,zb],[cx+w/2,yb,zb],[cx+w/2,ya,za]);
      quad(s.get('roofDark'),[cx-w/2,ya-th,za],[cx+w/2,ya-th,za],[cx+w/2,yb-th,zb],[cx-w/2,yb-th,zb]);
      for(const side of [-1,1]){
        const x=cx+side*w/2,lip=.14;
        // Close the chute skin under the raised rolled rim as well. Each
        // metal component remains closed even before the rim is welded on.
        const skin=[[x,ya-th,za],[x,yb-th,zb],[x,yb,zb],[x,ya,za]];
        quad(s.get('roofDark'),...(side>0?skin:[skin[0],skin[3],skin[2],skin[1]]));
        // A closed box-section edge follows the curve; no single-sided rims.
        const a=[x-.028,ya-th,za],b=[x+.028,ya-th,za],c=[x+.028,yb-th,zb],d=[x-.028,yb-th,zb];
        quad(s.get('red'),a,d,[d[0],yb+lip,zb],[a[0],ya+lip,za]);
        quad(s.get('red'),b,[b[0],ya+lip,za],[c[0],yb+lip,zb],c);
        quad(s.get('red'),[a[0],ya+lip,za],[d[0],yb+lip,zb],[c[0],yb+lip,zb],[b[0],ya+lip,za]);
        quad(s.get('roofDark'),a,b,c,d);
      }
    }
    for(const j of [0,profile.length-1]){
      const [z,y]=profile[j],m=s.get('red');
      const floor=[[cx-w/2,y-th,z],[cx+w/2,y-th,z],[cx+w/2,y,z],[cx-w/2,y,z]];
      quad(m,...(j===0?[floor[0],floor[3],floor[2],floor[1]]:floor));
      for(const side of [-1,1]){
        const x=cx+side*w/2,caps=[[x-.028,y-th,z],[x-.028,y+.14,z],[x+.028,y+.14,z],[x+.028,y-th,z]];
        quad(m,...(j===0?caps:[caps[0],caps[3],caps[2],caps[1]]));
      }
    }
  }
  for(const z of [2.6,4.15])for(const x of [-.78,.78]){
    const y=profile.reduce((best,p)=>Math.abs(p[0]-z)<Math.abs(best[0]-z)?p:best)[1]-.04;
    pipe(s.get('roofDark'),[x,.24,z],[x,y,z],.031,8);flange(s,[x,.24,z],.085);
  }
  s.finish();
  const footprint=outline.map(([x,z])=>[anchor[0]+Math.cos(yaw)*x+Math.sin(yaw)*z,anchor[1],anchor[2]-Math.sin(yaw)*x+Math.cos(yaw)*z]);
  return {root,measurements:{position:[...anchor],yaw,footprint,padOutline:outline,padShape:'rounded-truncated-triangle',floorLevel:.24,slideDirection:[Math.sin(yaw),0,Math.cos(yaw)]}};
}

function fitness(parent,anchor,yaw=.18) {
  const root=group(parent,'Peralatan kebugaran biru dan perak',anchor,[0,yaw,0]);const moving=[];
  const pad=painter(root,'Landasan kebugaran');slab(pad.get('concrete'),roundedRect(9.1,7.2,.95),.015,.17);slab(pad.get('paving'),roundedRect(8.0,6.1,.65),.17,.24);pad.finish();
  const blue='blue',steel='silver';
  // Foreground station: central blue column, silver top handle frame, two
  // gray body-contact plates. The unseen hydraulic linkage is kept simple.
  const upright=group(root,'Stasiun tiang tinggi dan bantalan',[-2.55,.24,.9]);const p=painter(upright,'Kolom dan pegangan tetap');
  pipe(p.get(blue),[0,.035,0],[0,2.75,0],.070,12);flange(p,[0,0,0],.19);
  tube(p.get(steel),[[-.66,2.58,.12],[-.66,2.65,-.18],[.66,2.65,-.18],[.66,2.58,.12]],.035);
  tube(p.get(steel),[[-.63,2.45,.11],[-.63,2.38,.33],[.63,2.38,.33],[.63,2.45,.11]],.032);
  pipe(p.get(blue),[0,2.70,0],[0,2.86,0],.085,12);
  for(const y of [1.50,.62]){
    pipe(p.get(steel),[0,y,0],[0,y,.18],.045,10);
    // A rounded plate is preferable to a guessed yellow foot platform.
    const poly=roundedRect(.47,.52,.17,5).map(q=>[q[0],q[1]]),m=p.get('silver');
    // Rounded slab XY rotated from an XZ plate into vertical position.
    const plate=fresh();slab(plate,poly,-.035,.035);
    for(let i=0;i<plate.positions.length;i+=3){const [x,h,z]=plate.positions.slice(i,i+3);plate.positions.splice(i,3,x,y+z,.18+h);const [nx,ny,nz]=plate.normals.slice(i,i+3);plate.normals.splice(i,3,nx,nz,ny);}
    // The mapping reverses orientation: swap triangle winding as well.
    for(let i=0;i<plate.indices.length;i+=3)[plate.indices[i+1],plate.indices[i+2]]=[plate.indices[i+2],plate.indices[i+1]];
    const off=m.positions.length/3;for(const k of ['positions','normals','uvs'])m[k].push(...plate[k]);m.indices.push(...plate.indices.map(k=>k+off));
  }
  pipe(p.get(steel),[-.4,.40,.05],[.4,.40,.05],.033);p.finish();
  // Rear-left machine has a tall U-shaped handle assembly and low gray seat.
  const seated=group(root,'Stasiun duduk dengan pegangan tinggi',[-2.3,.24,-1.8]);const q=painter(seated,'Rangka stasiun duduk');
  pipe(q.get(blue),[0,0,0],[0,2.35,0],.075,12);flange(q,[0,0,0],.19);
  tube(q.get(steel),[[-.58,1.48,.36],[-.58,2.27,.12],[.58,2.27,.12],[.58,1.48,.36]],.035);
  pipe(q.get(blue),[0,.13,0],[0,.52,.75],.055);box(q.get('silver'),[0,.60,.66],[.55,.09,.46]);
  pipe(q.get(blue),[0,.05,0],[-.55,.03,.75],.05);pipe(q.get(blue),[0,.05,0],[.55,.03,.75],.05);
  for(const x of [-.55,.55])flange(q,[x,0,.75],.10);q.finish();
  // Middle station is visibly a pair of sloping blue frames. Pivots sit at
  // the upper axle, above both pedals; illustrative motion stays in that bay.
  const walker=group(root,'Stasiun rangka miring dengan pijakan',[.25,.24,.15]);const w=painter(walker,'Rangka tetap miring');
  for(const x of [-.68,.68]){
    pipe(w.get(blue),[x,.04,.90],[x,1.95,-.28],.070,12);
    pipe(w.get(blue),[x,.04,-.9],[x,1.95,-.28],.070,12);
    for(const z of [-.9,.9])flange(w,[x,0,z],.14);
  }
  pipe(w.get('silver'),[-.82,1.83,-.25],[.82,1.83,-.25],.065,12);
  for(const x of [-.68,.68])tube(w.get('blue'),[[x,1.90,-.28],[x,2.05,-.28],[x,2.05,-.59]],.045);
  w.finish();
  for(const [i,x] of [-.36,.36].entries()){
    const pivot=group(walker,'Poros pijakan kebugaran',[x,1.83,-.25]);const b=painter(pivot,'Lengan dan pijakan');
    pipe(b.get('silver'),[0,0,0],[0,-1.27,.0],.042);box(b.get('silver'),[0,-1.29,.17],[.36,.07,.56]);
    pipe(b.get('dark'),[-.07,0,0],[.07,0,0],.09,12);b.finish();moving.push({pivot,phase:i*Math.PI});
  }
  const press=group(root,'Stasiun duduk sisi kanan',[2.65,.24,-.20]);const r=painter(press,'Rangka mesin duduk kanan');
  pipe(r.get(blue),[0,.04,-.47],[0,2.22,-.47],.078,12);flange(r,[0,0,-.47],.17);
  pipe(r.get(blue),[0,.12,-.47],[0,.58,.60],.065);box(r.get('silver'),[0,.63,.49],[.56,.10,.52]);box(r.get('silver'),[0,1.10,-.20],[.48,.66,.09]);
  for(const x of [-.54,.54]){
    pipe(r.get('silver'),[x,1.98,-.47],[x,1.30,.34],.039);
    pipe(r.get('dark'),[x,1.30,.34],[x,1.30,.62],.048);
    pipe(r.get(blue),[0,.15,-.47],[x,.04,.60],.048);flange(r,[x,0,.60],.10);
  }
  r.finish();
  const footprint=roundedRect(9.1,7.2,.95).map(([x,z])=>[anchor[0]+Math.cos(yaw)*x+Math.sin(yaw)*z,anchor[1],anchor[2]-Math.sin(yaw)*x+Math.cos(yaw)*z]);
  return {root,moving,measurements:{position:[...anchor],yaw,footprint,floorLevel:.24}};
}

// Four perforated sides. Each cutout is an actual opening through a thin sheet,
// not a bright decal stuck onto one face. The repeating leaf geometry is shared.
function bollardGeometry() {
  const m=fresh(),inside=fresh(),w=.34,depth=.27,height=2.18,th=.012;
  const face=(x,y,z,side)=>side===0?[x,y,depth/2+z]:side===1?[-x,y,-depth/2-z]:side===2?[w/2+z,y,-x]:[-w/2-z,y,x];
  for(let side=0;side<4;side++){
    const width=side<2?w:depth,fx=(x,y,z)=>face(x,y,z,side);
    // Blank head, central maker plaque, and foot preserve the original rhythm.
    for(const [lo,hi] of [[0,.23],[1.03,1.23],[2.00,height]])quad(m,fx(-width/2,lo,0),fx(width/2,lo,0),fx(width/2,hi,0),fx(-width/2,hi,0));
    for(const [low,high] of [[.23,1.03],[1.23,2.0]])for(let row=0;row<5;row++)for(let col=0;col<2;col++){
      const x0=-width/2+col*width/2,x1=x0+width/2,y0=low+(high-low)*row/5,y1=low+(high-low)*(row+1)/5;
      const cx=(x0+x1)/2,cy=(y0+y1)/2,rx=width*.065,ry=(y1-y0)*.38,angle=((row+col)%2?1:-1)*.42;
      const outer=[[x1,cy],[x1,y1],[x0,y1],[x0,cy],[x0,y0],[x1,y0]];
      const hole=Array.from({length:6},(_,j)=>{const t=j/6*TAU,xx=Math.cos(t)*rx,yy=Math.sin(t)*ry;return [cx+xx*Math.cos(angle)-yy*Math.sin(angle),cy+xx*Math.sin(angle)+yy*Math.cos(angle)];});
      for(let j=0;j<6;j++){
        const k=(j+1)%6,a=outer[j],b=outer[k],c=hole[k],d=hole[j];
        quad(m,fx(a[0],a[1],0),fx(b[0],b[1],0),fx(c[0],c[1],0),fx(d[0],d[1],0));
        quad(m,fx(d[0],d[1],0),fx(c[0],c[1],0),fx(c[0],c[1],-th),fx(d[0],d[1],-th));
        quad(m,fx(a[0],a[1],-th),fx(d[0],d[1],-th),fx(c[0],c[1],-th),fx(b[0],b[1],-th));
      }
    }
  }
  box(m,[0,height+.018,0],[w+.018,.036,depth+.018]);box(m,[0,.08,0],[w,.16,depth]);
  box(inside,[0,1.11,depth/2+.005],[.18,.065,.009]);
  return {shell:m,mark:inside};
}
function fixtures(parent,plazaTop,relocateZ,bollardLayout) {
  const root=group(parent,'Lampu taman sesuai dokumentasi'),body=bollardGeometry();
  for(const {position,yaw} of bollardLayout){
    const g=group(root,'Bollard berlubang motif daun',position,[0,yaw,0]);
    const p=painter(g,'Pelat dasar lampu');box(p.get('concrete'),[0,.10,0],[.55,.20,.53]);box(p.get('dark'),[0,.213,0],[.35,.025,.29]);
    for(const xx of [-.14,.14])for(const zz of [-.105,.105])pipe(p.get('silver'),[xx,.226,zz],[xx,.25,zz],.017,6);
    p.finish();batch(g,'Empat panel motif daun','dark',body.shell).position=[0,.23,0];batch(g,'Pelat identitas tengah','silver',body.mark).position=[0,.23,0];
  }
  for(const [x,z,y] of [[-19.4,14,.025],[19.4,14,.025],[25,-11,.025]]){
    const g=group(root,'Lampu jalan lengkung dua lengan',[x,y,z===14?14:relocateZ(z)]);const p=painter(g,'Struktur lampu jalan');
    box(p.get('concrete'),[0,.095,0],[.55,.19,.55]);flange(p,[0,.19,0],.18);
    pipe(p.get('silver'),[0,.20,0],[0,8.35,0],.064,12);
    for(const side of [-1,1]){
      tube(p.get('silver'),[[0,8.12,0],[side*.15,8.40,0],[side*.42,8.58,0],[side*.85,8.68,0],[side*1.42,8.72,0]],.042,10);
      box(p.get('dark'),[side*1.48,8.70,0],[.76,.11,.28]);box(p.get('glass'),[side*1.48,8.638,0],[.64,.022,.21]);
    }
    p.finish();
  }
  return root;
}

function minorLandmarks(parent,relocateZ,markerPosition) {
  // IMG_20261101_164623: a faceted dark gray rock landmark on a pale plinth.
  // The rock back, not present in the photo, is a closed continuation of its
  // irregular planes. No invented inscription or water jet is added.
  const monument=group(parent,'Batu penanda pada plint krem',markerPosition??[-31,.025,relocateZ(-6)]);const q=painter(monument,'Plint dan batu penanda');
  slab(q.get('paving'),roundedRect(4.3,4.2,.25),.01,.10);
  slab(q.get('cream'),roundedRect(3.1,2.75,.08),.10,.82);
  slab(q.get('concrete'),roundedRect(3.15,2.80,.08),.82,.88);
  const rock=(x,z,r,h,skew)=>{
    const bottom=[],shoulder=[],count=7;
    for(let i=0;i<count;i++){
      const t=i/count*TAU,scale=1+.14*Math.sin(i*4.21+skew);
      bottom.push([x+Math.cos(t)*r*scale,.87,z+Math.sin(t)*r*.84*scale]);
      shoulder.push([x+Math.cos(t)*r*.72+skew*.15,.87+h*(.37+.13*Math.sin(i*2.2)),z+Math.sin(t)*r*.57]);
    }
    const peak=[x+skew*.22,.87+h,z-r*.12],center=[x,.87,z],m=q.get('stone');
    for(let i=0;i<count;i++){const j=(i+1)%count;quad(m,bottom[i],bottom[j],shoulder[j],shoulder[i]);tri(m,shoulder[i],shoulder[j],peak);tri(m,center,bottom[j],bottom[i]);}
  };
  rock(-.25,-.1,.78,2.0,.8);rock(.63,.24,.61,1.28,-.5);rock(-.76,.31,.53,.84,.2);q.finish();
  return {monument};
}

export function createParkObjects({plazaTop=.025,relocateZ=z=>z,playgroundLayout,fitnessLayout,markerPosition,bollardLayout=createSitePlan().bollards}={}) {
  const root=createNode('Permainan, kebugaran & lampu dari foto');
  const play=playground(root,playgroundLayout?.position??[27,0,relocateZ(14)],playgroundLayout?.yaw??-.25),gym=fitness(root,fitnessLayout?.position??[27,0,relocateZ(3)],fitnessLayout?.yaw??.18);fixtures(root,plazaTop,relocateZ,bollardLayout);minorLandmarks(root,relocateZ,markerPosition);
  const update=(time,state={})=>{const amplitude=state.fitnessMotion===false?0:.16;for(const {pivot,phase} of gym.moving)pivot.rotation[0]=Math.sin(time*.95+phase)*amplitude;};
  const hierarchy={name:root.name,description:'Bentuk terlihat mengikuti foto: dua menara dengan perosotan merah, peralatan kebugaran biru-perak, dan lampu daun empat sisi. Dimensi pendekatan.',children:[
    {name:play.root.name,description:'Landasan sudut membulat → kolom berpelat baut → dua dek → jembatan → pagar vertikal → dua atap pelana; perosotan bercangkang dan bertumpu.',children:[]},
    {name:gym.root.name,description:'Empat stasiun pada paving: tiang tinggi, pegangan duduk, rangka miring dan duduk sisi kanan. Pijakan bergerak pada poros lokal.',children:[]},
    {name:'Lampu taman sesuai dokumentasi',description:'Tiang hitam bermotif daun hanya di sepanjang jalan setapak, berselang-seling di kedua sisinya dengan interval sekitar 9 satuan model; terpisah dari lampu jalan dua lengan.',children:[]},
    {name:'Batu penanda pada plint krem',description:'Batu berbidang pada plint krem dari foto 164623. Dudukan bertingkat dekat kolam dimodelkan terpisah sesuai bentuk dinding baji pada foto 164000.',children:[]}
  ]};
  return {root,update,hierarchy,measurements:{playground:play.measurements,fitness:gym.measurements,bollards:bollardLayout},anchors:{playground:[...play.measurements.position],fitness:[...gym.measurements.position]},moving: gym.moving};
}
