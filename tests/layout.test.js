import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createInfinitsScene} from '../js/scene.js';
import {Mat4} from '../js/math.js';

// Node has no font rasteriser. Geometry tests use a compact glyph mask, while
// the real lettering appearance is reviewed separately in the browser.
const documentStub={createElement(){const canvas={width:0,height:0};canvas.getContext=()=>({measureText:text=>({width:text.length*58}),fillText(){},getImageData(_x,_y,w,h){const data=new Uint8ClampedArray(w*h*4);for(let y=20;y<90;y++)for(let x=5;x<w-5;x++)if(x%58<40)data[(y*w+x)*4+3]=255;return {data};}});return canvas;}};

test('the physical park route and both approach curves follow the user blue drawing',t=>{
  const {structures:s}=scene(),guide=JSON.parse(readFileSync(new URL('./fixtures/blue-route-guide.json',import.meta.url),'utf8')),h=guide.homography;
  const project=([x,z])=>{x/=25;z=(z+18.5)/29;const w=1+h[6]*x+h[7]*z;return [(h[0]*x+h[1]*z+h[2])/w,(h[3]*x+h[4]*z+h[5])/w];};
  const lines=[s.promenade.centerline,...Object.values(s.entrance.ramps).map(r=>r.centerline.map(p=>[p[0],p[2]]))].map(line=>line.map(project));
  const gap=(p,a,b)=>{const d=b.map((x,k)=>x-a[k]),t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]*d[0]+d[1]*d[1])));return Math.hypot(...p.map((v,k)=>v-a[k]-d[k]*t));};
  const errors=guide.bluePixels.map(p=>Math.min(...lines.flatMap(line=>line.slice(1).map((b,i)=>gap(p,line[i],b)))));
  assert.ok(Math.max(...errors)<20,'all blue strokes stay close to the real path, including the outer approach edge');
  const middle=errors.slice(3,-5);assert.ok(Math.max(...middle)<9,'main route follows the blue rear arc and both waist bends');
  t.diagnostic(`blue guide maximum centreline error ${Math.max(...errors).toFixed(2)} px; main route ${Math.max(...middle).toFixed(2)} px`);
});
function scene(){globalThis.document=documentStub;const s=createInfinitsScene();s.root.updateWorldMatrix();return s;}
function nodes(root){const result=[];const visit=n=>{result.push(n);n.children.forEach(visit);};visit(root);return result;}
function point(node){return Mat4.transformPoint(node.worldMatrix,[0,0,0]);}
function topTriangles(node){
  const world=p=>Mat4.transformPoint(node.worldMatrix,p);
  if(node.mesh==='box')return [[world([-.5,.5,-.5]),world([.5,.5,-.5]),world([.5,.5,.5])],[world([-.5,.5,-.5]),world([.5,.5,.5]),world([-.5,.5,.5])]];
  if(!node.mesh||typeof node.mesh==='string')return [];
  const m=node.mesh,triangles=[];
  for(let i=0;i<m.indices.length;i+=3){
    const ids=m.indices.slice(i,i+3),triangle=ids.map(j=>world(m.positions.slice(j*3,j*3+3)));
    const [a,b,c]=triangle,u=b.map((v,k)=>v-a[k]),v=c.map((q,k)=>q-a[k]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal);
    if(len>1e-8&&normal[1]/len>.85)triangles.push(triangle);
  }
  return triangles;
}
function surfaceY(x,z,tri){
  const [a,b,c]=tri,det=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
  if(Math.abs(det)<1e-8)return null;
  const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/det;
  const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/det,w=1-u-v;
  return u>=-1e-5&&v>=-1e-5&&w>=-1e-5?u*a[1]+v*b[1]+w*c[1]:null;
}
function surfaces(root){
  return nodes(root).filter(n=>/^paving/.test(n.material?.texture??'')||/^Landasan (permainan|kebugaran) · concrete$/.test(n.name))
    .flatMap(node=>topTriangles(node).map(triangle=>({node,triangle})));
}
const EPS=1e-5;
const xz=p=>p.length===3?[p[0],p[2]]:p;
const cross2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function onSegment(p,a,b){return Math.abs(cross2(a,b,p))<EPS&&p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS;}
function insidePolygon(p,polygon){
  if(polygon.some((a,i)=>onSegment(p,a,polygon[(i+1)%polygon.length])))return false;
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }return inside;
}
function polygonsOverlap(a,b){
  if(a.some(p=>insidePolygon(p,b))||b.some(p=>insidePolygon(p,a)))return true;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const aa=a[i],ab=a[(i+1)%a.length],ba=b[j],bb=b[(j+1)%b.length];
    // Boundary contact is allowed at a legitimate entrance. A transverse edge
    // crossing detects paths cutting a seat even when all vertices lie outside.
    if(cross2(aa,ab,ba)*cross2(aa,ab,bb)<-EPS*EPS&&cross2(ba,bb,aa)*cross2(ba,bb,ab)<-EPS*EPS)return true;
  }return false;
}
function named(root,name){const n=nodes(root).find(n=>n.name===name);assert.ok(n,`missing physical object: ${name}`);return n;}
function heightAt(node,p){return topTriangles(node).map(t=>surfaceY(p[0],p[2],t)).filter(y=>y!==null);}
function assertHeight(node,p,expected,message){const values=heightAt(node,p);assert.ok(values.some(y=>Math.abs(y-expected)<EPS),`${message}: physical surfaces at ${p} were ${values}`);}
function assertGroundedAtEveryTopVertex(node){
  const worldVertices=[];for(let i=0;i<node.mesh.positions.length;i+=3)worldVertices.push(Mat4.transformPoint(node.worldMatrix,node.mesh.positions.slice(i,i+3)));
  for(const p of topTriangles(node).flat())assert.ok(worldVertices.some(q=>Math.abs(q[0]-p[0])<EPS&&Math.abs(q[2]-p[2])<EPS&&Math.abs(q[1]-.015)<EPS),`${node.name}: no ground support below top vertex ${p}`);
}
const plantingNames=new Set(['Pohon peneduh','Bed daun pita kuning','Semak daun merah','Palem hias','Rumpun pakis','Pohon kecil berdaun rapat']);

