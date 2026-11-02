import {createNode} from '../hierarchy.js';

/**
 * Planting reconstructed from the supplied InfinITS photographs.
 * These are visual plant groups, not botanical species identifications.
 * Leaflets are real tapered geometry; a canopy contains many open sprays,
 * rather than opaque spheres. Shared meshes keep the scene affordable.
 */
export function createVegetation({shore,reservedAreas=[],randomSeed=261101,relocateZ=z=>z,groundHeight=()=>.015,pathCenterline,pathWidth=2.22,groundBounds}={}) {
  const root=createNode('Vegetasi hierarkis');
  const windPivots=[];
  const random=makeRandom(randomSeed);
  const range=(a,b)=>a+(b-a)*random();
  const reserved=reservedAreas.map(polygon=>polygon.map(p=>[p[0],p.length===3?p[2]:p[1]]));
  const clearOfAccess=(x,z)=>!reserved.some(polygon=>inPolygon(x,z,polygon)||nearestEdge(x,z,polygon)<.22);
  const plantClear=(x,z)=>!reserved.some(polygon=>inPolygon(x,z,polygon)||nearestEdge(x,z,polygon)<1.2);
  const relocate=([x,oldZ,...rest])=>{
    const z=relocateZ(oldZ);
    if(plantClear(x,z))return [x,z,...rest];
    // Preserve the existing plant and its local geometry, but keep its roots
    // beyond the relocated playground, terrace and walking surfaces.
    for(let radius=1;radius<=12;radius+=.5)for(let i=0;i<16;i++){
      const a=i/16*Math.PI*2,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
      if((groundBounds?(px<groundBounds.minX+7||px>groundBounds.maxX-7||pz<groundBounds.minZ+7||pz>groundBounds.maxZ-7):Math.abs(px)>37)||!plantClear(px,pz)||(shore?.length&&inPolygon(px,pz,shore)))continue;
      return [px,pz,...rest];
    }
    throw new Error('No clear planting position beside the revised path');
  };
  const tau=Math.PI*2;
  const materials={
    bark:{color:[.42,.39,.33,1],texture:'bark',uvScale:[2,4],specular:.035,shininess:6},
    barkPale:{color:[.50,.47,.39,1],texture:'bark',uvScale:[2,4],specular:.025,shininess:5},
    soil:{color:[.38,.32,.25,1],texture:'soil',uvScale:[2,2],specular:0,shininess:2},
    leafDark:foliage([.18,.29,.105,1]),leafMid:foliage([.27,.39,.14,1]),
    leafLight:foliage([.36,.46,.19,1]),leafOlive:foliage([.31,.38,.16,1]),
    lime:foliage([.55,.61,.18,1]),limeLight:foliage([.66,.66,.25,1]),
    strap:foliage([.58,.61,.19,1]),strapLight:foliage([.71,.68,.28,1]),
    red:foliage([.30,.17,.15,1]),redLight:foliage([.41,.23,.20,1]),
    palm:foliage([.29,.40,.12,1]),palmLight:foliage([.40,.48,.17,1]),
    reed:foliage([.45,.48,.25,1]),cream:foliage([.75,.75,.44,1]),
    grass:foliage([.34,.42,.20,1]),grassDry:foliage([.42,.45,.25,1]),
    litter:{color:[.37,.31,.21,1],texture:'leaf',doubleSided:true,specular:0,shininess:2}
  };
  function foliage(color) {
    return {color,texture:'leaf',foliage:true,doubleSided:true,shininess:5,specular:.02};
  }
  function group(parent,name,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1]) {
    const node=createNode(name,{position,rotation,scale});parent.add(node);return node;
  }
  function add(parent,name,mesh,material,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]) {
    const node=createNode(name,{mesh,material,position,scale,rotation});parent.add(node);return node;
  }
  const geometryRandom=makeRandom(randomSeed^0x9e3779b9);
  const sprayMeshes=Array.from({length:3},(_,i)=>leafSpray(makeRandom(randomSeed+731*i+74)));
  const broadSprayMeshes=Array.from({length:2},(_,i)=>leafSpray(makeRandom(randomSeed+981*i+92),true));
  const trunkMeshes=Array.from({length:3},(_,i)=>{
    const bend=(i-1)*.025;
    return tube([[0,0,0],[.015,.09,-.01],[.025+bend,.22,.015],[.013+bend,.36,.012],[.025+bend,.49,0]],
      [.047,.039,.032,.026,.019],9);
  });
  const rootMeshes=Array.from({length:2},(_,variant)=>{
    const mesh=emptyMesh();
    for(let i=0;i<7;i++){
      const a=i/7*tau+variant*.4;
      append(mesh,tube([[0,.48,0],[.5,.15,0],[1.38,.035,.07]],[.21,.12,.008],6),
        p=>rotateY(p,a));
    }
    return mesh;
  });
  const branchMesh=tube([[0,0,0],[.20,.36,.02],[.55,.71,-.035],[1,1,.065]], [.043,.032,.020,.006],7);
  const twigMesh=tube([[0,0,0],[.30,.30,-.035],[.68,.48,.02],[1,.55,.10]], [.032,.021,.012,.0025],6);
  const soilMesh=soilPatch(geometryRandom);
  const treePositions=[
    [-33,-16,13.4,5.8],[-22,-21,14.4,6.1],[-10,-23,13.6,5.8],
    [3,-25,14.5,6.1],[15,-22,14.0,6.2],[34,-21,12.9,5.3],
    [33,-11,14.0,5.9],[35,0,13.2,5.5],[34,10,13.5,5.6],
    [31,22,13.9,6.0],[-31,22,14.3,6.4],[-34,12,13.0,5.5],
    [-34,0,12.9,5.8],[-34,-9,14.1,5.9],[-24,10,12.4,5.4],
    [22,-24,12.6,5.5],[-18,-25,8.8,3.6],[12,-25,9.3,3.8]
  ].map(relocate);

  for(let index=0;index<treePositions.length;index++){
    const [x,z,height,spread]=treePositions[index];
    const broadLeaf=index>=16;
    const phase=range(0,tau),trunkVariant=index%trunkMeshes.length;
    const tree=group(root,'Pohon peneduh',[x,.035,z],[0,range(-.5,.5),0]);
    add(tree,'Tanah di bawah pohon',soilMesh,materials.soil,[0,.008,0],[range(1.15,1.7),1,range(1.1,1.5)]);
    const trunk=group(tree,'Batang');
    add(trunk,'Batang utama',trunkMeshes[trunkVariant],index%4===0?materials.barkPale:materials.bark,[0,0,0],[height,height,height]);
    add(trunk,'Akar melebar',rootMeshes[index%2],materials.bark,[0,0,0],[height/13,1,height/13]);
    // A fork supports four broad horizontal limbs. Each fork has its own
    // rest rotation; animation never accumulates an error frame by frame.
    for(let b=0;b<4;b++){
      const yaw=phase+b*tau/4+range(-.23,.23);
      const length=spread*range(.60,.87),rise=height*range(.23,.31);
      const start=[height*(.018+(trunkVariant-1)*.019),height*range(.36,.43),0];
      const branch=group(trunk,'Cabang utama',start,[range(-.04,.04),yaw,range(-.035,.035)]);
      add(branch,'Kayu cabang melengkung',branchMesh,materials.bark,[0,0,0],[length,rise,length]);
      windPivots.push({node:branch,base:[...branch.rotation],phase:phase+b*1.81,amount:.009,rate:.58});
      for(let t=0;t<2;t++){
        const along=.48+t*.35;
        const twig=group(branch,'Ranting',[length*along,rise*(.66+t*.25),length*.025],
          [range(-.13,.05),(t?-.63:.72)+range(-.16,.16),range(-.07,.07)]);
        const twigLength=spread*range(.38,.53);
        add(twig,'Kayu ranting meruncing',twigMesh,materials.bark,[0,0,0],[twigLength,1.65,twigLength]);
        windPivots.push({node:twig,base:[...twig.rotation],phase:phase+b*1.4+t*2.3,amount:.018,rate:.86});
        const canopy=group(twig,'Daun kanopi',[twigLength*.80,.94,twigLength*.055]);
        for(let s=0;s<2;s++){
          const scale=broadLeaf?range(.73,.96):range(.93,1.24),material=[materials.leafDark,materials.leafMid,materials.leafDark,materials.leafOlive,materials.leafLight][(index+b+t+s)%5];
          add(canopy,'Rumpun daun',broadLeaf?broadSprayMeshes[(b+s)%2]:sprayMeshes[(index+b+s)%3],material,
            [s?-.62:.38,s?range(-.83,-.48):range(.20,.58),s?.59:-.44],
            [scale,range(1.10,1.42),scale],
            [range(-.36,.36),range(0,tau),range(-.26,.26)]);
        }
      }
    }
  }

  // Dense but broken mid-height foliage across the far shore matches the
  // green backdrop in the photos. Keep the small pavilion opening clear.
  const understory=group(root,'Vegetasi rapat lapisan tengah latar');
  const understoryLocations=[[-33,-24],[-27,-25],[-21,-24],[-15,-25],[-9,-24],[-3,-25],[3,-24],[9,-25],[15,-24],[33,-24]].map(relocate);
  for(let i=0;i<understoryLocations.length;i++){
    const [x,z]=understoryLocations[i],size=range(.86,1.16);
    const bush=group(understory,'Pohon kecil berdaun rapat',[x,.035,z],[0,range(0,tau),0],[size,size,size]);
    add(bush,'Batang lapisan tengah',twigMesh,materials.barkPale,[0,0,0],[.54,4.0,.54]);
    const crown=group(bush,'Kanopi lapisan tengah');
    for(let layer=0;layer<3;layer++){
      const scale=range(.83,1.04),offset=layer===0?-.45:layer===1?.48:0;
      add(crown,'Rumpun daun latar',broadSprayMeshes[(i+layer)%2],
        [materials.leafDark,materials.leafMid,materials.leafOlive][(i+layer)%3],
        [offset,1.32+layer*.94,layer%2?.24:-.14],
        [scale,range(1.15,1.55),scale],
        [range(-.30,.30),range(0,tau),range(-.20,.20)]);
    }
    windPivots.push({node:crown,base:[0,0,0],phase:i*1.19,amount:.012,rate:.78});
  }

  const beds=group(root,'Lapisan tanaman bawah');
  const strapMeshes=[strapClump(makeRandom(randomSeed+19),.95,1.15,28),strapClump(makeRandom(randomSeed+42),.74,.86,24)];
  const redMesh=rosette(makeRandom(randomSeed+39),.86,1.25,22);
  const hedgeMesh=hedgeSpray(makeRandom(randomSeed+71));
  const shorePlant=shoreRosettes(makeRandom(randomSeed+144));
  const palmFrond=pinnateFrond(2.15,.68,22);
  const fernFrond=pinnateFrond(1.08,.39,17);
  const palmTrunk=tube([[0,0,0],[.03,.55,.02],[.10,1.15,.06]], [.13,.095,.065],8);

  // Narrow, bright strap-leaf rings at several trunks are particularly
  // recognizable in photos IMG_164620 and video_165047.
  const yellowBeds=[[-31,22,1.45],[31,22,1.5],[-24,10,1.22],[-34,0,1.15],
    [-22,-21,1.2],[15,-22,1.15],[34.5,9,1.1],[-34.5,2,1.12]].map(relocate);
  for(let i=0;i<yellowBeds.length;i++){
    const [x,z,size]=yellowBeds[i],bed=group(beds,'Bed daun pita kuning',[x,.07,z]);
    add(bed,'Tanah bed melingkar',soilMesh,materials.soil,[0,-.018,0],[size,1,size]);
    for(let j=0;j<6;j++){
      const a=j/6*tau+range(-.2,.2),r=size*.68;
      add(bed,'Rumpun daun kuning',strapMeshes[j%2],j%3?materials.strap:materials.strapLight,
        [Math.cos(a)*r,0,Math.sin(a)*r],[.62,.73,.62],[0,range(0,tau),0]);
    }
  }

  // Burgundy upright rosettes and palm/fern beds occur along both paths.
  const redLocations=[[-29,16,1.0],[34,18,1.0],[-35,-7,.9],[29,-12,.8],[-29,-19,.8],[-30,7,.85],[20,-23,.75]].map(relocate);
  redLocations.forEach(([x,z,s],i)=>{
    const plant=group(beds,'Semak daun merah',[x,.06,z],[0,range(0,tau),0],[s,s,s]);
    add(plant,'Daun tegak berlapis',redMesh,i%2?materials.red:materials.redLight);
  });
  const palmLocations=[[-26,18,.90],[23.5,22.8,.88],[-29,8,.82],[31,-4,.81],[-24,-19,.68],[17,-20,.71],
    [-15.6,5.8,1.08],[7.8,10.5,.68],[-27.5,-17,.78],[22,-18,.78]].map(relocate);
  palmLocations.forEach(([x,z,s],index)=>{
    const palm=group(beds,'Palem hias',[x,.055,z],[0,index*.91,0],[s,s,s]);
    add(palm,'Batang palem beruas',palmTrunk,materials.barkPale);
    const crown=group(palm,'Mahkota palem',[.1,1.14,.06]);
    for(let i=0;i<14;i++){
      // Pelepah dalam tegak, pelepah luar melengkung; profil palem berisi
      // seperti foto tepian, dengan celah di antara anak-anak daunnya.
      const upright=i%3===0;
      const frond=add(crown,'Pelepah beranak daun',palmFrond,i%3?materials.palm:materials.palmLight,[0,0,0],upright?[.75,2,.75]:[1,1,1],
        [range(-.15,.08),i/14*tau,range(-.12,.12)]);
      windPivots.push({node:frond,base:[...frond.rotation],phase:index+i*.81,amount:.027,rate:1.03});
    }
  });
  const fernLocations=[[-26,10,1.05],[-28,17,1.0],[34,14,.95],[31,7,.8],[-30,-17,.95],[22,-22,.85],[-35.8,-2,.88],[29,-9,.85]].map(relocate);
  fernLocations.forEach(([x,z,s],index)=>{
    const fern=group(beds,'Rumpun pakis',[x,.06,z],[0,index,0],[s,s,s]);
    for(let i=0;i<8;i++)add(fern,'Ental pakis',fernFrond,i%3?materials.palm:materials.palmLight,[0,.16,0],[1,1,1],[-.25+range(-.10,.08),i/8*tau,0]);
  });

  const outline=shore?.length?shore:defaultShore();
  const edgePoint=(index,offset)=>{
    const p=outline[(index+outline.length)%outline.length],a=outline[(index+outline.length-1)%outline.length],b=outline[(index+1)%outline.length];
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
    return [p[0]+dz/length*offset,p[1]-dx/length*offset];
  };
  const shoreBed=group(beds,'Tanaman daun pedang pucat tepian');
  // Full-resolution IMG_164126 shows stiff pale strap-leaf rosettes on thin
  // woody stems, with bare soil between plants. Avoid mistaking them for reeds.
  const plumeAngles=[.22,.27,.33,.38,.43,.50,.56,.61,.66,.72,.79, .92,1.02,1.12,1.20,1.33,1.44,1.58];
  for(let i=0;i<plumeAngles.length;i++){
    const angle=plumeAngles[i]*Math.PI,index=Math.floor(angle/tau*outline.length)%outline.length;
    const p=edgePoint(index,range(.65,1.32)),size=range(.78,1.13);
    if(!clearOfAccess(p[0],p[1]))continue;
    const tuft=group(shoreBed,'Rumpun daun pedang variegata',[p[0],.025,p[1]],[0,range(0,tau),0],[size,size,size]);
    add(tuft,'Tanah terbuka tepian',soilMesh,materials.soil,[0,-.005,0],[.78,1,.55]);
    add(tuft,'Batang tipis tanaman tepian',shorePlant.stems,materials.barkPale);
    const leaves=group(tuft,'Roset daun tepian');
    add(leaves,'Tepi daun kuning pucat',shorePlant.outer,materials.cream);
    add(leaves,'Garis tengah daun hijau',shorePlant.inner,materials.reed);
    windPivots.push({node:leaves,base:[0,0,0],phase:i*.76,amount:.022,rate:.91});
  }
  const border=group(beds,'Border semak rendah mengikuti jalur');
  let pathShrubs=0;
  if(pathCenterline?.length>1){
    const clearBorder=(x,z)=>!inPolygon(x,z,outline)&&!reserved.some(p=>inPolygon(x,z,p)||nearestEdge(x,z,p)<.80);
    const paints=[materials.lime,materials.limeLight,materials.redLight],batches=paints.map(()=>[]);
    let walked=0,next=.7,index=0;
    for(let i=1;i<pathCenterline.length;i++){
      const a=pathCenterline[i-1],b=pathCenterline[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      while(next<=walked+length){
        const t=(next-walked)/length;
        for(const side of [-1,1]){
          const setback=pathWidth/2+1.0,x=a[0]+dx*t+side*dz/length*setback,z=a[1]+dz*t-side*dx/length*setback;
          if(!clearBorder(x,z))continue;
          const size=range(1.0,1.12),height=range(1.15,1.55),yaw=range(0,tau),paint=index%29<3?2:index%4===0?1:0;
          const list=batches[paint];
          if(!list.length||list.at(-1).positions.length+hedgeMesh.positions.length>120000)list.push(emptyMesh());
          const y=groundHeight(x,z)+.01;
          append(list.at(-1),hedgeMesh,p=>{const q=rotateY([p[0]*size,p[1]*height,p[2]*size],yaw);return [q[0]+x,q[1]+y,q[2]+z];},n=>rotateY([n[0]/size,n[1]/height,n[2]/size],yaw));
          pathShrubs++;
        }
        next+=.58;index++;
      }
      walked+=length;
    }
    batches.forEach((list,paint)=>list.forEach((m,i)=>add(border,`Semak rapat tepi jalan · ${paint}-${i}`,m,paints[paint])));
  }else{
  for(let i=0;i<96;i++){
    const index=Math.floor(i/96*outline.length),p=edgePoint(index,5.14);
    if(!clearOfAccess(p[0],p[1]))continue;
    // Keep the entrance/ramp approach and gym threshold open.
    if(p[1]>8.0&&p[0]>-25&&p[0]<26)continue;
    if(p[0]>21&&p[1]>relocateZ(3)-5&&p[1]<relocateZ(3)+5)continue;
    const scale=range(.78,1.12);
    add(border,'Semak border hijau limau',hedgeMesh,i%5===0?materials.limeLight:materials.lime,
      [p[0],.08,p[1]],[scale,range(.72,1.0),scale],[0,range(0,tau),0]);
    // The photographs also show a thin reddish strip beside the paving.
    if(i%2===0&&p[0]<-18){
      const inner=edgePoint(index,1.52);
      add(border,'Border daun merah rendah',hedgeMesh,materials.redLight,
        [inner[0],.10,inner[1]],[.72,.62,.62],[0,range(0,tau),0]);
    }
  }
  }

  const lawn=group(root,'Rumput halaman & daun gugur');
  const lawnMeshes=[emptyMesh(),emptyMesh(),emptyMesh()],litter=emptyMesh();
  const safeGround=(x,z)=>{
    if(!clearOfAccess(x,z))return false;
    if(groundBounds){if(x<groundBounds.minX+7||x>groundBounds.maxX-7||z<groundBounds.minZ+7||z>groundBounds.maxZ-7)return false;}else if(Math.abs(x)>36.9||z<relocateZ(-25.3)||z>25.3||(Math.abs(x)>34.5&&(z<relocateZ(-23.5)||z>23.5)))return false;
    if(inPolygon(x,z,outline)||nearestEdge(x,z,outline)<4.87)return false;
    if(z>10.0&&z<24.3&&x>-23.8&&x<24.5)return false;
    if(Math.hypot(x-27,z-relocateZ(3))<4.9||Math.hypot(x-25,z-relocateZ(-19))<4.4)return false;
    return true;
  };
  let lawnTufts=0;
  for(let attempt=0;attempt<24000&&lawnTufts<2200;attempt++){
    const x=groundBounds?range(groundBounds.minX+7,groundBounds.maxX-7):range(-37,37),z=groundBounds?range(groundBounds.minZ+7,groundBounds.maxZ-7):range(relocateZ(-25.4),25.4);
    if(!safeGround(x,z))continue;
    const patch=.5+.24*Math.sin(x*.54+z*.19)+.17*Math.sin(z*.81-x*.28);
    if(random()>patch)continue;
    const mesh=lawnMeshes[lawnTufts%3],height=range(.055,.20);
    for(let b=0;b<3;b++){
      const a=range(0,tau),len=height*range(.7,1.2),width=range(.007,.015);
      blade(mesh,[x,.032,z],a,len,width,{rise:len,reach:len*.45,bend:len*.15,segments:2});
    }
    lawnTufts++;
  }
  lawnMeshes.forEach((mesh,i)=>add(lawn,'Brins rumput pendek',mesh,i===1?materials.grassDry:materials.grass));
  // A few dry leaves under the crowns make the lawn less uniformly green.
  for(let i=0;i<730;i++){
    const tree=treePositions[i%treePositions.length],a=range(0,tau),r=Math.sqrt(random())*range(2.5,5.2);
    const x=tree[0]+Math.cos(a)*r,z=tree[1]+Math.sin(a)*r;
    if(!safeGround(x,z))continue;
    leaflet(litter,[x,.038,z],range(0,tau),range(.08,.19),range(.025,.055),range(-.07,.07));
  }
  add(lawn,'Daun kering tersebar',litter,materials.litter);

  const groundPlants=new Set(['Pohon peneduh','Pohon kecil berdaun rapat','Bed daun pita kuning','Semak daun merah','Palem hias','Rumpun pakis','Rumpun daun pedang variegata','Semak border hijau limau','Border daun merah rendah','Semak rapat tepi jalan']);
  const settle=n=>{if(groundPlants.has(n.name))n.position[1]+=groundHeight(n.position[0],n.position[2])-.015;else n.children.forEach(settle);};
  settle(root);
  const hierarchy={name:'Vegetasi hierarkis',description:'18 pohon berkanopi terbuka, tanaman daun pita, border rendah, semak merah, palem/pakis dan roset daun pedang pucat sesuai kelompok visual pada foto.',children:[
    {name:'Pohon peneduh',description:'Batang melengkung dan akar melebar, dengan kanopi berongga dari geometri anak daun.',children:[
      {name:'Batang',description:'Batang utama dan flare akar berbentuk mesh meruncing.',children:[
        {name:'Cabang utama ↻',description:'Ayunan lokal kecil; semua ranting dan daun turunannya ikut bergerak.',children:[
          {name:'Ranting ↻',description:'Poros kedua memberi kelenturan yang berbeda fase.',children:[
            {name:'Daun kanopi',description:'Rumpun daun majemuk dibatch menjadi mesh bersama, bukan bola.',children:[]}]}]}]}]},
    {name:'Vegetasi rapat lapisan tengah latar',description:'Sepuluh pohon kecil berdaun lebar mengisi celah di bawah tajuk tinggi pada sisi seberang danau.',children:[]},
    {name:'Lapisan tanaman bawah',description:'Bed kuning di pangkal batang, semak limau/merah sepanjang jalur, palem dan pakis kecil.',children:[
      {name:'Palem hias',description:'Batang → mahkota → pelepah beranak daun yang bergoyang.',children:[]},
      {name:'Tanaman daun pedang pucat tepian',description:'Batang tipis berkayu → roset daun sempit bertepi kuning pucat, ditanam berjarak di tanah tepian.',children:[]}]},
    {name:'Semak rapat sepanjang jalan',description:'Dua baris tanaman rendah hijau, kuning dan aksen merah mengikuti jalur dengan jarak rapat; paving serta fasilitas tetap bebas.',children:[]},
    {name:'Rumput halaman & daun gugur',description:'Rumput pendek tidak merata dan daun kering yang dibatch; tidak menutupi paving atau air.',children:[]}
  ]};
  function update(timeSeconds,state={}) {
    const wind=Math.max(0,state.windStrength??1);
    for(const pivot of windPivots){
      const sway=Math.sin(timeSeconds*pivot.rate+pivot.phase)*.75+Math.sin(timeSeconds*pivot.rate*.47+pivot.phase*1.7)*.25;
      pivot.node.rotation[0]=pivot.base[0]+sway*pivot.amount*wind;
      pivot.node.rotation[1]=pivot.base[1];
      pivot.node.rotation[2]=pivot.base[2]+Math.cos(timeSeconds*pivot.rate*.72+pivot.phase)*pivot.amount*.63*wind;
    }
  }
  const meshes=new Set();let nodes=0,triangles=0;
  const count=node=>{nodes++;if(node.mesh&&typeof node.mesh==='object'){meshes.add(node.mesh);triangles+=node.mesh.indices.length/3;}node.children.forEach(count);};
  count(root);
  const metrics={trees:treePositions.length,understoryTrees:understoryLocations.length,nodes,triangles,uniqueMeshes:meshes.size,lawnTufts,pathShrubs,leafSprays:treePositions.length*16+understoryLocations.length*3,animatedPivots:windPivots.length};
  update(0,{windStrength:0});
  return {root,update,hierarchy,metrics};
}

