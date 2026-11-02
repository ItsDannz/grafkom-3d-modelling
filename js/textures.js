/**
 * Tile prosedural deterministik, tanpa unduhan aset. Tekstur menjadi faktor
 * detail netral; warna rumput/tanah tetap datang dari material scene. Noise
 * periodik menghindari garis sambungan pada REPEAT dan mipmap WebGL 1.
 */
export function createTextureCanvases() {
  const textures=new Map();
  const names=['none','grass','paving','bark','concrete','metal','leaf','water','soil','mulch','stone','pavingSquare'];
  for(const [index,name] of names.entries()) {
    const canvas=document.createElement('canvas');
    const size=name==='none'?2:['grass','paving','pavingSquare','bark','soil','mulch'].includes(name)?512:256;
    canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('Browser tidak dapat menyiapkan tekstur Canvas 2D.');
    let seed=27917+index*817;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const hash=(x,y,n)=>{let h=Math.imul(x+79,374761393)^Math.imul(y+index*17,668265263)^n;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};
    const noise=(x,y,period)=>{
      const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
      fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
      const h=(a,b)=>hash(((a%period)+period)%period,((b%period)+period)%period,3141);
      return (h(ix,iy)*(1-fx)+h(ix+1,iy)*fx)*(1-fy)+(h(ix,iy+1)*(1-fx)+h(ix+1,iy+1)*fx)*fy;
    };
    const image=ctx.createImageData(size,size);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const u=x/size,v=y/size;
      const broad=noise(u*8,v*8,8),fine=noise(u*48,v*48,48),grain=random()-.5;
      let value=255,tint=[1,1,1];
      if(name==='grass') {value=221+(broad-.5)*34+(fine-.5)*31+grain*26;tint=[1,.998,.975];}
      else if(name==='paving') {
        // Domino 2:1, horizontal pada diagonal 0/1 dan vertikal pada 2/3:
        // menghasilkan susunan herringbone seperti paving foto lapangan.
        const gx=u*16,gy=v*16,cx=Math.floor(gx),cy=Math.floor(gy),phase=(cx+cy)%4;
        const bx=phase<2?cx-(phase===1?1:0):cx,by=phase<2?cy:cy-(phase===3?1:0);
        const px=gx-bx,py=gy-by,w=phase<2?2:1,h=phase<2?1:2;
        const edge=Math.min(px,w-px,py,h-py),brick=hash(bx,by,112);
        value=edge<.035?123+fine*22:225+(brick-.5)*22+(broad-.5)*13+grain*17;
        if(edge>.035&&edge<.065)value+=9;
        if(brick<.22&&edge>.035)tint=[1,.73,.67];
      } else if(name==='pavingSquare') {
        const gx=u*8,gy=v*8,px=gx%1,py=gy%1;
        const edge=Math.min(px,1-px,py,1-py),slab=hash(Math.floor(gx),Math.floor(gy),22);
        value=edge<.019?115+fine*18:227+(slab-.5)*15+(broad-.5)*18+grain*12;
        if(edge>.019&&edge<.045)value-=10;
      } else if(name==='bark') {
        const warp=noise(u*8,v*8,8)*.09,groove=noise((u+warp)*64,v*8,8);
        const ridges=Math.pow(Math.abs(Math.sin((u+warp)*Math.PI*48)),.42);
        value=176+ridges*52+(groove-.5)*34+(fine-.5)*17+grain*15;tint=[1,.98,.94];
      } else if(name==='concrete'||name==='stone') {
        value=229+(broad-.5)*22+(fine-.5)*18+grain*16;
        if(random()<.027)value-=17+random()*34;
      } else if(name==='soil') {value=211+(broad-.5)*40+(fine-.5)*38+grain*36;tint=[1,.98,.93];}
      else if(name==='mulch') {value=203+(broad-.5)*39+(fine-.5)*52+grain*30;tint=[1,.98,.94];}
      else if(name==='metal')value=247+(fine-.5)*5+grain*5;
      else if(name==='leaf') {
        const midrib=Math.exp(-Math.abs(v-.5)*180),veins=Math.pow(Math.max(0,Math.cos((u*8+Math.abs(v-.5)*5)*Math.PI*2)),24);
        value=239+(broad-.5)*10+(fine-.5)*8-midrib*20-veins*7;tint=[.985,1,.97];
      } else if(name==='water')value=252+(fine-.5)*3;
      const at=(y*size+x)*4;
      for(let c=0;c<3;c++)image.data[at+c]=Math.max(0,Math.min(255,value*tint[c]));image.data[at+3]=255;
    }
    ctx.putImageData(image,0,0);
    if(name==='grass') {
      for(let i=0;i<9000;i++) {
        const x=random()*size,y=random()*size;
        ctx.strokeStyle=random()>.35?'rgba(100,111,88,.15)':'rgba(255,255,240,.28)';ctx.lineWidth=.45+random()*.65;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(random()-.5)*4,y-1-random()*5);ctx.stroke();
      }
    } else if(name==='bark') {
      for(let i=0;i<580;i++) {
        const x=random()*size,y=random()*size;ctx.strokeStyle='rgba(52,46,38,.16)';ctx.lineWidth=.6+random()*1.5;
        ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+(random()-.5)*8,y+9,x+random()*3,y+6+random()*23);ctx.stroke();
      }
    } else if(name==='mulch') {
      for(let i=0;i<1500;i++) {
        const x=random()*size,y=random()*size;ctx.save();ctx.translate(x,y);ctx.rotate(random()*Math.PI);
        ctx.fillStyle=random()>.5?'rgba(63,56,46,.24)':'rgba(255,244,211,.22)';ctx.fillRect(0,0,2+random()*3,5+random()*13);ctx.restore();
      }
    }
    textures.set(name,canvas);
  }
  return textures;
}