test('tree and planting stems keep the actual walking and equipment surfaces clear',()=>{
  const {root}=scene(),walkable=surfaces(root),collisions=[];
  for(const node of nodes(named(root,'Tribun atau panggung di tengah kiri')))for(const triangle of topTriangles(node))walkable.push({node,triangle});
  for(const plant of nodes(root).filter(n=>plantingNames.has(n.name))){
    const [x,,z]=point(plant),hit=walkable.find(({triangle})=>surfaceY(x,z,triangle)!==null);
    if(hit)collisions.push(`${plant.name} at (${x.toFixed(2)}, ${z.toFixed(2)}) inside ${hit.node.name}`);
  }
  assert.deepEqual(collisions,[],`Move the planting bed beyond the walking edge:\n${collisions.join('\n')}`);
});

test('fixture feet are supported at the paving height wherever a fixture stands on a paved surface',()=>{
  const {root}=scene(),walkable=surfaces(root),buried=[];
  for(const fixture of nodes(root).filter(n=>n.name==='Bollard berlubang motif daun'||n.name==='Lampu jalan lengkung dua lengan')){
    const [x,y,z]=point(fixture),heights=walkable.map(({triangle})=>surfaceY(x,z,triangle)).filter(h=>h!==null);
    const support=Math.max(-Infinity,...heights);
    if(support>y+.03)buried.push(`${fixture.name} at (${x.toFixed(2)}, ${z.toFixed(2)}): foot ${y.toFixed(3)} < paving ${support.toFixed(3)}`);
  }
  assert.deepEqual(buried,[],`Move the lamp beside the route or raise its base to the paving:\n${buried.join('\n')}`);
});

