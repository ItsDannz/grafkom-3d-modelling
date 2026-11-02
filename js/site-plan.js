/** +Z adalah depan tulisan InfinITS, -X kiri saat melihat tulisan dari depan.
 * Lekukan danau berada di kiri/kanan; promenade terbuka di depan landmark. */
export function createSitePlan(){
  // Photo-proportioned layout: a close shore path and wider grassy waists.
  // Keep the front shore by the landmark and the long 58 × 31.6 pond shape.
  // All dimensions are visual estimates; facility geometry is never stretched.
  const relocateZ=z=>z-Math.max(0,Math.min(29,10.5-z));
  const waistZ=relocateZ(-4),groundBounds={minX:-47,maxX:44,minZ:-66,maxZ:32};
  const count=112,referenceShore=Array.from({length:count},(_,i)=>{const t=i/count*Math.PI*2;return [25*Math.cos(t)*Math.sqrt(.30+.90*Math.sin(t)**2),waistZ+29*Math.sin(t)];});
  // Extend both grassy peninsulas into the water. A broad C2 blend joins
  // the existing lobes without a sharp nose or a grass patch laid over water.
  const shore=referenceShore.map(([x,z])=>{
    const t=Math.abs(z-waistZ)/17,advance=t<1?6*(1-t*t)**3:0;
    return [x-Math.sign(x)*advance,z];
  });
  const smooth=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
  const offset=(amount,clearPlatform=false,contour=shore)=>contour.map((p,i)=>{
    const a=contour[(i+count-1)%count],b=contour[(i+1)%count],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const distance=Math.min(i,count-i),clearance=clearPlatform?3*smooth((9-distance)/3):0;
    return [p[0]+dz/length*(amount+clearance),p[1]-dx/length*(amount+clearance)];
  });
  // Smoothed survey of the BLUE guide in blue-route-reference.png. The black
  // strokes are not part of this route. +Z still points toward the entrance.
  const controls=[
    [-24.4,5.1],[-24.8,3.2],[-24.0,-.4],[-24.9,-5.2],[-27.4,-7.7],
    [-29.6,-11.6],[-30.8,-17.4],[-31,-22.8],[-30.2,-28.5],[-27.4,-33.2],
    [-25.3,-36.5],[-25.7,-41.1],[-25.2,-45],[-23.5,-48.6],[-20.1,-52.5],
    [-15.7,-54.8],[-10.7,-56.7],[-5.2,-57.8],[.5,-59.2],[5.4,-58.8],
    [9.3,-56.4],[14.6,-52.1],[19.3,-49.9],[21.5,-46.9],[22.5,-42.1],
    [22.9,-37.2],[22.5,-32.6],[21.8,-28.8],[20.4,-25.4],[19.2,-21.8],
    [18.6,-17.9],[18.8,-15.7],[19.8,-13],[21.3,-9.4],[22.6,-5.4],
    [23.7,-.4],[24.4,4.5],[24.4,5.1]
  ];
  const routeCenter=[[-24.4,7.2],controls[0]];
  // Chord-length Hermite tangents avoid overshoot at closely spaced points.
  for(let i=0;i<controls.length-1;i++){
    const p=controls[Math.max(0,i-1)],a=controls[i],b=controls[i+1],q=controls[Math.min(controls.length-1,i+2)];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const tangent=(prev,current,next)=>{
      const before=Math.hypot(current[0]-prev[0],current[1]-prev[1]),after=Math.hypot(next[0]-current[0],next[1]-current[1]);
      return next.map((v,k)=>(v-prev[k])/(before+after)*length);
    };
    const m=tangent(p,a,b),n=tangent(a,b,q),steps=Math.max(1,Math.ceil(length/.85));
    for(let j=1;j<=steps;j++){
      const t=j/steps,t2=t*t,t3=t2*t;
      routeCenter.push(a.map((v,k)=>(2*t3-3*t2+1)*v+(t3-2*t2+t)*m[k]+(-2*t3+3*t2)*b[k]+(t3-t2)*n[k]));
    }
  }
  routeCenter.push([24.4,7.2]);
  const pathWidth=2.22,routeCount=routeCenter.length;
  const normal=(a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);return [dz/l,-dx/l];};
  const path=amount=>routeCenter.map((p,i)=>{
    const d=amount-3.39;
    if(i===0||i===routeCount-1){const n=i===0?normal(p,routeCenter[1]):normal(routeCenter[i-1],p);return p.map((v,k)=>v+n[k]*d);}
    const a=normal(routeCenter[i-1],p),b=normal(p,routeCenter[i+1]),n=[a[0]+b[0],a[1]+b[1]],den=n[0]*b[0]+n[1]*b[1];
    return p.map((v,k)=>v+n[k]*d/den);
  });
  const inner=path(2.28),outer=path(4.5),center=path(3.39),active=routeCenter.map((_,i)=>i<routeCount-1);
  const openCenterline=center;
  // Regular arc-length stations, alternating across the walking strip.
  // The full plinth sits beyond the kerb, leaving the paving unobstructed.
  const bollards=[],spacing=9,edgeDistance=pathWidth/2+.64;
  let walked=0,next=8;
  for(let i=1;i<openCenterline.length;i++){
    const a=openCenterline[i-1],b=openCenterline[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    while(next<=walked+length){
      const t=(next-walked)/length,side=bollards.length%2===0?-1:1;
      bollards.push({position:[a[0]+dx*t+side*dz/length*edgeDistance,.015,a[1]+dz*t-side*dx/length*edgeDistance],yaw:Math.atan2(dx,dz),side,station:next});
      next+=spacing;
    }
    walked+=length;
  }
  const pathFootprints=active.flatMap((on,i)=>on?[[inner[i],inner[(i+1)%routeCount],outer[(i+1)%routeCount],outer[i]]]:[]);
  // A gently curved alignment places the terrace at middle-left beside the
  // path, independently of the bank's inward waist. It is not another lake.
  const stageAlignment=Array.from({length:22},(_,i)=>{
    const x=.55*Math.sin((i-2)/16*Math.PI),z=5.6-(i-2)*.70,a=Math.PI/4;
    return [-37.1+Math.cos(a)*x+Math.sin(a)*z,waistZ-Math.sin(a)*x+Math.cos(a)*z];
  });
  const playground={position:[-18.7,0,waistZ],yaw:Math.PI/2};
  const fitness={position:[30.1,0,waistZ-10.5],yaw:.18};
  const pavilion={position:[30.3,.025,waistZ-21]};
  const platform={bankX:13.4,bankZ:waistZ};
  return {shore,offset,path,pathWidth,active,inner,outer,center,openCenterline,pathFootprints,bollards,stageAlignment,playground,fitness,pavilion,platform,markerPosition:[-36.3,.025,waistZ-15.5],relocateZ,waistZ,groundBounds,
    entranceRamp:{lowerX:24.4,lowerZ:7.2,outerControlX:25.8,lowerControlZ:10.5},
    entranceMouths:{left:[-24.4,.115,7.2],right:[24.4,.115,7.2]},notchAxis:'left-right',frontGap:{first:routeCount-1,last:0}};
}
