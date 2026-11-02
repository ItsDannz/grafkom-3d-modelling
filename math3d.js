/**
 * Matriks column-major, sesuai konvensi WebGL: v_dunia = M * v_lokal.
 * Tidak membutuhkan library grafika. Sudut rotasi dan perspective dalam radian.
 */
export const Vec3 = {
  add:(a,b)=>a.map((v,i)=>v+b[i]),
  subtract:(a,b)=>a.map((v,i)=>v-b[i]),
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  normalize(v) {const length=Math.hypot(...v);return length<1e-8?[0,0,0]:v.map(x=>x/length);},
};

export const degToRad=degrees=>degrees*Math.PI/180;

export const Mat4 = {
  identity(out = new Float32Array(16)) {
    out.fill(0); out[0] = out[5] = out[10] = out[15] = 1;
    return out;
  },

  translation(tx,ty,tz,out=new Float32Array(16)) {
    Mat4.identity(out);out[12]=tx;out[13]=ty;out[14]=tz;return out;
  },

  rotationX(rad,out=new Float32Array(16)) {
    const c=Math.cos(rad),s=Math.sin(rad);Mat4.identity(out);
    out[5]=c;out[6]=s;out[9]=-s;out[10]=c;return out;
  },

  rotationY(rad,out=new Float32Array(16)) {
    const c=Math.cos(rad),s=Math.sin(rad);Mat4.identity(out);
    out[0]=c;out[2]=-s;out[8]=s;out[10]=c;return out;
  },

  rotationZ(rad,out=new Float32Array(16)) {
    const c=Math.cos(rad),s=Math.sin(rad);Mat4.identity(out);
    out[0]=c;out[1]=s;out[4]=-s;out[5]=c;return out;
  },

  scaling(sx,sy,sz,out=new Float32Array(16)) {
    Mat4.identity(out);out[0]=sx;out[5]=sy;out[10]=sz;return out;
  },

  multiply(a, b, out = new Float32Array(16)) {
    // Salin elemen A agar out boleh sama dengan A maupun B.
    const a00=a[0],a01=a[1],a02=a[2],a03=a[3];
    const a10=a[4],a11=a[5],a12=a[6],a13=a[7];
    const a20=a[8],a21=a[9],a22=a[10],a23=a[11];
    const a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    for (let c=0;c<4;c++) {
      const i=c*4, b0=b[i],b1=b[i+1],b2=b[i+2],b3=b[i+3];
      out[i]=a00*b0+a10*b1+a20*b2+a30*b3;
      out[i+1]=a01*b0+a11*b1+a21*b2+a31*b3;
      out[i+2]=a02*b0+a12*b1+a22*b2+a32*b3;
      out[i+3]=a03*b0+a13*b1+a23*b2+a33*b3;
    }
    return out;
  },

  compose(position, rotation, scale, out = new Float32Array(16)) {
    // Urutan yang diminta: T * Rz * Ry * Rx * S. Rotasi lokal X lebih dahulu.
    const [x,y,z]=rotation, sx=Math.sin(x),cx=Math.cos(x);
    const sy=Math.sin(y),cy=Math.cos(y),sz=Math.sin(z),cz=Math.cos(z);
    out[0]=cz*cy*scale[0]; out[1]=sz*cy*scale[0]; out[2]=-sy*scale[0]; out[3]=0;
    out[4]=(cz*sy*sx-sz*cx)*scale[1];
    out[5]=(sz*sy*sx+cz*cx)*scale[1]; out[6]=cy*sx*scale[1]; out[7]=0;
    out[8]=(cz*sy*cx+sz*sx)*scale[2];
    out[9]=(sz*sy*cx-cz*sx)*scale[2]; out[10]=cy*cx*scale[2]; out[11]=0;
    out[12]=position[0]; out[13]=position[1]; out[14]=position[2]; out[15]=1;
    return out;
  },

  orthographic(left,right,bottom,top,near,far,out=new Float32Array(16)) {
    out.fill(0);out[0]=2/(right-left);out[5]=2/(top-bottom);out[10]=-2/(far-near);out[15]=1;
    out[12]=-(right+left)/(right-left);out[13]=-(top+bottom)/(top-bottom);out[14]=-(far+near)/(far-near);
    return out;
  },

  perspective(fovRadians, aspect, near, far, out = new Float32Array(16)) {
    const f=1/Math.tan(fovRadians/2), inv=1/(near-far);
    out.fill(0); out[0]=f/aspect;out[5]=f;out[10]=(far+near)*inv;
    out[11]=-1;out[14]=2*far*near*inv;
    return out;
  },

  lookAt(eye, target, up = [0,1,0], out = new Float32Array(16)) {
    let zx=eye[0]-target[0],zy=eye[1]-target[1],zz=eye[2]-target[2];
    let length=Math.hypot(zx,zy,zz);
    if (length<1e-8) {zx=0;zy=0;zz=1;length=1;}
    zx/=length;zy/=length;zz/=length;
    let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;
    length=Math.hypot(xx,xy,xz);
    if (length<1e-8) {xx=zz;xy=0;xz=-zx;length=Math.hypot(xx,xz);}
    if (length<1e-8) {xx=1;xy=0;xz=0;length=1;}
    xx/=length;xy/=length;xz/=length;
    const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
    out[0]=xx;out[1]=yx;out[2]=zx;out[3]=0;
    out[4]=xy;out[5]=yy;out[6]=zy;out[7]=0;
    out[8]=xz;out[9]=yz;out[10]=zz;out[11]=0;
    out[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);
    out[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);
    out[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);out[15]=1;
    return out;
  },

  invert(a, out = new Float32Array(16)) {
    const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7];
    const a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10;
    const b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12;
    const b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30;
    const b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    let determinant=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
    if (Math.abs(determinant)<1e-12) return null;
    determinant=1/determinant;
    out[0]=(a11*b11-a12*b10+a13*b09)*determinant;
    out[1]=(a02*b10-a01*b11-a03*b09)*determinant;
    out[2]=(a31*b05-a32*b04+a33*b03)*determinant;
    out[3]=(a22*b04-a21*b05-a23*b03)*determinant;
    out[4]=(a12*b08-a10*b11-a13*b07)*determinant;
    out[5]=(a00*b11-a02*b08+a03*b07)*determinant;
    out[6]=(a32*b02-a30*b05-a33*b01)*determinant;
    out[7]=(a20*b05-a22*b02+a23*b01)*determinant;
    out[8]=(a10*b10-a11*b08+a13*b06)*determinant;
    out[9]=(a01*b08-a00*b10-a03*b06)*determinant;
    out[10]=(a30*b04-a31*b02+a33*b00)*determinant;
    out[11]=(a21*b02-a20*b04-a23*b00)*determinant;
    out[12]=(a11*b07-a10*b09-a12*b06)*determinant;
    out[13]=(a00*b09-a01*b07+a02*b06)*determinant;
    out[14]=(a31*b01-a30*b03-a32*b00)*determinant;
    out[15]=(a20*b03-a21*b01+a22*b00)*determinant;
    return out;
  },

  transformPoint(matrix, point) {
    const [x,y,z]=point;
    const w=matrix[3]*x+matrix[7]*y+matrix[11]*z+matrix[15];
    return [
      (matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12])/w,
      (matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13])/w,
      (matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14])/w,
    ];
  },
};
