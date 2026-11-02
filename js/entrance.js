import {createNode} from '../hierarchy.js';
import {Mat4} from '../math3d.js';
import { createPrimitives } from './geometry.js';

/**
 * Rekonstruksi entrance dari IMG_164246_Burst01..04, IMG_164250,
 * IMG_164209, dan IMG_164316 milik kelompok. Semua dimensi dalam meter
 * perkiraan. Dua anak tangga akses depan dan dua undakan podium tulisan
 * merupakan struktur berbeda dalam foto. Kedua akses samping dibuat sama sesuai koreksi pengguna;
 * tidak ada jalan melintang tepat di belakang tulisan.
 * Bagian yang tidak terlihat memakai konstruksi volume tertutup yang wajar,
 * bukan klaim pengukuran atau fotogrametri terhadap lokasi aslinya.
 */
export function createEntrance({plazaTop=.68,forecourtTop=.32,promenadeTop=.115,rampLayout={}}={}) {
  const {lowerX=16.6,lowerZ=10.2,outerControlX=17.3,lowerControlZ=12.6}=rampLayout;
  const root=createNode('Plaza masuk, tangga & ramp');
  const railPrimitives=createPrimitives();
  const gray={color:[.48,.49,.46,1],texture:'concrete',shininess:7,specular:.06};
  const edge={color:[.72,.72,.67,1],texture:'concrete',shininess:9,specular:.07};
  const paving={color:[.73,.71,.65,1],texture:'pavingSquare',uvScale:[1,1],shininess:5,specular:.04};
  const brick={color:[.65,.57,.51,1],texture:'paving',uvScale:[1,1],shininess:5,specular:.04};
  const blue={color:[.025,.37,.65,1],texture:'metal',shininess:55,specular:.36};
  const yellow={color:[.95,.70,.17,1],texture:'metal',shininess:43,specular:.29};
  const white={color:[.91,.92,.86,1],texture:'none',shininess:14,specular:.12};
  const black={color:[.08,.10,.095,1],texture:'metal',shininess:16,specular:.13};
  const add=(parent,name,mesh,position=[0,0,0],scale=[1,1,1],material=gray,rotation=[0,0,0])=>{
    const n=createNode(name,{mesh,position,scale,material,rotation});parent.add(n);return n;
  };
  const group=(parent,name)=>{const n=createNode(name);parent.add(n);return n;};
  const box=(parent,name,min,max,material=gray)=>add(parent,name,'box',min.map((v,i)=>(v+max[i])/2),min.map((v,i)=>max[i]-v),material);
  const bar=(parent,name,a,b,r,material=blue)=>{
    const d=b.map((v,i)=>v-a[i]),l=Math.hypot(...d);
    return add(parent,name,'cylinder',a.map((v,i)=>(v+b[i])/2),[r*2,l,r*2],material,[Math.asin(d[2]/l),0,Math.atan2(-d[0],d[1])]);
  };

  // Identical elevations are shared by geometry and the walkable connection
  // description. A stair tread always touches the next one, never a floating slab.
  const elevations={ground:forecourtTop,forecourt:forecourtTop,plaza:plazaTop,promenade:promenadeTop,podiumLow:plazaTop+.16,podiumHigh:plazaTop+.32};
  const P=elevations.plaza,F=elevations.forecourt,M=elevations.promenade;
  const frontRiser=(P-F)/2,wallTop=P+.95,wallCap=wallTop+.045;
  if(frontRiser<=0||frontRiser>.20||P<=M)throw new RangeError('Elevasi entrance harus membentuk dua riser depan positif, paling tinggi 20cm, di atas promenade.');
  const access=group(root,'Dua anak tangga akses plaza');
  box(access,'Landing bawah berpaving',[-11.4,.015,22.1],[11.4,elevations.ground,24.4],brick);
  const stairSteps=[
    {name:'Anak tangga akses 1',min:[-11.4,.015,21.5],max:[11.4,F+frontRiser,22.1]},
    {name:'Anak tangga akses 2',min:[-11.4,.015,20.9],max:[11.4,P,21.5]}
  ];
  for(const step of stairSteps){
    const tread=group(access,step.name);
    box(tread,'Cor beton riser',step.min,[step.max[0],step.max[1]-.028,step.max[2]],gray);
    box(tread,'Tutup tread utuh',[step.min[0],step.max[1]-.028,step.min[2]],[step.max[0],step.max[1],step.max[2]],edge);
  }
  const deck=group(root,'Pelataran paving persegi');
  box(deck,'Pelat plaza dengan sisi dan bawah tertutup',[-11.4,.015,13.49],[11.4,P-.035,20.9],gray);
  box(deck,'Paving persegi pelataran',[-11.4,P-.035,13.49],[11.4,P,20.9],{...paving,uvScale:[11.4,4.35]});
  // In the photos a reddish field sits below the sign, with grey perimeter tiles.
  box(deck,'Bidang paving merah di depan tulisan',[-9.25,P,14.5],[9.25,P+.006,17.8],{...brick,uvScale:[9.25,1.65]});
  box(deck,'Pita paving memanjang',[-.055,P,17.8],[.055,P+.007,20.9],edge);
  // Left edge opens onto a same-height side walkway instead of a blocking curb.


  // Closed wall extrusion: triangular end cheeks taper down to plaza level.
  const wall=group(root,'Landmark InfinITS Park');
  const wallProfile=[[-9.25,P],[-8.10,wallTop],[8.10,wallTop],[9.25,P]];
  add(wall,'Dinding plint dengan pipi miring',extrudeXY(wallProfile,.98),[0,0,14.0],[1,1,1],{...gray,color:[.39,.405,.38,1]});
  box(wall,'Tutup atas dinding',[-8.10,wallTop,13.49],[8.10,wallCap,14.51],{...gray,color:[.50,.51,.47,1]});
  // Small round-ended photo podium in front of the sign. These two shallow
  // tiers terminate against the masonry wall; they are not the main access route.
  const podium=group(root,'Dua undakan podium foto berujung bulat');
  const lowOutline=roundedFront(6.8,1.8,.46),highOutline=roundedFront(5.2,1.10,.39);
  add(podium,'Undakan podium bawah',extrudeXZ(lowOutline,P,P+.138),[0,0,14.50],[1,1,1],gray);
  add(podium,'Tutup undakan podium bawah',extrudeXZ(lowOutline,P+.138,P+.16),[0,0,14.50],[1,1,1],edge);
  add(podium,'Undakan podium atas',extrudeXZ(highOutline,P+.16,P+.298),[0,0,14.50],[1,1,1],gray);
  add(podium,'Tutup undakan podium atas',extrudeXZ(highOutline,P+.298,P+.32),[0,0,14.50],[1,1,1],edge);

  // The actual lowercase 'infin' and capitals ITS sit on individual blue feet.
  // Merge the raster runs into closed extruded faces so side/rear views have
  // real depth, while keeping the outline much finer than the old block letters.
  const letters=textMesh('infinITS',1.95,.20),park=textMesh('Park',1.83,.20);
  const totalWidth=letters.width+park.width+.36,fit=Math.min(1,15.3/totalWidth);
  const letterHeight=1.95*fit,baseY=P+1.25,x0=-totalWidth*fit/2;
  add(wall,'Huruf InfinITS',letters.geometry,[x0,baseY,14.06],[fit,fit,1],blue);
  add(wall,'Huruf Park',park.geometry,[x0+(letters.width+.36)*fit,baseY,14.06],[fit,fit,1],yellow);
  for(let i=0;i<12;i++){
    const x=x0+.30+i*(totalWidth*fit-.6)/11;
    bar(wall,'Kaki penyangga huruf',[x,wallCap,14.02],[x,baseY+.045,14.02],.035,blue);
    box(wall,'Pelat jangkar penyangga',[x-.09,wallCap,13.92],[x+.09,wallCap+.019,14.12],black);
  }

  // The white sponsor plaque is an asymmetric angular ribbon, rather than the
  // rectangular 'ITS' box used before. Front silhouette traced from IMG_164250.
  const plaqueProfile=[[-2.15,.02],[-2.35,.11],[-2.17,.34],[-1.82,.55],[-.38,.60],[.02,.73],[.40,1.08],[1.72,1.08],[1.91,.98],[1.59,.53],[1.25,.25],[.83,.12]];
  const plaque=group(wall,'Plakat putih supported by ITS Tekno Sains');
  plaque.position=[5.0,P+.07,14.63];
  add(plaque,'Badan plakat putih tertutup',extrudeXY(plaqueProfile,.14),[0,0,0],[1,1,1],white);
  for(const [text,height,pos,mat,name] of [
    ['SUPPORTED BY',.14,[-1.86,.28,.083],black,'Tulisan supported by'],
    ['ITS',.24,[.35,.72,.083],blue,'Logo ITS pada plakat'],
    ['TEKNO',.17,[.35,.49,.083],black,'Tulisan Tekno'],
    ['SAINS',.17,[.35,.28,.083],black,'Tulisan Sains']
  ])add(plaque,name,textMesh(text,height,.018).geometry,pos,[1,1,1],mat);
  for(const x of [-1.30,1.05])bar(plaque,'Kaki belakang plakat',[x,-.07,-.025],[x,.22,-.025],.027,black);

  // Blue three-pipe guardrails are grounded at their own local paving height.
  // Horizontal members are continuous across bends, and baseplates sit on slab.
  const railing=(parent,name,points,{height=1.00,postSpacing=1.45,openEnds=false,preservePosts=false,omitLastPost=false}={})=>{
    const g=group(parent,name),sampled=preservePosts?points:resamplePolyline(points,postSpacing);
    for(let i=0;i<sampled.length;i++){
      const p=sampled[i];
      if(!(omitLastPost&&i===sampled.length-1)){
        box(g,'Pelat dasar railing',[p[0]-.085,p[1],p[2]-.085],[p[0]+.085,p[1]+.016,p[2]+.085],blue);
        bar(g,'Tiang railing berjangkar',[p[0],p[1]+.01,p[2]],[p[0],p[1]+height,p[2]],.040,blue);
      }
    }
    for(let i=1;i<points.length;i++)for(const h of [.25,.58,1]){
      const a=points[i-1],p=points[i];bar(g,'Pipa horizontal tiga tingkat',[a[0],a[1]+height*h,a[2]],[p[0],p[1]+height*h,p[2]],.036,blue);
    }
    if(!openEnds)for(const p of [sampled[0],sampled.at(-1)])add(g,'Tutup ujung pipa','sphere',[p[0],p[1]+height,p[2]],[.085,.085,.085],blue);
    // All blue parts are static. Bake their transforms into one mesh per
    // railing so the additional perimeter guards do not add hundreds of nodes.
    const merged=emptyMesh();
    for(const part of g.children){
      const m=railPrimitives[part.mesh],at=merged.positions.length/3,world=Mat4.compose(part.position,part.rotation,part.scale),inverse=Mat4.invert(world);
      for(let i=0;i<m.positions.length;i+=3){
        merged.positions.push(...Mat4.transformPoint(world,m.positions.slice(i,i+3)));
        const n=m.normals.slice(i,i+3),v=[inverse[0]*n[0]+inverse[1]*n[1]+inverse[2]*n[2],inverse[4]*n[0]+inverse[5]*n[1]+inverse[6]*n[2],inverse[8]*n[0]+inverse[9]*n[1]+inverse[10]*n[2]],l=Math.hypot(...v);
        merged.normals.push(...v.map(x=>x/l));
      }
      merged.uvs.push(...m.uvs);merged.indices.push(...m.indices.map(i=>i+at));
    }
    g.children=[];add(g,'Pipa, tiang dan pelat railing biru',merged,[0,0,0],[1,1,1],blue);
    return g;
  };
  // Both sides use the same curved, supported approach. There is no separate
  // walking strip behind the letters: the park path ends at these two mouths.
  const makeSideRamp=side=>{
    const label=side>0?'kanan':'kiri',g=group(root,`Ramp lengkung sisi ${label}`),center=[];
    const controls=[[11.4,18.2],[outerControlX,18.2],[lowerX,lowerControlZ],[lowerX,lowerZ]];
    const smooth=t=>t*t*(3-2*t);
    for(let i=0;i<=28;i++){
      const t=i/28,u=1-t;
      const x=u*u*u*controls[0][0]+3*u*u*t*controls[1][0]+3*u*t*t*controls[2][0]+t*t*t*controls[3][0];
      const z=u*u*u*controls[0][1]+3*u*u*t*controls[1][1]+3*u*t*t*controls[2][1]+t*t*t*controls[3][1];
      center.push([side*x,P+(M-P)*smooth(Math.min(1,t/.82)),z]);
    }
    const widths=center.map((_,i)=>2.22+.98*(1-smooth(Math.min(1,(i/28)/.82))));
    const boundaries=offsetPath(center,(_,i)=>widths[i]/2);
    boundaries.left[0]=[side*11.4,P,18.2+side*1.60];boundaries.right[0]=[side*11.4,P,18.2-side*1.60];
    boundaries.left[28]=[side*lowerX+1.11,M,lowerZ];boundaries.right[28]=[side*lowerX-1.11,M,lowerZ];
    // The last five sections form a level lower landing, sharing an exact edge
    // with the open end of the promenade. Its slope and width mirror exactly.
    const split=23;
    add(g,`Pelat ramp ${label} tertutup`,closedPathSlab(boundaries.left.slice(0,split+1),boundaries.right.slice(0,split+1),.11),[0,0,0],[1,1,1],brick);
    add(g,`Landing bawah ramp ${label}`,closedPathSlab(boundaries.left.slice(split),boundaries.right.slice(split),.10),[0,0,0],[1,1,1],brick);
    const lowLeft=boundaries.left.map(p=>[p[0],p[1]-.11,p[2]]),lowRight=boundaries.right.map(p=>[p[0],p[1]-.11,p[2]]);
    add(g,`Fondasi ramp ${label} sampai tanah`,closedPathSlab(lowLeft,lowRight,.01,0),[0,0,0],[1,1,1],gray);
    for(const [which,points] of [['luar',boundaries.left],['dalam',boundaries.right]]){
      const strip=offsetPath(points,.07),a=strip.left.map(p=>[p[0],p[1]+.075,p[2]]),b=strip.right.map(p=>[p[0],p[1]+.075,p[2]]);
      add(g,`Kerb ${which} ramp ${label}`,closedPathSlab(a,b,.15),[0,0,0],[1,1,1],edge);
      railing(g,`Railing ${which} ramp ${label}`,points.map(p=>[p[0],p[1]+.075,p[2]]),{postSpacing:1.5,openEnds:true});
    }
    railing(deck,`Railing sisi ${label} belakang`,[[side*9.40,P,13.6],[side*11.18,P,13.6],[side*11.18,P,16.6],[side*11.4,P+.075,16.6]]);
    railing(deck,`Railing sisi ${label} depan`,[[side*11.4,P+.075,19.8],[side*11.18,P,19.8],[side*11.18,P,20.7],[side*7.0,P,20.7]]);
    railing(access,`Railing tepi tangga dan landing ${label}`,[[side*11.18,P,20.7],[side*11.18,P,21.15],[side*11.18,F+frontRiser,21.8],[side*11.18,F,22.35],[side*11.18,F,24.2]],{preservePosts:true});
    const length=center.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-center[i][0],p[2]-center[i][2]),0);
    const lowerOutline=[...boundaries.left.slice(split),...boundaries.right.slice(split).reverse()].map(p=>[p[0],p[2]]);
    return {side,label,width:2.22,upperWidth:3.20,widths,thickness:.11,length,slope:(P-M)/length,centerline:center,left:boundaries.left,right:boundaries.right,lowerOutline,lowerLine:center.slice(split),upperLandingTop:P,lowerLandingTop:M,upper:center[0],lower:center.at(-1)};
  };
  const rightRamp=makeSideRamp(1),leftRamp=makeSideRamp(-1);

  // Separate vertical blue/white information blade stands just beyond Park.
  const blade=group(root,'Totem ITS Tekno Sains di sisi Park');blade.position=[9.63,P,14.15];
  const bladeShape=[[-.37,0],[.37,0],[.37,2.80],[.19,3.05],[-.37,2.55]];
  add(blade,'Totem putih dengan puncak miring',extrudeXY(bladeShape,.16),[0,0,0],[1,1,1],white);
  const blueBlade=[[-.365,0],[.365,0],[.365,1.88],[.20,2.10],[-.365,2.48]];
  add(blade,'Panel biru totem',extrudeXY(blueBlade,.012),[0,0,.087],[1,1,1],blue);
  for(const [text,h,x,y,mat] of [['ITS',.12,-.14,2.47,blue],['TEKNO',.075,-.14,2.34,black],['SAINS',.075,-.14,2.24,black],['Jogging Track',.065,-.29,1.55,white],['Amphitheater',.065,-.29,1.36,white],['Resto',.065,-.29,1.17,white],['Plaza',.065,-.29,.98,white]])
    add(blade,'Informasi '+text,textMesh(text,h,.008).geometry,[x,y,.101],[1,1,1],mat);
  box(blade,'Pondasi totem',[-.43,-.11,-.19],[.43,.025,.19],gray);

  const measurements={
    sourcePhotos:['IMG_20261101_164246_Burst01.jpg','IMG_20261101_164250.jpg','IMG_20261101_164209.jpg','IMG_20261101_164316.jpg'],
    units:'perkiraan meter; bukan hasil survei',elevations,
    forecourtBounds:{min:[-11.4,.015,22.1],max:[11.4,F,24.4]},
    plazaBounds:{min:[-11.4,.015,13.49],max:[11.4,P,20.9]},
    accessStair:{riser:frontRiser,tread:.60,count:2,width:22.8,steps:stairSteps,lowerLandingTop:F,upperLandingTop:P},
    leftAccess:{type:'mirrored-ramp',width:2.22,upperWidth:3.20,count:0,upperLandingTop:P,lowerLandingTop:M},
    photoPodium:{riser:.16,count:2,lowerOutline:lowOutline,upperOutline:highOutline,wallFrontZ:14.49,backZ:14.50},
    ramp:rightRamp,ramps:{right:rightRamp,left:leftRamp},
    sign:{wallProfile,wallDepth:.98,letterHeight,letterBottom:baseY,rearZ:13.49},nodeCount:countNodes(root)
  };
  const anchors={plaza:[0,P,18.5],frontLanding:[0,F,23],rampUpper:rightRamp.upper,rampLower:rightRamp.lower,promenadeConnection:rightRamp.lower,
    leftUpperLanding:leftRamp.upper,leftLowerLanding:leftRamp.lower,leftPromenadeConnection:leftRamp.lower,landmark:[0,P+1.86,14]};
  const walkways=[
    {id:'landing-bawah',surface:F,bounds:[-11.4,11.4,22.1,24.4],connects:['tangga-1']},
    {id:'tangga-1',surface:F+frontRiser,bounds:[-11.4,11.4,21.5,22.1],connects:['landing-bawah','tangga-2']},
    {id:'tangga-2',surface:P,bounds:[-11.4,11.4,20.9,21.5],connects:['tangga-1','plaza']},
    {id:'plaza',surface:P,bounds:[-11.4,11.4,13.49,20.9],connects:['tangga-2','ramp-kanan','ramp-kiri']},
    {id:'ramp-kanan',centerline:rightRamp.centerline,connects:['plaza','promenade']},
    {id:'ramp-kiri',centerline:leftRamp.centerline,connects:['plaza','promenade']},
    {id:'promenade',surface:M,connects:['ramp-kanan','ramp-kiri']}
  ];
  const hierarchy={name:root.name,description:'Dua undakan depan menuju plaza; ramp kiri dan kanan bercermin langsung terhubung dengan kedua ujung jalur taman. Tidak ada jalur melintang di belakang tulisan.',children:[
    {name:access.name,description:`Dua riser ${Math.round(frontRiser*100)}cm dengan tread 60cm dan fondasi utuh.`,children:[]},
    {name:'Dua akses lengkung simetris',description:'Ramp kiri dan kanan memiliki geometri, elevasi, landing datar dan railing yang sama; hanya posisi X dicerminkan.',children:[]},
    {name:wall.name,description:'Plint tertutup → penyangga → huruf 3D → plakat; tanah dan tanaman berada di belakangnya.',children:[]},
    {name:podium.name,description:'Dua undakan kecil membulat terpisah di depan tulisan.',children:[]}
  ]};
  return {root,hierarchy,anchors,walkways,measurements,presets:[
    {id:'entrance',label:'Landmark & dua akses samping',yaw:.02,pitch:.14,distance:31+Math.max(0,lowerX-16.6)*3,target:[0,P+1.36,15.9],fov:48},
    {id:'entrance-side',label:'Akses lengkung sisi kanan',yaw:1.05,pitch:.28,distance:24+Math.max(0,lowerX-16.6)*1.3,target:[7,P+.66,15],fov:48},
    {id:'entrance-left',label:'Akses kiri • sama dengan kanan',yaw:-1.05,pitch:.28,distance:24+Math.max(0,lowerX-16.6)*1.3,target:[-7,P+.66,15],fov:48},
    {id:'entrance-back',label:'Belakang tulisan • tanpa jalan',yaw:Math.PI,pitch:.25,distance:22,target:[0,P+1.16,14],fov:48}
  ]};
}