test('actual promenade triangles and edges keep the relocated left terrace footprint clear without cutting through it',()=>{
  const {root,structures}=scene(),loop=named(root,'Jalur taman terbuka'),footprint=structures.seating.footprint.map(xz);
  const triangles=topTriangles(loop),collisions=[];
  assert.ok(triangles.length>150,'inspect actual world-space loop triangles rather than only a route centerline');
  triangles.forEach((triangle,i)=>{if(polygonsOverlap(triangle.map(xz),footprint))collisions.push(i);});
  assert.deepEqual(collisions,[],`Promenade triangles intersect the main concrete seating mass: ${collisions.join(', ')}`);
  assert.equal(structures.seating.sideAccess.length,0,'no paved side approaches to the terrace');
});

test('both ramp mouths meet the physical ends of the open promenade at the same level',()=>{
  const {root,structures}=scene(),path=named(root,'Jalur taman terbuka'),line=structures.promenade.centerline;
  for(const [side,endpoint] of [['left',line[0]],['right',line.at(-1)]]){
    const r=structures.entrance.ramps[side],p=r.lower;
    assert.ok(Math.hypot(p[0]-endpoint[0],p[2]-endpoint[1])<EPS,'no connector or cross-path behind the sign');
    const landing=named(root,`Landing bawah ramp ${r.label}`);
    assertHeight(landing,p,.115,'ramp has a level physical lower mouth');
    assertHeight(path,p,.115,'promenade ends on that same mouth');
  }
});

test('there is no paved cross-route directly behind the InfinITS letters',()=>{
  const {root}=scene(),walkable=surfaces(root);
  for(let x=-8;x<=8;x+=2)for(let z=9.8;z<13.48;z+=.35){
    const hit=walkable.find(({triangle})=>surfaceY(x,z,triangle)!==null);
    assert.equal(hit,undefined,`unexpected pavement behind letters at ${x},${z}: ${hit?.node.name}`);
  }
});

test('lake waists are on left and right while the terrace and low platform occupy separate banks',()=>{
  const {root,structures}=scene(),s=structures.lake.shore;
  assert.ok(Math.abs(s[0][0])<Math.abs(s[10][0]),'right middle waist is narrower than front lobe');
  assert.ok(Math.abs(s[56][0])<Math.abs(s[46][0]),'left middle waist is narrower than front lobe');
  assert.ok(s[28][1]>s[16][1]&&s[84][1]<s[72][1],'front and back are smooth lobe tips');
  assert.ok(structures.seating.footprint.every(p=>p[0]<-18),'terrace moved to middle-left beside the path');
  assert.ok(structures.platform.footprint.every(p=>p[0]>10),'photo 164440 platform is a separate low lakeside area');
  assert.ok(nodes(root).some(n=>n.name==='Pos ronda beratap pelana'));
  assert.ok(!nodes(root).some(n=>/Siluet gedung|Massa gedung|Kisi fasad/.test(n.name)),'large background building removed');
});

test('actual water mesh is an elongated figure eight with its front shore held behind the landmark',()=>{
  const {root,structures}=scene(),water=named(root,'Air danau'),points=[];
  for(let i=0;i<water.mesh.positions.length;i+=3)points.push(Mat4.transformPoint(water.worldMatrix,water.mesh.positions.slice(i,i+3)));
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
  const minZ=Math.min(...points.map(p=>p[2])),maxZ=Math.max(...points.map(p=>p[2]));
  const width=maxX-minX,length=maxZ-minZ;
  assert.ok(length/width>=1.75&&length/width<=2.1,`lake must read as a long 8, got ${length.toFixed(2)} × ${width.toFixed(2)}`);
  assert.ok(length>=55,'elongate the lake rather than only shrinking its width');
  assert.ok(Math.abs(maxZ-10.5)<EPS,'front shore remains close to the landmark as in the photo layout');
  const waist=(maxZ+minZ)/2;
  assert.ok(Math.abs(structures.platform.position[2]-waist)<EPS,'relocate the low platform to the new middle bank without stretching it');
  const platform=structures.platform.footprint.map(xz),path=named(root,'Jalur taman terbuka');
  assert.ok(topTriangles(path).every(t=>!polygonsOverlap(t.map(xz),platform)),'new promenade must go around the platform');
});

