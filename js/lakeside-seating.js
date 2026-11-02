import {createNode} from '../hierarchy.js';

/** Tempat duduk beton bertingkat di sebelah area permainan, terlihat pada
 * IMG_20261101_164000 dan dari seberang danau pada IMG_20261101_164402.
 * Dinding ujungnya berprofil baji; ini bukan bangku kayu generik. Foto tidak
 * menyediakan pengukuran, sehingga jumlah/ukuran tingkat dan plan yang
 * tersembunyi merupakan rekonstruksi, bukan hasil survei tapak. */
export const SEATING_DEFAULTS=Object.freeze({
  firstIndex:8,lastIndex:18,frontOffset:.8,tierCount:3,tierRise:.43,
  tierDepth:.85,aisleWidth:1.25,frontLevel:.115,rearLandingDepth:.85,
  wallThickness:.20,wallAboveSeat:.18,rearBarrierHeight:.18,
  frontApronDepth:.75,sideAccessWidth:1.05,sideAccessOuterOffset:5.66,
  sideAccessEnabled:true,hillDepth:0
});
const empty=()=>({positions:[],normals:[],uvs:[],indices:[]});
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function tri(m,a,b,c,wanted){
  let n=cross(sub(b,a),sub(c,a));
  if(n.reduce((s,x,i)=>s+x*wanted[i],0)<0){[b,c]=[c,b];n=n.map(x=>-x);}
  const length=Math.hypot(...n),start=m.positions.length/3;
  if(length<1e-10)throw new Error('Degenerate seating geometry');
  const normal=n.map(x=>x/length);
  for(const p of [a,b,c]){
    m.positions.push(...p);m.normals.push(...normal);
    // Upright retaining faces need height in their UVs; XZ alone stretches a
    // single texture row into stripes over the whole back of the terrace.
    m.uvs.push(...(Math.abs(normal[1])>.6?[p[0],p[2]]:Math.abs(normal[0])>Math.abs(normal[2])?[p[2],p[1]]:[p[0],p[1]]));
  }
  m.indices.push(start,start+1,start+2);
}
const quad=(m,a,b,c,d,n)=>{tri(m,a,b,c,n);tri(m,a,c,d,n);};
const midpoint=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const node=(parent,name,mesh,material)=>{const n=createNode(name,{mesh,material});parent.add(n);return n;};
const concrete={color:[.73,.72,.65,1],texture:'concrete',shininess:5,specular:.035};
const coping={color:[.65,.65,.60,1],texture:'concrete',shininess:6,specular:.035};
const paving={color:[.64,.61,.56,1],texture:'paving',shininess:4,specular:.025};

function arcSampler(shore,first,last){
  if(!Array.isArray(shore)||shore.length<20)throw new TypeError('Lakeside seating requires the scene shoreline');
  const samples=[],lengths=[0];
  for(let i=first;i<=last;i++){
    const p=shore[i%shore.length],a=shore[(i-1+shore.length)%shore.length],b=shore[(i+1)%shore.length];
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    samples.push({p,n:[dz/len,-dx/len]});
    if(samples.length>1){const q=samples.at(-2).p;lengths.push(lengths.at(-1)+Math.hypot(p[0]-q[0],p[1]-q[1]));}
  }
  const length=lengths.at(-1);
  function at(s,d,y){
    const distance=Math.max(0,Math.min(length,s));let i=0;
    while(i<lengths.length-2&&lengths[i+1]<distance)i++;
    const t=(distance-lengths[i])/(lengths[i+1]-lengths[i]);
    const a=samples[i],b=samples[i+1],nx=a.n[0]+(b.n[0]-a.n[0])*t,nz=a.n[1]+(b.n[1]-a.n[1])*t,l=Math.hypot(nx,nz);
    return [a.p[0]+(b.p[0]-a.p[0])*t+nx/l*d,y,a.p[1]+(b.p[1]-a.p[1])*t+nz/l*d];
  }
  return {at,length};
}