const emptyMesh=()=>({positions:[],normals:[],uvs:[],indices:[]});
function quad(m,a,b,c,d,normal,uv=[[0,0],[1,0],[1,1],[0,1]]){
  const n=normal.map(v=>v/Math.hypot(...normal)),u=b.map((v,i)=>v-a[i]),v=c.map((p,i)=>p-a[i]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const reverse=cross.reduce((s,p,i)=>s+p*n[i],0)<0,points=reverse?[a,d,c,b]:[a,b,c,d],coords=reverse?[uv[0],uv[3],uv[2],uv[1]]:uv;
  const index=m.positions.length/3;points.forEach((p,i)=>{m.positions.push(...p);m.normals.push(...n);m.uvs.push(...coords[i]);});
  m.indices.push(index,index+1,index+2,index,index+2,index+3);
}
function triangle(m,a,b,c,n){const p=m.positions.length/3;const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);const dot=(ab[1]*ac[2]-ab[2]*ac[1])*n[0]+(ab[2]*ac[0]-ab[0]*ac[2])*n[1]+(ab[0]*ac[1]-ab[1]*ac[0])*n[2];for(const v of dot<0?[a,c,b]:[a,b,c]){m.positions.push(...v);m.normals.push(...n);m.uvs.push(v[0],v[1]+v[2]);}m.indices.push(p,p+1,p+2);}
function extrudeXY(outline,depth){
  const m=emptyMesh();
  // Ear clipping retains the concave silhouette of the asymmetric white
  // sponsor ribbon, including the indentation before its raised ITS section.
  for(const [a,b,c] of triangulatePolygon(outline)){
    triangle(m,[...outline[a],depth/2],[...outline[b],depth/2],[...outline[c],depth/2],[0,0,1]);
    triangle(m,[...outline[a],-depth/2],[...outline[b],-depth/2],[...outline[c],-depth/2],[0,0,-1]);
  }
  let area=0;outline.forEach((p,i)=>{const q=outline[(i+1)%outline.length];area+=p[0]*q[1]-q[0]*p[1];});
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dy=b[1]-a[1],sign=area>0?1:-1;
    quad(m,[...a,-depth/2],[...b,-depth/2],[...b,depth/2],[...a,depth/2],[dy*sign,-dx*sign,0]);
  }return m;
}
function triangulatePolygon(points){
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const area=points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a[0]*b[1]-b[0]*a[1];},0);
  const order=points.map((_,i)=>i);if(area<0)order.reverse();const result=[];
  while(order.length>3){
    let ear=-1;
    for(let i=0;i<order.length;i++){
      const ids=[order[(i+order.length-1)%order.length],order[i],order[(i+1)%order.length]], [a,b,c]=ids.map(j=>points[j]);
      if(cross(a,b,c)<1e-10)continue;
      const contains=order.some(j=>!ids.includes(j)&&cross(a,b,points[j])>=-1e-10&&cross(b,c,points[j])>=-1e-10&&cross(c,a,points[j])>=-1e-10);
      if(!contains){ear=i;result.push(ids);break;}
    }
    if(ear<0)throw new Error('Profil plakat memiliki sisi berpotongan atau titik degenerat.');
    order.splice(ear,1);
  }
  result.push(order.slice());return result;
}
function roundedFront(width,depth,radius){
  const points=[[-width/2,0],[width/2,0],[width/2,depth-radius]];
  for(let i=1;i<=10;i++){const t=i/10*Math.PI/2;points.push([width/2-radius+radius*Math.cos(t),depth-radius+radius*Math.sin(t)]);}
  points.push([-width/2+radius,depth]);
  for(let i=1;i<=10;i++){const t=Math.PI/2+i/10*Math.PI/2;points.push([-width/2+radius+radius*Math.cos(t),depth-radius+radius*Math.sin(t)]);}
  return points;
}
function convexHull(points){
  const sorted=[...new Map(points.map(p=>[p.map(v=>v.toFixed(8)).join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const lower=[],upper=[];
  for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
  for(const p of sorted.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
  return [...lower.slice(0,-1),...upper.slice(0,-1)];
}
function extrudeXZ(outline,bottom,top){
  const m=emptyMesh(),c=outline.reduce((s,p)=>[s[0]+p[0]/outline.length,s[1]+p[1]/outline.length],[0,0]);
  let area=0;outline.forEach((p,i)=>{const q=outline[(i+1)%outline.length];area+=p[0]*q[1]-q[0]*p[1];});
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dz=b[1]-a[1],sign=area>0?1:-1;
    triangle(m,[c[0],top,c[1]],[a[0],top,a[1]],[b[0],top,b[1]],[0,1,0]);
    triangle(m,[c[0],bottom,c[1]],[a[0],bottom,a[1]],[b[0],bottom,b[1]],[0,-1,0]);
    quad(m,[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],[a[0],top,a[1]],[dz*sign,0,-dx*sign]);
  }return m;
}
function pathTangent(points,i){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz);return [dx/l,dz/l];}
function offsetPath(points,halfWidth){const left=[],right=[];points.forEach((p,i)=>{const [x,z]=pathTangent(points,i),w=typeof halfWidth==='function'?halfWidth(p,i):halfWidth;left.push([p[0]-z*w,p[1],p[2]+x*w]);right.push([p[0]+z*w,p[1],p[2]-x*w]);});return {left,right};}
function closedPathSlab(left,right,thickness,bottomPlane=null){
  const m=emptyMesh(),down=p=>[p[0],bottomPlane===null?p[1]-thickness:bottomPlane,p[2]];let run=0;
  for(let i=0;i<left.length-1;i++){
    const a=left[i],b=right[i],c=right[i+1],d=left[i+1],old=run;run+=Math.hypot(d[0]-a[0],d[2]-a[2]);
    const tangent=[(c[0]+d[0]-a[0]-b[0])/2,(c[1]+d[1]-a[1]-b[1])/2,(c[2]+d[2]-a[2]-b[2])/2];
    const width=[b[0]-a[0],0,b[2]-a[2]],normal=[tangent[1]*width[2],tangent[2]*width[0]-tangent[0]*width[2],-tangent[1]*width[0]];
    if(normal[1]<0)normal.forEach((_,k)=>normal[k]*=-1);
    quad(m,a,b,c,d,normal,[[0,old],[1,old],[1,run],[0,run]]);
    quad(m,down(a),down(b),down(c),down(d),bottomPlane===null?normal.map(v=>-v):[0,-1,0]);
    quad(m,down(a),a,d,down(d),[a[0]-b[0],0,a[2]-b[2]]);
    quad(m,b,down(b),down(c),c,[b[0]-a[0],0,b[2]-a[2]]);
  }
  const a=left[0],b=right[0],c=left.at(-1),d=right.at(-1),t0=pathTangent(left,0),t1=pathTangent(left,left.length-1);
  quad(m,down(a),down(b),b,a,[-t0[0],0,-t0[1]]);quad(m,c,d,down(d),down(c),[t1[0],0,t1[1]]);
  return m;
}
function resamplePolyline(points,spacing){
  const out=[points[0]],distance=[0];for(let i=1;i<points.length;i++)distance.push(distance.at(-1)+Math.hypot(...points[i].map((v,k)=>v-points[i-1][k])));
  const count=Math.max(1,Math.ceil(distance.at(-1)/spacing));
  for(let n=1;n<=count;n++){
    const target=distance.at(-1)*n/count;let i=1;while(i<distance.length-1&&distance[i]<target)i++;
    const t=(target-distance[i-1])/(distance[i]-distance[i-1]);out.push(points[i-1].map((v,k)=>v+(points[i][k]-v)*t));
  }return out;
}
function textMesh(text,height,depth){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const font='600 144px Arial, sans-serif';ctx.font=font;const width=Math.ceil(ctx.measureText(text).width)+12;
  canvas.width=width;canvas.height=174;ctx.font=font;ctx.textBaseline='top';ctx.fillStyle='#fff';ctx.fillText(text,6,2);
  const source=ctx.getImageData(0,0,width,174).data,step=2,cols=Math.ceil(width/step),rows=87,grid=[];
  let minY=rows,maxY=0,minX=cols,maxX=0;
  for(let y=0;y<rows;y++){grid[y]=[];for(let x=0;x<cols;x++){const fill=source[((y*step+1)*width+Math.min(width-1,x*step+1))*4+3]>108;grid[y][x]=fill;if(fill){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}}
  if(maxY<minY)return {geometry:extrudeXY([[0,0],[.1,0],[.1,height],[0,height]],depth),width:.1};
  const cell=height/(maxY-minY+1),m=emptyMesh(),is=(x,y)=>Boolean(grid[y]?.[x]);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(is(x,y)){
    let e=x;while(e<maxX&&is(e+1,y))e++;
    const l=(x-minX)*cell,r=(e-minX+1)*cell,b=(maxY-y)*cell,t=b+cell;
    quad(m,[l,b,depth/2],[r,b,depth/2],[r,t,depth/2],[l,t,depth/2],[0,0,1]);
    quad(m,[r,b,-depth/2],[l,b,-depth/2],[l,t,-depth/2],[r,t,-depth/2],[0,0,-1]);x=e;
  }
  // Merge collinear exposed edges into long strips instead of one side quad
  // per pixel. This preserves closed counters in P/a and fine outline detail.
  for(const dir of ['top','bottom'])for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const exposed=(xx)=>is(xx,y)&&!is(xx,y+(dir==='top'?-1:1));if(!exposed(x))continue;
    let e=x;while(e<maxX&&exposed(e+1))e++;
    const l=(x-minX)*cell,r=(e-minX+1)*cell,yy=(maxY-y+(dir==='top'?1:0))*cell;
    quad(m,[l,yy,-depth/2],[r,yy,-depth/2],[r,yy,depth/2],[l,yy,depth/2],[0,dir==='top'?1:-1,0]);x=e;
  }
  for(const dir of ['left','right'])for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){
    const exposed=(yy)=>is(x,yy)&&!is(x+(dir==='left'?-1:1),yy);if(!exposed(y))continue;
    let e=y;while(e<maxY&&exposed(e+1))e++;
    const xx=(x-minX+(dir==='right'?1:0))*cell,b=(maxY-e)*cell,t=(maxY-y+1)*cell;
    quad(m,[xx,b,-depth/2],[xx,b,depth/2],[xx,t,depth/2],[xx,t,-depth/2],[dir==='left'?-1:1,0,0]);y=e;
  }
  return {geometry:m,width:(maxX-minX+1)*cell};
}
function countNodes(n){return 1+n.children.reduce((sum,c)=>sum+countNodes(c),0);}
