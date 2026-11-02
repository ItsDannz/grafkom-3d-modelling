/** Geometri unit berpusat di origin. Semua segitiga memakai winding CCW. */
export function createPrimitives() {
  const box={positions:[],normals:[],uvs:[],indices:[]};
  const faces=[
    [[0,0,.5],[1,0,0],[0,1,0],[0,0,1]],
    [[0,0,-.5],[-1,0,0],[0,1,0],[0,0,-1]],
    [[.5,0,0],[0,0,-1],[0,1,0],[1,0,0]],
    [[-.5,0,0],[0,0,1],[0,1,0],[-1,0,0]],
    [[0,.5,0],[1,0,0],[0,0,-1],[0,1,0]],
    [[0,-.5,0],[1,0,0],[0,0,1],[0,-1,0]],
  ];
  for (const [center,u,v,normal] of faces) {
    const offset=box.positions.length/3;
    for (const [s,t] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
      box.positions.push(...center.map((value,i)=>value+(u[i]*s+v[i]*t)*.5));
      box.normals.push(...normal);box.uvs.push((s+1)/2,(t+1)/2);
    }
    box.indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
  }
  const sphere={positions:[],normals:[],uvs:[],indices:[]};
  const latitude=10,longitude=16;
  for (let y=0;y<=latitude;y++) {
    const theta=y*Math.PI/latitude;
    for (let x=0;x<=longitude;x++) {
      const phi=x*Math.PI*2/longitude;
      const normal=[Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi)];
      sphere.positions.push(...normal.map(value=>value*.5));sphere.normals.push(...normal);
      sphere.uvs.push(x/longitude,1-y/latitude);
      if (y<latitude&&x<longitude) {
        const a=y*(longitude+1)+x,b=a+longitude+1;
        sphere.indices.push(a,a+1,b,b,a+1,b+1);
      }
    }
  }
  return {
    box,sphere,cylinder:createCylinder(.5,.5),cone:createCylinder(.5,0),
    plane:{positions:[-.5,0,-.5,-.5,0,.5,.5,0,.5,.5,0,-.5],
      normals:[0,1,0,0,1,0,0,1,0,0,1,0],uvs:[0,0,0,1,1,1,1,0],indices:[0,1,2,0,2,3]},
    disc:createDisc(),
  };
}

function createCylinder(bottomRadius,topRadius,segments=16) {
  const mesh={positions:[],normals:[],uvs:[],indices:[]};
  const slope=bottomRadius-topRadius,normalLength=Math.hypot(1,slope);
  for (let row=0;row<2;row++) {
    for (let j=0;j<=segments;j++) {
      const angle=j/segments*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
      const radius=row?topRadius:bottomRadius;
      mesh.positions.push(c*radius,row-.5,s*radius);
      mesh.normals.push(c/normalLength,slope/normalLength,s/normalLength);
      mesh.uvs.push(j/segments,row);
      if (!row&&j<segments) {
        const a=j,b=segments+1+j;
        mesh.indices.push(a,b,a+1,a+1,b,b+1);
      }
    }
  }
  for (const [radius,y,normal] of [[bottomRadius,-.5,-1],[topRadius,.5,1]]) {
    if (!radius) continue;
    const offset=mesh.positions.length/3;
    mesh.positions.push(0,y,0);mesh.normals.push(0,normal,0);mesh.uvs.push(.5,.5);
    for (let j=0;j<=segments;j++) {
      const angle=j/segments*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
      mesh.positions.push(c*radius,y,s*radius);mesh.normals.push(0,normal,0);
      mesh.uvs.push(c*.5+.5,s*.5+.5);
      if (j<segments) {
        if (normal>0) mesh.indices.push(offset,offset+j+2,offset+j+1);
        else mesh.indices.push(offset,offset+j+1,offset+j+2);
      }
    }
  }
  return mesh;
}

function createDisc(segments=40) {
  const mesh={positions:[0,0,0],normals:[0,1,0],uvs:[.5,.5],indices:[]};
  for (let j=0;j<=segments;j++) {
    const angle=j/segments*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
    mesh.positions.push(c*.5,0,s*.5);mesh.normals.push(0,1,0);mesh.uvs.push(c*.5+.5,s*.5+.5);
    if (j<segments) mesh.indices.push(0,j+2,j+1);
  }
  return mesh;
}

/** Normal rata-rata untuk custom mesh yang tidak menyertakan normals. */
export function deriveNormals(positions,indices) {
  const normals=new Float32Array(positions.length);
  for (let i=0;i<indices.length;i+=3) {
    const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
    const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
    const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for (const index of [a,b,c]) {normals[index]+=nx;normals[index+1]+=ny;normals[index+2]+=nz;}
  }
  for (let i=0;i<normals.length;i+=3) {
    const length=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
    normals[i]/=length;normals[i+1]/=length;normals[i+2]/=length;
  }
  return normals;
}