test('both indentations form deeper grassy peninsulas in the physical shoreline and lake opening',()=>{
  const {root,structures}=scene(),shore=structures.lake.shore,z=(Math.min(...shore.map(p=>p[1]))+Math.max(...shore.map(p=>p[1])))/2;
  const waist=shore.filter(p=>p[0]<0).reduce((a,b)=>Math.abs(a[1]-z)<Math.abs(b[1]-z)?a:b);
  assert.ok(waist[0]>-8.5,'grassy waist reaches substantially farther into the lake');
  assert.ok(Math.min(...shore.filter(p=>p[1]>z+12).map(p=>p[0]))<-15,'front lobe remains broad');
  assert.ok(Math.min(...shore.filter(p=>p[1]<z-12).map(p=>p[0]))<-15,'rear lobe remains broad');
  const right=shore.filter(p=>p[0]>0).reduce((a,b)=>Math.abs(a[1]-z)<Math.abs(b[1]-z)?a:b);
  assert.ok(right[0]<8.5,'the right platform bank also reaches toward the lake');
  for(const x of [-11,11]){
    const sample=[x,.015,z];
    assertHeight(named(root,'Tanah taman dengan lubang cekungan'),sample,.015,'actual soil fills both extended peninsulas');
    assert.deepEqual(heightAt(named(root,'Air danau'),sample),[],'water mesh stops at the new bank instead of extending under the grass');
  }
});

test('left bank orders the actual playground, promenade and terrace from water to outer lawn',()=>{
  const {root,structures}=scene(),play=named(root,'Permainan dua menara beratap merah');
  const all=nodes(root);
  assert.equal(all.filter(n=>n.name===play.name).length,1,'move the original playground instead of leaving a copy in the right corner');
  assert.ok(point(play)[0]<-15,'playground is on the left bank');
  const pad=named(play,'Landasan permainan · concrete'),padTriangles=topTriangles(pad);
  const padFootprint=structures.playground.footprint.map(xz),terrace=structures.seating.footprint.map(xz);
  assert.ok(padTriangles.length>10,'inspect the actual solid playground pad');
  assert.ok(!polygonsOverlap(padFootprint,structures.lake.shore),'playground stands on land beside the water');
  const path=named(root,'Jalur taman terbuka'),pathTriangles=topTriangles(path);
  assert.ok(pathTriangles.every(t=>padTriangles.every(p=>!polygonsOverlap(t.map(xz),p.map(xz)))),'promenade does not cut through the playground pad');
  assert.ok(!polygonsOverlap(terrace,padFootprint),'terrace and playground occupy distinct sides');
  const padMinX=Math.min(...padTriangles.flat().map(p=>p[0])),terraceMaxX=Math.max(...terrace.map(p=>p[0]));
  const z=point(play)[2],line=structures.promenade.centerline;
  const crossing=line.slice(1).flatMap((b,i)=>{
    const a=line[i];if(a[0]>=0||b[0]>=0||(a[1]-z)*(b[1]-z)>0||Math.abs(b[1]-a[1])<EPS)return [];
    return [a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1])];
  });
  assert.ok(crossing.some(x=>x>terraceMaxX+1&&x<padMinX-1),'usable path lies between the two real footprints');
  for(const x of crossing)assertHeight(path,[x,.115,z],.115,'middle road has continuous physical paving');
  assert.ok(!all.some(n=>/Akses masuk pad permainan|Akses tanah samping dudukan|Sambungan tribun kiri|Jalur lengkung menuju permainan/.test(n.name)),'no access branches or pad entrance steps remain');
  assert.ok(!structures.routes.some(r=>/tribun|permainan/.test(r.name)));
});

