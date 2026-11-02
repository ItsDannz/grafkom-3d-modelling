import {createNode} from '../hierarchy.js';
import { createEntrance } from './entrance.js?v=blue-route-final-20261102';
import { createParkObjects } from './park-objects.js';
import { createTerrain } from './terrain.js';
import { SITE_LEVELS as L } from './site-levels.js';
import { createSitePlan } from './site-plan.js?v=blue-route-final-20261102';
import { createLakesidePlatform } from './lakeside-platform.js';
import { createConnections } from './connections.js';
import { createLakesideSeating } from './lakeside-seating.js';
import { createVegetation } from './vegetation.js';
import { createSiteDetails, siteDetailsHierarchy } from './site-details.js';

// The photographs define the vocabulary and layout of this bounded reconstruction.
// Dimensions are approximate metres; fitness motion is illustrative, not a measured mechanism.
export function createInfinitsScene() {
  const root = createNode('InfinITS Park');
  const palette = {
    grass:[.43,.48,.29,1], bank:[.32,.36,.22,1], water:[.22,.24,.14,1],
    blue:[.035,.33,.65,1], yellow:[.97,.70,.12,1], concrete:[.65,.65,.60,1],
    bark:[.40,.36,.29,1], metal:[.15,.19,.19,1], paving:[.66,.64,.58,1]
  };
  const material = (color,texture='none', extra={}) => ({color,texture,shininess:12,specular:.11,...extra});
  const add = (parent,name,mesh,position,scale,mat,rotation=[0,0,0]) => {
    const node = createNode(name,{mesh,position,scale,material:mat,rotation});
    // Assign explicitly as well, keeping this scene compatible with the small teaching engine.
    Object.assign(node,{mesh,position,scale,material:mat,rotation}); parent.add(node); return node;
  };
  const group = (parent,name,position=[0,0,0],rotation=[0,0,0]) => {
    const node = createNode(name,{position,rotation}); node.position=position;node.rotation=rotation;parent.add(node);return node;
  };
  const mesh = () => ({positions:[],normals:[],uvs:[],indices:[]});
  const quad = (m,a,b,c,d,n,uv=[[0,0],[1,0],[1,1],[0,1]]) => {
    const i=m.positions.length/3;
    const ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);
    const cross=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    const reverse=cross.reduce((sum,v,k)=>sum+v*n[k],0)<0;
    const vertices=reverse?[a,d,c,b]:[a,b,c,d],coords=reverse?[uv[0],uv[3],uv[2],uv[1]]:uv;
    for(let k=0;k<4;k++){m.positions.push(...vertices[k]);m.normals.push(...n);m.uvs.push(...coords[k]);}
    m.indices.push(i,i+1,i+2,i,i+2,i+3);
  };
  const fanMesh = (points,y) => {
    const m=mesh(), center=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[1]/points.length],[0,0]);
    m.positions.push(center[0],y,center[1]);m.normals.push(0,1,0);m.uvs.push(center[0]/3,center[1]/3);
    points.forEach(p=>{m.positions.push(p[0],y,p[1]);m.normals.push(0,1,0);m.uvs.push(p[0]/3,p[1]/3);});
    for(let i=0;i<points.length;i++)m.indices.push(0,1+(i+1)%points.length,1+i);
    return m;
  };
  const ringMesh = (inside,outside,yIn,yOut,active=inside.map(()=>true),openings=[]) => {
    // Split kerb strips at the actual branch entrances; cap every new end.
    const lerp=(a,b,t)=>a.map((x,k)=>x+(b[k]-x)*t);
    const clip=(a,b,{a:start,b:end,width})=>{
      const dx=end[0]-start[0],dz=end[1]-start[1],length=Math.hypot(dx,dz);
      if(length<1e-8)return null;
      const tangent=[dx/length,dz/length],normal=[-tangent[1],tangent[0]],delta=b.map((v,k)=>v-a[k]);
      let low=0,high=1;
      for(const [axis,min,max] of [[tangent,-.2,length+1],[normal,-width/2-.12,width/2+.12]]){
        const base=(a[0]-start[0])*axis[0]+(a[1]-start[1])*axis[1],slope=delta[0]*axis[0]+delta[1]*axis[1];
        if(Math.abs(slope)<1e-9){if(base<min||base>max)return null;continue;}
        const t0=(min-base)/slope,t1=(max-base)/slope;
        low=Math.max(low,Math.min(t0,t1));high=Math.min(high,Math.max(t0,t1));
        if(high-low<1e-8)return null;
      }
      return [low,high];
    };
    const pieces=inside.map((a,i)=>{
      if(!active[i])return [];
      const j=(i+1)%inside.length,centerA=lerp(a,outside[i],.5),centerB=lerp(inside[j],outside[j],.5);
      let ranges=[[0,1]];
      for(const opening of openings){
        const cut=clip(centerA,centerB,opening);if(!cut)continue;
        ranges=ranges.flatMap(([lo,hi])=>cut[1]<=lo||cut[0]>=hi?[[lo,hi]]:[...(cut[0]>lo?[[lo,cut[0]]]:[]),...(cut[1]<hi?[[cut[1],hi]]:[])]);
      }
      return ranges;
    });
    const m=mesh();let distance=0;
    for(let i=0;i<inside.length;i++){
      if(!active[i])continue;
      const j=(i+1)%inside.length,old=distance;
      distance+=Math.hypot(outside[j][0]-outside[i][0],outside[j][1]-outside[i][1]);
      for(const [lo,hi] of pieces[i]){
        const ai=lerp(inside[i],inside[j],lo),bi=lerp(inside[i],inside[j],hi),co=lerp(outside[i],outside[j],hi),dout=lerp(outside[i],outside[j],lo);
        const a=[ai[0],yIn,ai[1]],b=[bi[0],yIn,bi[1]],c=[co[0],yOut,co[1]],d=[dout[0],yOut,dout[1]],down=p=>[p[0],.015,p[2]];
        const u0=(old+(distance-old)*lo)/1.8,u1=(old+(distance-old)*hi)/1.8;
        quad(m,a,b,c,d,[0,1,0],[[u0,0],[u1,0],[u1,1],[u0,1]]);
        quad(m,down(a),down(b),down(c),down(d),[0,-1,0]);
        quad(m,down(a),down(b),b,a,[a[0]-d[0],0,a[2]-d[2]]);
        quad(m,c,down(c),down(d),d,[d[0]-a[0],0,d[2]-a[2]]);
        const tangent=[b[0]-a[0],0,b[2]-a[2]],previous=pieces[(i+inside.length-1)%inside.length];
        if(lo>0||previous.at(-1)?.[1]!==1)quad(m,down(a),a,d,down(d),tangent.map(v=>-v));
        if(hi<1||pieces[j][0]?.[0]!==0)quad(m,b,down(b),down(c),c,tangent);
      }
    }return m;
  };
  const lake = group(root,'Danau & promenade');
  const plan=createSitePlan(),{shore,offset}=plan;
  root.renderBounds=plan.groundBounds;
  const terrain=createTerrain(shore,{...plan.groundBounds,bankRings:[{contour:offset(.85),level:L.bankMiddle},{contour:offset(2.1),level:L.lawn}]});root.add(terrain);
  add(lake,'Air danau',fanMesh(shore,L.water),[0,0,0],[1,1,1],material(palette.water,'water',{water:true,shininess:90,specular:.85,uvScale:[2,2]}));
  const pathInner=plan.inner,pathOuter=plan.outer,loop=plan.openCenterline;
  add(lake,'Jalur taman terbuka',ringMesh(pathInner,pathOuter,.115,.115,plan.active),[0,0,0],[1,1,1],material(palette.paving,'paving',{uvScale:[2,3]}));

  // Foto tepian memperlihatkan satu bed tanah yang menghubungkan rumpun,
  // dengan batas organik; bukan pot bundar terpisah untuk setiap tanaman.
  const shoreSoil=mesh(),soilInner=offset(.30),soilOuter=offset(1.76);
  for(let i=13;i<47;i++){
    const j=i+1,a=soilInner[i],b=soilInner[j],c=soilOuter[j],d=soilOuter[i];
    const onGround=p=>[p[0],terrain.heightAt(...p)+.006,p[1]];
    quad(shoreSoil,onGround(a),onGround(b),onGround(c),onGround(d),[0,1,0],
      [[a[0]*.5,a[1]*.5],[b[0]*.5,b[1]*.5],[c[0]*.5,c[1]*.5],[d[0]*.5,d[1]*.5]]);
  }
  add(lake,'Bed tanah melengkung pada tepian',shoreSoil,[0,0,0],[1,1,1],material([.40,.34,.25,1],'mulch',{specular:0,shininess:2}));

  const entrance = createEntrance({rampLayout:plan.entranceRamp});
  root.add(entrance.root);
  const bollardLayout=plan.bollards.map(p=>({...p,position:[p.position[0],terrain.heightAt(p.position[0],p.position[2]),p.position[2]]}));
  const objects = createParkObjects({plazaTop:entrance.measurements.elevations.plaza,relocateZ:plan.relocateZ,playgroundLayout:plan.playground,fitnessLayout:plan.fitness,markerPosition:plan.markerPosition,bollardLayout});
  root.add(objects.root);
  const seating=createLakesideSeating({shore:plan.stageAlignment,firstIndex:2,lastIndex:18,frontOffset:.8,sideAccessEnabled:false,hillDepth:4.2});
  seating.root.name='Tribun atau panggung di tengah kiri';
  seating.hierarchy.name=seating.root.name;
  seating.presets[0].label='Tribun serong • tampak depan';seating.presets[1].label='Tribun • bukit rumput belakang';
  seating.hierarchy.description='Tribun menghadap serong kanan belakang dari depan InfinITS; bukit rumput menempel pada bagian belakang. Jalan berada di antara tribun dan playground, tanpa cabang akses ke keduanya.';
  seating.hierarchy.children=seating.hierarchy.children.filter(n=>n.name!=='Dua akses samping pada elevasi tanah');
  seating.hierarchy.children.push({name:'Bukit rumput belakang tribun',description:'Lereng rumput menempel di belakang tribun, diapit pembatas beton kiri dan kanan yang turun mengikuti lereng.',children:[]});
  const platform=createLakesidePlatform(plan.platform);root.add(platform.root);
  root.add(seating.root);
  const connections=createConnections(loop,{entrance,seating,platform,playground:objects.measurements.playground,relocateZ:plan.relocateZ});
  root.add(connections.root);
  add(lake,'Kerb dalam jalur',ringMesh(plan.path(2.1),pathInner,.15,.15,plan.active,connections.kerbOpenings),[0,0,0],[1,1,1],material(palette.concrete,'concrete'));
  add(lake,'Kerb luar jalur',ringMesh(pathOuter,plan.path(4.67),.15,.15,plan.active,connections.kerbOpenings),[0,0,0],[1,1,1],material(palette.concrete,'concrete'));

  // Berbagai lapisan tanaman mengikuti dokumentasi: tajuk terbuka, semak,
  // rumpun daun pita, palem, serta rumput hias pada tepian danau.
  const pathFootprints=plan.pathFootprints;
  const rampFootprints=Object.values(entrance.measurements.ramps).map(r=>[...r.left,...r.right.toReversed()].map(p=>[p[0],p[2]]));
  const postFootprints=plan.bollards.map(({position:[x,,z]})=>[[x-.55,z-.55],[x+.55,z-.55],[x+.55,z+.55],[x-.55,z+.55]]);
  const details=createSiteDetails({relocateZ:plan.relocateZ,pavilionLayout:plan.pavilion});
  const plants = createVegetation({shore,pathCenterline:loop,pathWidth:plan.pathWidth,groundBounds:plan.groundBounds,groundHeight:terrain.heightAt,relocateZ:plan.relocateZ,reservedAreas:[objects.measurements.playground.footprint,objects.measurements.fitness.footprint,details.pavilionMeasurements.footprint,platform.measurements.footprint,seating.measurements.footprint,seating.measurements.backHill.footprint,...pathFootprints,...rampFootprints,...postFootprints]});
  root.add(plants.root);
  root.add(details);

  // Animation always edits local pivots: all leaf descendants inherit branch movement.
  function update(time,state={}) {
    plants.update(time,state);
    objects.update(time,state);
  }
  const presets=[
    {id:'scenic',label:'Suasana tepian taman',yaw:-.60,pitch:.72,distance:112,target:[-2,1.0,-14],fov:48},
    ...entrance.presets,
    ...seating.presets,
    ...platform.presets,
    {id:'entrance-photo',label:'Papan & tangga • setinggi mata',yaw:.02,pitch:.025,distance:15,target:[0,1.7,15.9],fov:68},
    {id:'lake',label:'Vegetasi tepi danau',yaw:-.70,pitch:.08,distance:24,target:[-7,1.7,plan.waistZ+1],fov:52},
    {id:'plants',label:'Palem & rumpun tepian',yaw:-.65,pitch:.18,distance:5,target:[-15.6,1.1,plan.relocateZ(5.8)],fov:52},
    {id:'fitness',label:'Area olahraga',yaw:-.65,pitch:.33,distance:14,target:[plan.fitness.position[0],1.3,plan.fitness.position[2]],fov:45},
    {id:'utility',label:'Pos ronda & detail atap',yaw:.35,pitch:.24,distance:14,target:[plan.pavilion.position[0],2.1,plan.pavilion.position[2]],fov:48},
    {id:'playground',label:'Playground kiri • jalan & tribun',yaw:.70,pitch:.58,distance:24,target:[-25,1.2,plan.waistZ],fov:48},
    {id:'aerial',label:'Tata letak dari atas',yaw:.05,pitch:1.22,distance:145,target:[0,.6,-17],fov:48},
    {id:'front',label:'Depan • ortografis',yaw:0,pitch:0,distance:140,target:[0,5,-17],fov:48,projection:'orthographic'},
    {id:'left',label:'Samping kiri • ortografis',yaw:-Math.PI/2,pitch:0,distance:140,target:[0,5,-17],fov:48,projection:'orthographic'},
    {id:'right',label:'Samping kanan • ortografis',yaw:Math.PI/2,pitch:0,distance:140,target:[0,5,-17],fov:48,projection:'orthographic'},
    {id:'rear',label:'Belakang • ortografis',yaw:Math.PI,pitch:0,distance:140,target:[0,5,-17],fov:48,projection:'orthographic'},
    {id:'top',label:'Atas • ortografis',yaw:0,pitch:Math.PI/2-.001,distance:165,target:[0,0,-17],fov:48,projection:'orthographic'},
    {id:'bottom',label:'Bawah • inspeksi tanpa tanah/air',yaw:0,pitch:-Math.PI/2+.001,distance:165,target:[0,0,-17],fov:48,projection:'orthographic',inspect:true}
  ];
  const hierarchy=[
    {name:'InfinITS Park',description:'Root scene; semua posisi memakai Y ke atas dan skala perkiraan meter.',children:[
      {name:'Lanskap & tanah',description:'Tanah, batas diorama, dan material rumput.',children:[]},
      {name:'Danau & promenade',description:'Jalan mengikuti sketsa biru: lengkung belakang melebar, lekukan kanan masuk ke arah dudukan, dan dua akses depan melengkung lebih ke luar. Semua fasilitas tetap terpisah dari jalan.',children:[]},
      entrance.hierarchy,
      seating.hierarchy,
      platform.hierarchy,
      plants.hierarchy,
      objects.hierarchy,
      connections.hierarchy,
      siteDetailsHierarchy
    ]}
  ];
  update(0,{});
  return {root,update,presets,hierarchy,vegetationMetrics:plants.metrics,structures:{entrance:entrance.measurements,seating:seating.measurements,platform:platform.measurements,playground:objects.measurements.playground,fitness:objects.measurements.fitness,pavilion:details.pavilionMeasurements,bollards:objects.measurements.bollards,lake:{shore,waterLevel:L.water,notchAxis:plan.notchAxis},groundBounds:plan.groundBounds,promenade:{inner:pathInner,outer:pathOuter,centerline:loop,active:plan.active,width:plan.pathWidth},walkways:entrance.walkways,routes:connections.routes,anchors:{...entrance.anchors,...objects.anchors,...seating.anchors,...platform.anchors}},inspection:{terrain,water:lake.children.find(node=>node.name==='Air danau')}};
}