// Each curved strip is a complete solid: top, underside, two long walls and
// both end caps. Normals face outwards on the lower and upper sides alike.
function bandSolid(arc,s0,s1,d0,d1,top,bottom=.02){
  const m=empty(),raw=Math.max(2,Math.ceil((s1-s0)/.38)),segments=raw+raw%2;
  const depthSegments=typeof top==='function'?16:1,height=typeof top==='function'?top:()=>top;
  const grid=Array.from({length:segments+1},(_,i)=>Array.from({length:depthSegments+1},(_,j)=>{
    const d=d0+(d1-d0)*j/depthSegments;return arc.at(s0+(s1-s0)*i/segments,d,height(d));
  }));
  const down=q=>[q[0],bottom,q[2]];
  for(let i=0;i<segments;i++)for(let j=0;j<depthSegments;j++){
    const a=grid[i][j],b=grid[i+1][j],c=grid[i+1][j+1],d=grid[i][j+1];
    quad(m,a,b,c,d,[0,1,0]);quad(m,down(a),down(d),down(c),down(b),[0,-1,0]);
    const inner=sub(midpoint(a,b),midpoint(d,c));
    if(j===0)quad(m,down(a),down(b),b,a,inner);
    if(j===depthSegments-1)quad(m,d,c,down(c),down(d),inner.map(v=>-v));
    if(i===0){const t=sub(arc.at(s0+.01,(d0+d1)/2,0),arc.at(s0,(d0+d1)/2,0));quad(m,down(a),a,d,down(d),t.map(v=>-v));}
    if(i===segments-1){const t=sub(arc.at(s1,(d0+d1)/2,0),arc.at(s1-.01,(d0+d1)/2,0));quad(m,b,down(b),down(c),c,t);}
  }
  return m;
}