test('promenade maintains its perpendicular clear width through every bend',()=>{
  const {root,structures}=scene(),{inner,outer,active,width}=structures.promenade,path=named(root,'Jalur taman terbuka');
  for(let i=0;i<inner.length;i++){
    if(!active[i])continue;const j=(i+1)%inner.length;
    const a=inner[i].map((v,k)=>(v+outer[i][k])/2),b=inner[j].map((v,k)=>(v+outer[j][k])/2);
    const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),normal=[dz/l,-dx/l];
    for(const k of[i,j]){
      const crossWidth=Math.abs((outer[k][0]-inner[k][0])*normal[0]+(outer[k][1]-inner[k][1])*normal[1]);
      assert.ok(Math.abs(crossWidth-width)<1e-5,`segment ${i}: width ${crossWidth}, expected ${width}`);
    }
    for(const fraction of[-.48,0,.48])assertHeight(path,[(a[0]+b[0])/2+normal[0]*width*fraction,.115,(a[1]+b[1])/2+normal[1]*width*fraction],.115,'full bend width has actual paving');
  }
});

test('terrace faces rear-right and playground slide faces the water from a blunt triangular pad',()=>{
  const {root,structures}=scene(),seat=structures.seating,play=structures.playground;
  assert.ok(seat.facing[0]>.65&&seat.facing[2]<-.65,'viewed from InfinITS, terrace front faces diagonally right and back');
  const direction=Mat4.transformPoint(named(root,'Permainan dua menara beratap merah').worldMatrix,[0,0,1]);
  const origin=point(named(root,'Permainan dua menara beratap merah'));
  assert.ok(direction[0]-origin[0]>.99&&Math.abs(direction[2]-origin[2])<1e-5,'actual slide local +Z axis points toward the lake');
  const ray=Array.from({length:30},(_,i)=>[origin[0]+(direction[0]-origin[0])*(6+i),origin[2]+(direction[2]-origin[2])*(6+i)]);
  assert.ok(ray.some(p=>insidePolygon(p,structures.lake.shore)),'slide direction crosses the enlarged grassy peninsula toward the water');
  assert.equal(play.padShape,'rounded-truncated-triangle');
  const nose=play.padOutline.filter(p=>p[1]>5.7),back=play.padOutline.filter(p=>p[1]<-4.8);
  assert.ok(nose.length>=2&&Math.max(...nose.map(p=>p[0]))-Math.min(...nose.map(p=>p[0]))<2.5,'slide end is a short flat, rounded triangle tip');
  assert.ok(Math.max(...back.map(p=>p[0]))-Math.min(...back.map(p=>p[0]))>8,'triangle widens around the rear towers');
});

test('raised front approach joins the real forecourt across its width and grades down on a continuous foundation',()=>{
  const {root,structures}=scene(),approach=named(root,'Pendekatan paving depan mengikuti elevasi landing');
  const forecourt=named(root,'Landing bawah berpaving'),bounds=structures.entrance.forecourtBounds,level=structures.entrance.accessStair.lowerLandingTop;
  const route=structures.routes.find(r=>r.name==='Pendekatan paving depan');
  for(const fraction of [.05,.5,.95]){
    const x=bounds.min[0]+(bounds.max[0]-bounds.min[0])*fraction,p=[x,level,bounds.max[2]];
    assertHeight(forecourt,p,level,'forecourt has its raised physical top');assertHeight(approach,p,level,'approach touches forecourt without a vertical lip');
  }
  const [flatEnd,groundEnd]=route.centerline.slice(-2);let previous=Infinity;
  for(let i=0;i<=10;i++){
    const p=flatEnd.map((v,k)=>v+(groundEnd[k]-v)*i/10),heights=heightAt(approach,p);
    assert.ok(heights.length,'the sloping approach has no geometric gap');const y=Math.max(...heights);
    assert.ok(y<=previous+EPS,'approach continuously descends toward the surrounding ground');previous=y;
    assert.ok(Math.abs(y-p[1])<EPS,'actual slope matches the route endpoint elevations');
  }
  assertGroundedAtEveryTopVertex(approach);
});