function makeRandom(seed){let state=seed>>>0;return()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};}
function emptyMesh(){return {positions:[],normals:[],uvs:[],indices:[]};}
function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function normalize(v){const length=Math.hypot(...v)||1;return v.map(x=>x/length);}
function rotateY(p,a){const c=Math.cos(a),s=Math.sin(a);return[c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]];}
function triangle(mesh,a,b,c,uvA=[0,0],uvB=[.5,1],uvC=[1,0]){
  let normal=cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i]));
  if(Math.hypot(...normal)<1e-10)return;
  // Give the visible upper leaf surface its outward normal, and omit the
  // zero-area endpoint triangle where a curved ribbon tapers to a point.
  if(normal[1]<0){[b,c]=[c,b];[uvB,uvC]=[uvC,uvB];normal=normal.map(v=>-v);}
  normal=normalize(normal);const start=mesh.positions.length/3;
  for(const [p,uv] of [[a,uvA],[b,uvB],[c,uvC]]){mesh.positions.push(...p);mesh.normals.push(...normal);mesh.uvs.push(...uv);}
  mesh.indices.push(start,start+1,start+2);
}
function append(target,source,transform=p=>p,transformNormal=transform){
  const offset=target.positions.length/3;
  for(let i=0;i<source.positions.length;i+=3)target.positions.push(...transform(source.positions.slice(i,i+3)));
  // Normals use their own inverse scale/rotation when positions are translated.
  for(let i=0;i<source.normals.length;i+=3)target.normals.push(...normalize(transformNormal(source.normals.slice(i,i+3))));
  target.uvs.push(...source.uvs);source.indices.forEach(index=>target.indices.push(index+offset));
}
function tube(points,radii,sides=7){
  const mesh=emptyMesh();let distance=0;
  for(let i=0;i<points.length;i++){
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
    const tangent=normalize(next.map((v,k)=>v-prev[k])),reference=Math.abs(tangent[1])>.9?[0,0,1]:[0,1,0];
    const u=normalize(cross(tangent,reference)),v=normalize(cross(tangent,u));
    if(i)distance+=Math.hypot(...points[i].map((value,k)=>value-points[i-1][k]));
    for(let j=0;j<=sides;j++){
      const angle=j/sides*Math.PI*2,normal=u.map((value,k)=>value*Math.cos(angle)+v[k]*Math.sin(angle));
      mesh.positions.push(...points[i].map((value,k)=>value+normal[k]*radii[i]));mesh.normals.push(...normal);mesh.uvs.push(j/sides,distance);
      if(i&&j<sides){const a=(i-1)*(sides+1)+j,b=a+1,c=i*(sides+1)+j+1,d=c-1;mesh.indices.push(a,b,c,a,c,d);}
    }
  }
  // Kayu merupakan volume: ujung batang, akar, dan ranting ditutup juga
  // ketika diamati dari bawah atau ketika kanopi tidak menutup sambungan.
  for(const [row,sign] of [[0,-1],[points.length-1,1]]){
    const near=points[row===0?1:row-1],center=points[row];
    const tangent=normalize(row===0?near.map((v,k)=>v-center[k]):center.map((v,k)=>v-near[k]));
    const normal=tangent.map(v=>v*sign),at=mesh.positions.length/3;
    mesh.positions.push(...center);mesh.normals.push(...normal);mesh.uvs.push(.5,.5);
    for(let j=0;j<=sides;j++){
      mesh.positions.push(...mesh.positions.slice((row*(sides+1)+j)*3,(row*(sides+1)+j)*3+3));
      mesh.normals.push(...normal);mesh.uvs.push(.5+.5*Math.cos(j/sides*Math.PI*2),.5+.5*Math.sin(j/sides*Math.PI*2));
    }
    for(let j=0;j<sides;j++){
      const a=mesh.positions.slice((at+1+j)*3,(at+1+j)*3+3),b=mesh.positions.slice((at+2+j)*3,(at+2+j)*3+3);
      const orientation=cross(a.map((v,k)=>v-center[k]),b.map((v,k)=>v-center[k])).reduce((sum,v,k)=>sum+v*normal[k],0);
      if(orientation>0)mesh.indices.push(at,at+1+j,at+2+j);else mesh.indices.push(at,at+2+j,at+1+j);
    }
  }
  return mesh;
}

