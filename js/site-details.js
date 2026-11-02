import {createNode} from '../hierarchy.js';

/**
 * Detail tapak yang terlihat dalam dokumentasi: batu kelabu tidak beraturan
 * di pangkal pohon serta bangunan utilitas beratap pelana bertingkat. Bukan dekorasi
 * generik; posisi dan ukuran tetap pendekatan terhadap foto pengambilan lapangan.
 * Batu dibatch menurut warna agar ratusan fragmen tidak menjadi ratusan draw call.
 */
export function createSiteDetails({relocateZ=z=>z,pavilionLayout}={}) {
  const root=createNode('Detail tapak dari dokumentasi');
  let seed=1112026;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+(b-a)*rand();
  const mat=(color,texture='none',extra={})=>({color,texture,shininess:7,specular:.06,...extra});
  const add=(parent,name,mesh,position,scale,material,rotation=[0,0,0])=>{
    const node=createNode(name,{mesh,position,scale,material,rotation});parent.add(node);return node;
  };
  const group=(parent,name,position=[0,0,0])=>{const node=createNode(name,{position});parent.add(node);return node;};
  const mesh=()=>({positions:[],normals:[],uvs:[],indices:[]});
  function triangle(m,a,b,c) {
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
    const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...n)||1;
    const at=m.positions.length/3;
    for(const p of [a,b,c]){m.positions.push(...p);m.normals.push(...n.map(v=>v/len));m.uvs.push(p[0]*.8,p[2]*.8);}
    m.indices.push(at,at+1,at+2);
  }
  const quad=(m,a,b,c,d)=>{triangle(m,a,b,c);triangle(m,a,c,d);};

  const rubble=group(root,'Batu kelabu di pangkal pohon');
  const stones=[mesh(),mesh(),mesh(),mesh()];
  const stoneColors=[[.48,.49,.46,1],[.59,.59,.54,1],[.39,.41,.39,1],[.67,.65,.58,1]];
  // Mounds only occur beside a few trunks in the photographs; avoid a stone ring
  // around every tree. Their scattered skirt blends into soil and short grass.
  const anchors=[[-34,-9,2.25],[-31,22,1.9],[-22,-21,1.7]].map(([x,z,size])=>[x,relocateZ(z),size]);
  function stone(target,x,z,r,height,yaw) {
    const sides=6,ring=[];
    const ca=Math.cos(yaw),sa=Math.sin(yaw);
    const world=(px,py,pz)=>[x+px*ca+pz*sa,.028+py,z-px*sa+pz*ca];
    for(let i=0;i<sides;i++){
      const a=i/sides*Math.PI*2,rr=r*range(.78,1.16);
      ring.push(world(Math.cos(a)*rr,height*range(.17,.42),Math.sin(a)*rr*range(.68,.95)));
    }
    const peak=world(r*range(-.28,.25),height,r*range(-.20,.21)),bottom=world(0,0,0);
    for(let i=0;i<sides;i++){
      const j=(i+1)%sides;
      triangle(target,ring[i],peak,ring[j]);
      triangle(target,ring[j],bottom,ring[i]);
    }
  }
  for(const [ax,az,radius] of anchors)for(let i=0;i<70;i++){
    const a=rand()*Math.PI*2,d=radius*Math.sqrt(rand());
    // The few high pieces occur close to the trunk; small fragments scatter out.
    const s=range(.11,.35)*(d<radius*.62?1.2:.72),h=s*range(.6,1.25);
    stone(stones[Math.floor(rand()*stones.length)],ax+Math.cos(a)*d,az+Math.sin(a)*d,s,h,rand()*Math.PI);
  }
  stones.forEach((m,i)=>add(rubble,`Fragmen batu ${i+1}`,m,[0,0,0],[1,1,1],mat(stoneColors[i],'concrete')));

  // IMG_20261101_164548 shows a small enclosed utility building. The roof
  // is a tall GABLE with a low corrugated veranda skirt, not a square hip.
  // This is important from the path, where the cream triangular gable is clear.
  // The rear is not recorded at close range; it stays a simple closed wall.
  const pavilion=group(root,'Pos ronda beratap pelana',pavilionLayout?.position??[25,.025,relocateZ(-19)]);
  root.pavilionMeasurements={position:[...pavilion.position],footprint:[[-3.125,-2.775],[3.125,-2.775],[3.125,3.21],[-3.125,3.21]].map(([x,z])=>[x+pavilion.position[0],pavilion.position[1],z+pavilion.position[2]])};
  const cream=mat([.78,.77,.68,1],'concrete',{uvScale:[2,2]}),trim=mat([.66,.65,.57,1],'concrete');
  const dark=mat([.18,.20,.18,1],'none'),brown=mat([.39,.22,.15,1],'bark',{uvScale:[1,3]});
  const floor=mat([.50,.51,.46,1],'concrete',{uvScale:[4,4]});
  add(pavilion,'Pondasi tertutup','box',[0,.105,0],[6.25,.21,5.55],trim);
  add(pavilion,'Lantai teras menyatu','box',[0,.255,0],[6.05,.09,5.35],floor);
  // The 15 cm step reaches the 30 cm terrace; neither tread floats above soil.
  add(pavilion,'Tangga pendek terhubung lantai','box',[.25,.075,2.88],[2.6,.15,.66],trim);
  add(pavilion,'Ambang teras depan','box',[.25,.225,2.68],[2.6,.15,.34],floor);

  const room=group(pavilion,'Ruang utilitas tertutup',[-.40,0,-.20]);
  // Four walls meet at corners; window/door panes sit in actual framed recesses.
  // Front wall is split around its openings instead of a floating black sticker.
  const wallY=.30,wallTop=2.94,frontZ=1.66,backZ=-1.90,leftX=-1.88,rightX=1.88,thick=.15;
  const frontParts=mesh();
  function batchBox(m,c,size) {
    const x=c[0],y=c[1],z=c[2],w=size[0]/2,h=size[1]/2,d=size[2]/2;
    outwardQuad(m,[x-w,y-h,z+d],[x+w,y-h,z+d],[x+w,y+h,z+d],[x-w,y+h,z+d],[0,0,1]);
    outwardQuad(m,[x+w,y-h,z-d],[x-w,y-h,z-d],[x-w,y+h,z-d],[x+w,y+h,z-d],[0,0,-1]);
    outwardQuad(m,[x+w,y-h,z+d],[x+w,y-h,z-d],[x+w,y+h,z-d],[x+w,y+h,z+d],[1,0,0]);
    outwardQuad(m,[x-w,y-h,z-d],[x-w,y-h,z+d],[x-w,y+h,z+d],[x-w,y+h,z-d],[-1,0,0]);
    outwardQuad(m,[x-w,y+h,z+d],[x+w,y+h,z+d],[x+w,y+h,z-d],[x-w,y+h,z-d],[0,1,0]);
    outwardQuad(m,[x-w,y-h,z-d],[x+w,y-h,z-d],[x+w,y-h,z+d],[x-w,y-h,z+d],[0,-1,0]);
  }
  function outwardTriangle(m,a,b,c,n) {
    const u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]);
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if(cross.reduce((sum,q,i)=>sum+q*n[i],0)<0)triangle(m,a,c,b);else triangle(m,a,b,c);
  }
  function outwardQuad(m,a,b,c,d,n){outwardTriangle(m,a,b,c,n);outwardTriangle(m,a,c,d,n);}
  function wallSegment(x0,x1,y0,y1){if(x1>x0&&y1>y0)batchBox(frontParts,[(x0+x1)/2,(y0+y1)/2,frontZ],[x1-x0,y1-y0,thick]);}
  const openings=[{x0:-1.54,x1:-1.04,y0:.30,y1:2.18,type:'door'},
    {x0:-.78,x1:-.29,y0:1.91,y1:2.62,type:'window'},
    {x0:.68,x1:1.31,y0:2.29,y1:2.65,type:'vent'}];
  let cursor=leftX;
  for(const o of openings){wallSegment(cursor,o.x0,wallY,wallTop);wallSegment(o.x0,o.x1,wallY,o.y0);wallSegment(o.x0,o.x1,o.y1,wallTop);cursor=o.x1;}
  wallSegment(cursor,rightX,wallY,wallTop);
  add(room,'Fasad dengan lubang bukaan',frontParts,[0,0,0],[1,1,1],cream);
  add(room,'Dinding belakang tanpa bukaan rekaan','box',[0,(wallY+wallTop)/2,backZ],[3.91,wallTop-wallY,thick],cream);
  for(const x of [leftX,rightX])add(room,'Dinding samping tertutup','box',[x,(wallY+wallTop)/2,(frontZ+backZ)/2],[thick,wallTop-wallY,frontZ-backZ],cream);
  for(const o of openings){
    const w=o.x1-o.x0,h=o.y1-o.y0,cx=(o.x0+o.x1)/2,cy=(o.y0+o.y1)/2;
    const frame=group(room,o.type==='door'?'Pintu utilitas':o.type==='window'?'Jendela kecil tinggi':'Ventilasi kecil',[cx,cy,frontZ-.022]);
    add(frame,'Panel di dalam kusen','box',[0,0,-.025],[w-.055,h-.055,.045],o.type==='door'?mat([.28,.28,.23,1],'bark'):dark);
    for(const x of [-w/2,w/2])add(frame,'Kusen tegak','box',[x,0,.01],[.045,h+.055,.10],trim);
    for(const y of [-h/2,h/2])add(frame,'Kusen mendatar','box',[0,y,.01],[w,.045,.10],trim);
    if(o.type==='door')add(frame,'Pegangan pintu','box',[w*.32,-.06,.08],[.025,.12,.025],mat([.28,.28,.25,1],'metal'));
    if(o.type==='vent')for(let i=0;i<4;i++)add(frame,'Kisi ventilasi','box',[0,-h*.32+i*h*.21,.04],[w-.065,.018,.035],trim);
  }
  const frontPlinth=mesh();
  for(const [a,b] of [[leftX-.04,-1.54],[-1.04,rightX+.04]])batchBox(frontPlinth,[(a+b)/2,.42,frontZ+.085],[b-a,.24,.035]);
  add(room,'Plint depan tanpa menutup pintu',frontPlinth,[0,0,0],[1,1,1],mat([.53,.52,.45,1],'concrete'));
  for(const x of [leftX-.08,rightX+.08])add(room,'Plint samping','box',[x,.42,-.12],[.035,.24,3.62],mat([.53,.52,.45,1],'concrete'));
  // Porch columns in the photograph are red/brown, with small concrete feet.
  for(const [x,z] of [[2.53,2.18],[2.53,-2.18],[-2.53,2.18],[-2.53,-2.18]]){
    const pier=group(pavilion,'Kolom teras cokelat',[x,.30,z]);
    add(pier,'Umpak kolom menapak lantai','box',[0,.085,0],[.32,.17,.32],trim);
    add(pier,'Tiang teras','box',[0,1.22,0],[.17,2.44,.17],brown);
    add(pier,'Kepala tiang','box',[0,2.47,0],[.23,.11,.23],brown);
  }
  const beams=mesh();
  for(const z of [-2.18,2.18])batchBox(beams,[0,2.82,z],[5.33,.16,.17]);
  for(const x of [-2.53,2.53])batchBox(beams,[x,2.82,0],[.17,.16,4.53]);
  add(pavilion,'Balok keliling teras',beams,[0,0,0],[1,1,1],brown);
  const bench=group(pavilion,'Bangku teras kanan',[2.33,.30,-.60]);
  for(const z of [-.75,.75])add(bench,'Kaki bangku','box',[0,.18,z],[.30,.36,.19],brown);
  add(bench,'Dudukan bangku','box',[0,.39,0],[.48,.09,1.95],brown);
  add(bench,'Sandaran bangku','box',[.20,.72,0],[.065,.44,1.95],brown);

  const roof=group(pavilion,'Atap pelana dan teritis seng');
  const roofTop=mesh(),soffit=mesh(),fascia=mesh(),corrugation=mesh(),cap=mesh(),rafters=mesh();
  const roofMat=mat([.66,.66,.61,1],'metal',{shininess:10,specular:.09,uvScale:[3,3]});
  // Every sheet is a closed thin solid: top, underside, and all four edges.
  // The underside keeps the camera view from below structurally plausible.
  function roofSheet(corners,normal){
    outwardQuad(roofTop,...corners,normal);
    const lower=corners.map(p=>[p[0],p[1]-.075,p[2]]);
    outwardQuad(soffit,...lower,[0,-1,0]);
    const center=corners[0].map((_,k)=>corners.reduce((sum,p)=>sum+p[k],0)/4);
    for(let i=0;i<4;i++){
      const j=(i+1)%4,a=corners[i],b=corners[j],c=lower[j],d=lower[i];
      const edge=b.map((v,k)=>v-a[k]),normal=[edge[2],0,-edge[0]];
      if(normal.reduce((sum,q,k)=>sum+q*((a[k]+b[k])/2-center[k]),0)<0)normal.forEach((_,k)=>normal[k]*=-1);
      outwardQuad(fascia,a,b,c,d,normal);
    }
  }
  const ridgeY=5.02,eaveY=3.18,halfW=2.35,halfD=2.27;
  roofSheet([[0,ridgeY,halfD],[0,ridgeY,-halfD],[-halfW,eaveY,-halfD],[-halfW,eaveY,halfD]],[-1,1,0]);
  roofSheet([[halfW,eaveY,halfD],[halfW,eaveY,-halfD],[0,ridgeY,-halfD],[0,ridgeY,halfD]],[1,1,0]);
  // Triangular gable walls have thickness and closed edges. Both ends are real
  // geometry, rather than a single front-facing triangular billboard.
  for(const side of [-1,1]){
    const z=side*2.20,back=z-side*.13,g=mesh();
    const a=[-halfW,3.10,z],b=[halfW,3.10,z],c=[0,ridgeY-.09,z];
    const aa=[a[0],a[1],back],bb=[b[0],b[1],back],cc=[c[0],c[1],back];
    outwardTriangle(g,a,b,c,[0,0,side]);outwardTriangle(g,aa,bb,cc,[0,0,-side]);
    outwardQuad(g,a,aa,cc,c,[-1,1,0]);outwardQuad(g,c,cc,bb,b,[1,1,0]);outwardQuad(g,b,bb,aa,a,[0,-1,0]);
    add(roof,side>0?'Bidang segitiga fasad':'Bidang segitiga belakang',g,[0,0,0],[1,1,1],cream);
  }
  const inner=[[-2.24,3.17,2.18],[2.24,3.17,2.18],[2.24,3.17,-2.18],[-2.24,3.17,-2.18]];
  const outer=[[-3.15,2.76,2.88],[3.15,2.76,2.88],[3.15,2.76,-2.88],[-3.15,2.76,-2.88]];
  for(let i=0;i<4;i++){
    const j=(i+1)%4,normal=[(outer[i][0]+outer[j][0])/2,1,(outer[i][2]+outer[j][2])/2];
    roofSheet([outer[i],outer[j],inner[j],inner[i]],normal);
    // Thin raised grooves follow the fall of each veranda sheet, not an
    // artificial fan converging to the roof apex.
    for(let k=1;k<35;k++){
      const t=k/35,lerp=(a,b)=>a.map((v,q)=>v+(b[q]-v)*t),a=lerp(outer[i],outer[j]),b=lerp(inner[i],inner[j]);
      const edge=outer[j].map((v,q)=>v-outer[i][q]),len=Math.hypot(...edge),v=edge.map(q=>q/len*.012);
      outwardQuad(corrugation,a.map((q,h)=>q-v[h]+(h===1?.01:0)),a.map((q,h)=>q+v[h]+(h===1?.01:0)),b.map((q,h)=>q+v[h]+(h===1?.01:0)),b.map((q,h)=>q-v[h]+(h===1?.01:0)),normal);
    }
    // Exposed rafters under the overhang connect the wall ring to the fascia.
    for(let k=1;k<7;k++){
      const t=k/7,a=inner[i].map((v,q)=>v+(inner[j][q]-v)*t),b=outer[i].map((v,q)=>v+(outer[j][q]-v)*t);
      const dir=b.map((v,q)=>v-a[q]),len=Math.hypot(...dir),mid=a.map((v,q)=>(v+b[q])/2-(q===1?.13:0));
      // Box segments are oriented along Z, with slope in the roof direction.
      const r=group(roof,'Usuk teritis',mid);r.rotation=[Math.atan2(-dir[1],Math.hypot(dir[0],dir[2])),Math.atan2(dir[0],dir[2]),0];
      add(r,'Kayu usuk','box',[0,0,0],[.05,.075,len],brown);
    }
  }
  // Main corrugation runs ridge → eave with a constant spacing along depth.
  for(let side of [-1,1])for(let k=0;k<55;k++){
    const z=-halfD+.025+k*(2*halfD-.05)/54,w=.012;
    outwardQuad(corrugation,[side*halfW,eaveY+.012,z-w],[side*halfW,eaveY+.012,z+w],[0,ridgeY+.012,z+w],[0,ridgeY+.012,z-w],[side,1,0]);
  }
  batchBox(cap,[0,ridgeY+.025,0],[.10,.075,4.65]);
  add(roof,'Lembaran seng sisi atas',roofTop,[0,0,0],[1,1,1],roofMat);
  add(roof,'Sisi bawah lembaran atap',soffit,[0,0,0],[1,1,1],mat([.43,.43,.37,1],'metal',{shininess:4,specular:.03}));
  add(roof,'Ketebalan lis dan tepi atap',fascia,[0,0,0],[1,1,1],mat([.50,.50,.44,1],'metal'));
  add(roof,'Alur seng mengikuti kemiringan',corrugation,[0,0,0],[1,1,1],mat([.73,.73,.68,1],'metal',{shininess:8,specular:.08}));
  add(roof,'Nok pelana',cap,[0,0,0],[1,1,1],mat([.50,.51,.46,1],'metal'));
  // The red no-entry plate is legible in the reference; avoid inventing text
  // on the much smaller notice below it.
  const notice=group(pavilion,'Rambu merah di depan dinding',[.46,0,1.66]);
  add(notice,'Tiang rambu','cylinder',[0,.94,.14],[.028,1.32,.028],mat([.34,.36,.33,1],'metal'));
  add(notice,'Cakram merah','cylinder',[0,1.67,.16],[.41,.028,.41],mat([.67,.12,.10,1]),[Math.PI/2,0,0]);
  add(notice,'Garis putih rambu','box',[0,1.67,.182],[.30,.064,.012],mat([.90,.89,.80,1]));
  add(notice,'Papan keterangan kecil','box',[0,1.36,.16],[.38,.15,.027],cream);

  return root;
}

export const siteDetailsHierarchy={
  name:'Detail tapak dan pos ronda',description:'Batu kelabu serta pos ronda beratap pelana; gedung besar latar dihapus sesuai koreksi pengguna.',
  children:[{name:'Batu kelabu di pangkal pohon',description:'Fragmen batu dibatch menurut material.',children:[]},
    {name:'Pos ronda beratap pelana',description:'Pondasi → teras → dinding berpintu/jendela → kolom → atap pelana bertingkat lengkap dengan sisi bawah.',children:[]}]
};