test('walkway descends through real grassy bank triangles to the lower lake surface',()=>{
  const {root,structures,inspection}=scene(),bank=named(root,'Lereng rumput turun menuju air'),path=named(root,'Jalur taman terbuka');
  const shore=structures.lake.shore,water=named(root,'Air danau');
  const surfaceY=structures.lake.waterLevel;
  assert.ok(surfaceY<-.7,'water is visibly below the surrounding lawn');
  assert.ok(water.mesh.positions.filter((_,i)=>i%3===1).every(y=>Math.abs(y-surfaceY)<EPS));
  for(const i of [8,48,64,104]){
    const p=shore[i],a=shore[(i+111)%112],b=shore[(i+1)%112],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=[dz/len,-dx/len];
    let previous=-Infinity;
    for(const d of [.05,.4,.9,1.5,2.1]){
      const x=p[0]+n[0]*d,z=p[1]+n[1]*d,y=inspection.terrain.heightAt(x,z);
      assert.ok(y>previous,'exposed bank rises continuously from water toward walkway');previous=y;
      assert.ok(heightAt(bank,[x,y,z]).some(v=>Math.abs(v-y)<EPS),'slope is part of the actual mesh');
    }
    assert.ok(previous>.0,'bank reaches the lawn level at the crest');
  }
  const endpoint=structures.promenade.centerline[0];
  assertHeight(path,[endpoint[0],.115,endpoint[1]],.115,'the access road keeps its connection height');
  assert.ok(.115-surfaceY>.9,'walkway and water have a clear height difference');
});

test('all black posts follow the footpath with alternating sides and regular distance stations',()=>{
  const {root,structures}=scene(),posts=nodes(root).filter(n=>n.name==='Bollard berlubang motif daun'),line=structures.promenade.centerline;
  assert.ok(posts.length>=14&&posts.length<=24,'a spaced sequence follows the full walking route');
  const project=q=>{
    let result=null,walked=0;
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[2]-a[1])*dz)/(l*l)));
      const x=q[0]-a[0]-dx*t,z=q[2]-a[1]-dz*t,d=Math.hypot(x,z);
      if(!result||d<result.distance)result={station:walked+t*l,side:Math.sign(x*dz-z*dx),distance:d};
      walked+=l;
    }return result;
  };
  const walkable=surfaces(root);
  for(const post of posts)for(const base of post.children.filter(n=>n.name==='Pelat dasar lampu · concrete'))for(const triangle of topTriangles(base)){
    assert.ok(walkable.every(w=>!polygonsOverlap(triangle.map(xz),w.triangle.map(xz))),`post plinth overlaps ${walkable.find(w=>polygonsOverlap(triangle.map(xz),w.triangle.map(xz)))?.node.name}`);
  }
  const projected=posts.map(n=>{
    const p=project(point(n));
    // Recover the footpath station from the actual post's local cross-path
    // axis. At a bend, the nearest segment alone can project onto its neighbour.
    const center=Mat4.transformPoint(n.worldMatrix,[-p.side*1.75,0,0]);
    return {...p,centerStation:project(center).station};
  }).sort((a,b)=>a.centerStation-b.centerStation);
  for(let i=0;i<projected.length;i++){
    const p=projected[i];assert.ok(p.distance>1.55&&p.distance<1.82,'full post plinth stays beside the kerb');
    if(i){assert.equal(p.side,-projected[i-1].side,'consecutive posts alternate across the path');assert.ok(Math.abs(p.centerStation-projected[i-1].centerStation-9)<1e-4,'spacing is measured along the route, including bends');}
  }
});

test('left playground leaves a grass gap beside the footpath and stays on the flat peninsula',()=>{
  const {root,structures,inspection}=scene(),pad=structures.playground.footprint.map(xz),{inner,active}=structures.promenade;
  const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};
  const gap=Math.min(...pad.flatMap(p=>inner.flatMap((a,i)=>active[i]?[distance(p,a,inner[(i+1)%inner.length])]:[])));
  assert.ok(gap>2.8,`playground should leave a broad grass strip beside the road, got ${gap}`);
  for(const [x,z] of pad)assert.ok(Math.abs(inspection.terrain.heightAt(x,z)-.015)<EPS,'whole pad stays supported on flat ground above the bank');
  const direction=Mat4.transformPoint(named(root,'Permainan dua menara beratap merah').worldMatrix,[0,0,1]),origin=point(named(root,'Permainan dua menara beratap merah'));
  assert.ok(direction[0]-origin[0]>.99,'slides keep facing the lake');
});