/** A shallow folded lanceolate leaflet: four triangles around a raised midrib. */
function leaflet(mesh,base,angle,length,width,lift=.04){
  const along=[Math.cos(angle),0,Math.sin(angle)],side=[-along[2],0,along[0]];
  const tip=base.map((v,k)=>v+along[k]*length+(k===1?lift:0));
  const center=base.map((v,k)=>v+along[k]*length*.46+(k===1?lift*.7+width*.24:0));
  const left=center.map((v,k)=>v+side[k]*width-(k===1?width*.24:0));
  const right=center.map((v,k)=>v-side[k]*width-(k===1?width*.24:0));
  triangle(mesh,base,center,left,[.5,0],[.5,.46],[0,.46]);
  triangle(mesh,left,center,tip,[0,.46],[.5,.46],[.5,1]);
  triangle(mesh,tip,center,right,[.5,1],[.5,.46],[1,.46]);
  triangle(mesh,right,center,base,[1,.46],[.5,.46],[.5,0]);
}
function leafSpray(random,broadLeaf=false){
  const mesh=emptyMesh();
  for(let shoot=0;shoot<12;shoot++){
    const azimuth=random()*Math.PI*2,rad=Math.sqrt(random())*(broadLeaf?1.14:1.38);
    // Three staggered depth layers create irregular leafy volumes and gaps,
    // rather than one flat horizontal disk at each branch endpoint.
    const origin=[Math.cos(azimuth)*rad,(shoot%3-1)*.31+(random()-.5)*.26,Math.sin(azimuth)*rad*.82];
    const direction=azimuth+(random()-.5)*1.5,length=.65+random()*.70;
    const slope=(random()-.4)*.40;
    // Paired narrow leaflets give the compound-leaf silhouette in the photos.
    for(let pair=0;pair<7;pair++)for(const sign of [-1,1]){
      const t=(pair+.5)/7,base=[origin[0]+Math.cos(direction)*length*t,origin[1]+Math.sin(t*Math.PI)*.13+slope*t,origin[2]+Math.sin(direction)*length*t];
      leaflet(mesh,base,direction+sign*(.83+random()*.36),
        (broadLeaf?.31:.26)+random()*(broadLeaf?.19:.19),
        (broadLeaf?.095:.065)+random()*(broadLeaf?.055:.040),(random()-.3)*.17);
    }
    leaflet(mesh,[origin[0]+Math.cos(direction)*length,origin[1]+slope+.02,origin[2]+Math.sin(direction)*length],direction,broadLeaf?.43:.37,broadLeaf?.13:.085,.06);
  }
  return mesh;
}
function blade(mesh,base,angle,length,width,{rise=length*.75,reach=length*.7,bend=length*.22,segments=6}={}){
  const direction=[Math.cos(angle),0,Math.sin(angle)],side=[-direction[2],0,direction[0]];
  const point=(t,sign)=>{
    const w=width*Math.pow(Math.sin(Math.PI*t),.64);
    return [base[0]+direction[0]*reach*t+side[0]*w*sign,
      base[1]+rise*t+bend*Math.sin(Math.PI*t)-rise*.28*t*t,
      base[2]+direction[2]*reach*t+side[2]*w*sign];
  };
  for(let j=0;j<segments;j++){
    const t0=j/segments,t1=(j+1)/segments,a=point(t0,-1),b=point(t0,1),c=point(t1,1),d=point(t1,-1);
    triangle(mesh,a,d,c,[0,t0],[0,t1],[1,t1]);triangle(mesh,a,c,b,[0,t0],[1,t1],[1,t0]);
  }
}
function strapClump(random,radius,height,count){
  const mesh=emptyMesh();
  for(let i=0;i<count;i++){
    const a=i*2.399963+random()*.36,r=Math.sqrt(random())*radius*.30;
    const base=[Math.cos(a)*r,random()*.035,Math.sin(a)*r];
    const h=height*(.67+random()*.55),reach=radius*(.47+random()*.70);
    blade(mesh,base,a,h,.035+random()*.035,{rise:h,reach,bend:h*.48,segments:6});
  }
  return mesh;
}
function rosette(random,radius,height,count){
  const mesh=emptyMesh();
  for(let i=0;i<count;i++){
    const a=i*2.399963,level=i/count;
    const h=height*(.35+level*.68),reach=radius*(1.05-level*.60);
    blade(mesh,[0,level*height*.34,0],a,h,.085+random()*.075,{rise:h,reach,bend:h*.22,segments:5});
  }
  return mesh;
}
function hedgeSpray(random){
  const mesh=emptyMesh();
  for(let i=0;i<43;i++){
    const a=random()*Math.PI*2,r=Math.sqrt(random())*.40;
    leaflet(mesh,[Math.cos(a)*r,.10+random()*.26,Math.sin(a)*r],random()*Math.PI*2,.16+random()*.11,.045+random()*.025,(random()-.4)*.10);
  }
  return mesh;
}
function pinnateFrond(length,width,pairs){
  const mesh=emptyMesh();
  // Narrow rachis with many separated long leaflets, unlike a solid paddle.
  blade(mesh,[0,0,0],0,length,.012,{rise:length*.24,reach:length,bend:length*.25,segments:12});
  for(let i=0;i<pairs;i++){
    const t=(i+.6)/(pairs+1),x=t*length,y=length*(.24*t+.25*Math.sin(t*Math.PI)-.24*.28*t*t);
    const leafletLength=width*Math.pow(Math.sin(t*Math.PI),.72)*(1.07-t*.21);
    for(const sign of [-1,1]){
      const angle=sign*(1.05-.40*t),base=[x,y,0];
      blade(mesh,base,angle,leafletLength,.023,{rise:-leafletLength*.24,reach:leafletLength,bend:leafletLength*.13,segments:3});
    }
  }
  return mesh;
}
function shoreRosettes(random){
  const outer=emptyMesh(),inner=emptyMesh(),stems=emptyMesh();
  for(let plant=0;plant<3;plant++){
    const azimuth=plant*2.399963,radius=plant?.27:0;
    const x=Math.cos(azimuth)*radius,z=Math.sin(azimuth)*radius,height=.40+random()*.22;
    append(stems,tube([[x,0,z],[x+.015,height*.57,z-.01],[x+.035,height,z]], [.027,.020,.012],6));
    for(let leaf=0;leaf<15;leaf++){
      const angle=leaf*2.399963+plant*.7,level=leaf/15;
      const length=.46+random()*.27,base=[x+.035,height+level*.09,z];
      const rise=.34+level*.25,reach=.41-level*.18;
      blade(outer,base,angle,length,.023+random()*.012,{rise,reach,bend:.075,segments:5});
      blade(inner,[base[0],base[1]+.004,base[2]],angle,length,.010+random()*.005,{rise,reach,bend:.075,segments:5});
    }
  }
  return {outer,inner,stems};
}
function soilPatch(random){
  const mesh=emptyMesh(),center=[0,0,0],segments=23;
  const ring=Array.from({length:segments},(_,i)=>{const a=i/segments*Math.PI*2,r=.88+random()*.16;return[Math.cos(a)*r,0,Math.sin(a)*r];});
  for(let i=0;i<segments;i++)triangle(mesh,center,ring[(i+1)%segments],ring[i]);
  return mesh;
}
function defaultShore(){return Array.from({length:112},(_,i)=>{const t=i/112*Math.PI*2;return[-4+23*Math.cos(t),-4+10.8*Math.sin(t)*Math.sqrt(.48+.88*Math.abs(Math.cos(t)))];});}
function inPolygon(x,z,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++)if((points[i][1]>z)!==(points[j][1]>z)&&x<(points[j][0]-points[i][0])*(z-points[i][1])/(points[j][1]-points[i][1])+points[i][0])inside=!inside;return inside;}
function nearestEdge(x,z,points){let result=Infinity;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));result=Math.min(result,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));}return result;}