export function createLakesideSeating(options={}){
  const c={...SEATING_DEFAULTS,...options},arc=arcSampler(c.shore,c.firstIndex,c.lastIndex),root=createNode('Dudukan beton bertingkat di tepi danau');
  if(c.tierCount<1||!Number.isInteger(c.tierCount)||c.tierRise<=0||c.tierDepth<=0||c.aisleWidth<=0||c.aisleWidth>arc.length-1)throw new RangeError('Invalid seating dimensions');
  const center=arc.length/2,aisle=[center-c.aisleWidth/2,center+c.aisleWidth/2],sections=[[0,aisle[0]],[aisle[1],arc.length]];
  const rearOffset=c.frontOffset+c.tierCount*c.tierDepth,rearEdge=rearOffset+c.rearLandingDepth;
  const upperLevel=c.frontLevel+c.tierCount*c.tierRise,frontEdge=Math.max(.05,c.frontOffset-c.frontApronDepth);
  const accessArc=arcSampler(c.shore,c.firstIndex-1,c.lastIndex+1);
  node(root,'Apron depan tersambung dua akses samping',bandSolid(accessArc,0,accessArc.length,frontEdge,c.frontOffset,c.frontLevel),paving);
  const seatRows=[];
  for(let i=0;i<c.tierCount;i++){
    const row=createNode(`Dudukan tingkat ${i+1}`);root.add(row);
    const d0=c.frontOffset+i*c.tierDepth,d1=d0+c.tierDepth,level=c.frontLevel+(i+1)*c.tierRise;
    for(const [j,[s0,s1]] of sections.entries()){
      node(row,`Massa beton dudukan ${i+1} sisi ${j+1}`,bandSolid(arc,s0,s1,d0,d1,level-.04),concrete);
      // A full closed seat cap covers the mass; its nose overhang is 25mm.
      node(row,`Ambang duduk ${i+1} sisi ${j+1}`,bandSolid(arc,s0,s1,d0-.025,d1,level,level-.04),coping);
    }
    seatRows.push({level,footLevel:level-c.tierRise,frontOffset:d0,backOffset:d1,seatDepth:c.tierDepth,seatHeight:c.tierRise});
  }
  const stair=createNode('Akses tengah dengan pijakan horizontal');root.add(stair);
  const stairRiser=c.tierRise/2,stairTread=c.tierDepth/2;
  const steps=[];
  for(let i=0;i<c.tierCount*2;i++){
    const d0=c.frontOffset+i*stairTread,d1=d0+stairTread,y=c.frontLevel+(i+1)*stairRiser;
    node(stair,`Anak tangga akses ${i+1}`,bandSolid(arc,aisle[0],aisle[1],d0,d1,y),coping);
    steps.push({level:y,frontOffset:d0,backOffset:d1,rise:stairRiser,tread:stairTread});
  }
  node(root,'Massa beton landing belakang',bandSolid(arc,0,arc.length,rearOffset,rearEdge,upperLevel-.04),concrete);
  node(root,'Landing belakang dudukan',bandSolid(arc,0,arc.length,rearOffset,rearEdge,upperLevel,upperLevel-.04),paving);
  node(root,'Dinding penutup belakang tanpa bukaan',bandSolid(arc,0,arc.length,rearEdge-.16,rearEdge+.12,upperLevel+c.rearBarrierHeight,upperLevel),concrete);
  // The photographed end wall is a wedge, rising from a low front nose to the
  // back of the terrace. It retains the seating mass instead of a free panel.
  const wallFront=c.frontOffset,wallRear=rearEdge+.12,wallTop=d=>c.frontLevel+.43+(d-wallFront)/(wallRear-wallFront)*(upperLevel+c.wallAboveSeat-c.frontLevel-.43);
  for(const [label,s0,s1] of [['kiri',0,c.wallThickness],['kanan',arc.length-c.wallThickness,arc.length]])
    node(root,`Dinding baji ujung ${label}`,bandSolid(arc,s0,s1,wallFront,wallRear,wallTop),concrete);
  // A rear retaining face is provided by the closed landing solid. No void
  // remains below the high platform when the scene is inspected from below.
  const footprint=[];
  for(let i=0;i<=24;i++)footprint.push(arc.at(arc.length*i/24,frontEdge,0));
  for(let i=24;i>=0;i--)footprint.push(arc.at(arc.length*i/24,wallRear,0));
  const frontApronEnds=[accessArc.at(0,(frontEdge+c.frontOffset)/2,c.frontLevel),accessArc.at(accessArc.length,(frontEdge+c.frontOffset)/2,c.frontLevel)];
  const sideAccess=[];
  for(const index of c.sideAccessEnabled?[c.firstIndex-1,c.lastIndex+1]:[]){
    const routeArc=arcSampler(c.shore,index-1,index+1);
    const midArc=arcSampler(c.shore,index-1,index),centerS=midArc.length,s0=centerS-c.sideAccessWidth/2,s1=centerS+c.sideAccessWidth/2;
    node(root,`Akses tanah samping dudukan indeks ${index}`,bandSolid(routeArc,s0,s1,frontEdge,c.sideAccessOuterOffset,c.frontLevel),paving);
    const pathFootprint=[routeArc.at(s0,frontEdge,0),routeArc.at(s1,frontEdge,0),routeArc.at(s1,c.sideAccessOuterOffset,0),routeArc.at(s0,c.sideAccessOuterOffset,0)];
    sideAccess.push({index,width:c.sideAccessWidth,front:routeArc.at(centerS,(frontEdge+c.frontOffset)/2,c.frontLevel),outer:routeArc.at(centerS,c.sideAccessOuterOffset,c.frontLevel),footprint:pathFootprint,level:c.frontLevel});
  }
  let backHill=null;
  if(c.hillDepth>0){
    const hill=empty(),across=16,grid=[],smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
    const raw=Math.max(2,Math.ceil(arc.length/.38)),segments=raw+raw%2;
    // Bury the grass side faces 15 mm inside the concrete walls. Exposed
    // grass and concrete no longer share a plane and fight in the depth buffer.
    const sideInset=Math.max(0,c.wallThickness-.015);
    const samples=[sideInset,...Array.from({length:segments+1},(_,i)=>arc.length*i/segments).filter(s=>s>sideInset&&s<arc.length-sideInset),arc.length-sideInset],along=samples.length-1;
    const hillTop=d=>.025+(upperLevel-.025)*(1-smooth((d-wallRear)/c.hillDepth));
    const frontD=wallRear-.015;
    for(const s of samples)grid.push(Array.from({length:across+1},(_,j)=>{
      const d=frontD+(wallRear+c.hillDepth-frontD)*j/across;return arc.at(s,d,hillTop(d));
    }));
    const down=p=>[p[0],.015,p[2]];
    for(let i=0;i<along;i++)for(let j=0;j<across;j++){
      const a=grid[i][j],b=grid[i+1][j],d=grid[i][j+1],e=grid[i+1][j+1];
      quad(hill,a,b,e,d,[0,1,0]);quad(hill,down(a),down(d),down(e),down(b),[0,-1,0]);
    }
    const perimeter=[...grid.map(row=>row[0]),...grid[along].slice(1),...grid.slice(0,-1).reverse().map(row=>row[across]),...grid[0].slice(1,-1).reverse()];
    const middle=arc.at(arc.length/2,wallRear+c.hillDepth/2,0);
    for(let i=0;i<perimeter.length;i++){const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];quad(hill,a,down(a),down(b),b,[(a[0]+b[0])/2-middle[0],0,(a[2]+b[2])/2-middle[2]]);}
    node(root,'Bukit rumput menempel belakang tribun',hill,{color:[.43,.49,.27,1],texture:'grass',shininess:3,specular:0});
    const sideWalls=[];
    for(const [label,s0,s1] of [['kiri',0,c.wallThickness],['kanan',arc.length-c.wallThickness,arc.length]]){
      const name=`Dinding beton samping bukit ${label}`;
      node(root,name,bandSolid(arc,s0,s1,wallRear,wallRear+c.hillDepth,d=>hillTop(d)+.14,.015),concrete);
      sideWalls.push({name,start:arc.at((s0+s1)/2,wallRear,upperLevel+.14),end:arc.at((s0+s1)/2,wallRear+c.hillDepth,.165)});
    }
    backHill={sideWalls,sideInset,depth:c.hillDepth,height:upperLevel,footprint:perimeter.map(p=>[p[0],0,p[2]]),attachmentLine:grid.map(row=>row[0]).filter(p=>Math.abs(p[1]-upperLevel)<1e-8)};
  }
  const allBounds=footprint.concat(sideAccess.flatMap(r=>r.footprint),backHill?.footprint??[]);
  // Include the apron overhang beyond both seating end walls.
  for(const s of [0,accessArc.length])for(const d of [frontEdge,c.frontOffset])allBounds.push(accessArc.at(s,d,0));
  const bounds={min:[0,1,2].map(k=>Math.min(...allBounds.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...allBounds.map(p=>p[k])))};
  bounds.min[1]=backHill ? .015 : .02;bounds.max[1]=upperLevel+c.rearBarrierHeight;
  const frontAccess=arc.at(center,frontEdge,c.frontLevel),rearAccess=arc.at(center,rearEdge,upperLevel),target=arc.at(center,(c.frontOffset+rearOffset)/2,upperLevel*.65);
  const outward=sub(arc.at(center,1,0),arc.at(center,0,0)),yaw=Math.atan2(-outward[0],-outward[2]);
  const measurements={firstIndex:c.firstIndex,lastIndex:c.lastIndex,frontOffset:c.frontOffset,rearOffset,rearEdge:wallRear,frontLevel:c.frontLevel,upperLevel,tierCount:c.tierCount,tierRise:c.tierRise,tierDepth:c.tierDepth,stairRiser,stairTread,aisleWidth:c.aisleWidth,arcLength:arc.length,seatRows,steps,footprint,bounds,centralAisle:aisle,rearBarrierHeight:c.rearBarrierHeight,sideAccess,frontApronEnds,backHill,facing:[-outward[0],0,-outward[2]]};
  const hierarchy={name:root.name,description:'Rekonstruksi dudukan beton bertingkat dekat permainan, dengan dinding ujung berbentuk baji sesuai foto; ukuran pendekatan.',children:[
    {name:'Dudukan beton berlapis',description:`${c.tierCount} baris duduk menghadap air, tinggi duduk ${Math.round(c.tierRise*100)} cm; setiap baris memiliki massa penopang dan ambang tertutup.`,children:[]},
    {name:stair.name,description:`${steps.length} anak tangga, tinggi ${Math.round(stairRiser*1000)/10} cm dan tread ${Math.round(stairTread*1000)/10} cm, menyambung apron dan landing belakang.`,children:[]},
    {name:'Dinding baji dan landing',description:'Dinding ujung naik mengikuti tingkat; massa bawah, belakang dan ujung tertutup. Pagar beton belakang menutup sisi tinggi, bukan pintu keluar.',children:[]},
    {name:'Dua akses samping pada elevasi tanah',description:'Jalur samping mengitari kedua ujung dinding dari promenade menuju apron depan; tidak menembus dudukan atau dinding baji.',children:[]}
  ]};
  return {root,hierarchy,measurements,anchors:{seatingFront:frontAccess,seatingRear:rearAccess,seatingTarget:target,frontApronEnds,seatingSideAccess:sideAccess.map(r=>r.outer)},presets:[
    {id:'seating',label:'Dudukan bertingkat • dari arah danau',yaw,pitch:.18,distance:17,target,fov:48},
    {id:'seating-back',label:'Dudukan • dinding dan akses belakang',yaw:yaw+Math.PI,pitch:.24,distance:17,target,fov:48}
  ]};
}
