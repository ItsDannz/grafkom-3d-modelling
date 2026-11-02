import {Mat4,degToRad} from './math3d.js';
import {traverse} from './hierarchy.js';
import {initShaders} from './initShaders.js';
import {createPrimitives,deriveNormals} from './js/geometry.js';
import {createTextureCanvases} from './js/textures.js';
import {createShaderSources} from './shaders.js';
import {SITE_LEVELS} from './js/site-levels.js';

/** Membuat renderer WebGL murni; tidak memakai Three.js atau library luar. */
export function createRenderer(canvas) {
  // 1. Context → 2. shader/program → 3. buffer/attribute → 4. uniform → 5. draw.
  const contextOptions={alpha:false,antialias:true,depth:true,stencil:false,
    preserveDrawingBuffer:true,premultipliedAlpha:false,powerPreference:'high-performance'};
  let gl=null,webgl2=false;
  try{gl=canvas.getContext('webgl2',contextOptions);webgl2=!!gl;}catch{}
  if(!gl)gl=canvas.getContext('webgl',contextOptions)||canvas.getContext('experimental-webgl',contextOptions);
  if(!gl)throw new Error('WebGL tidak tersedia. Aktifkan akselerasi grafis browser, lalu muat ulang halaman.');
  const angle=webgl2?null:gl.getExtension('ANGLE_instanced_arrays');
  const uintIndices=webgl2||gl.getExtension('OES_element_index_uint');
  const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const instancing=webgl2||!!angle;
  const divisor=(location,value)=>{
    if(webgl2)gl.vertexAttribDivisor(location,value);
    else if(angle)angle.vertexAttribDivisorANGLE(location,value);
  };
  const drawInstanced=(mesh,count)=>{
    if(webgl2)gl.drawElementsInstanced(gl.TRIANGLES,mesh.count,mesh.indexType,0,count);
    else angle.drawElementsInstancedANGLE(gl.TRIANGLES,mesh.count,mesh.indexType,0,count);
  };
  const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision?'highp':'mediump';
  const sources=createShaderSources(webgl2,precision);
  const program=initShaders(gl,sources.vertex,sources.fragment,
    {a_position:0,a_normal:1,a_texcoord:2,a_model0:3,a_model1:4,a_model2:5,a_model3:6});
  const skyProgram=initShaders(gl,sources.skyVertex,sources.skyFragment,{aScreen:0});
  const shadowProgram=precision==='highp'?initShaders(gl,sources.depthVertex,sources.depthFragment,
    {a_position:0,a_texcoord:2,a_model0:3,a_model1:4,a_model2:5,a_model3:6}):null;
  const uniforms=getUniforms(gl,program,['u_view','u_projection','uTime','uWater','uWaterStrength','uColor',
    'uUVScale','uTexture','uUseTexture','uEye','uSunDirection','uLighting','uShininess','uSpecular','uExposure',
    'uLightViewProjection','uReflectionViewProjection','uShadowMap','uShadowEnabled','uShadowTexel',
    'uReflection','uReflectionEnabled','uReceiveShadow','uFoliage','uAlphaCutoff','uSurfaceType','uClipWater']);
  const shadowUniforms=shadowProgram?getUniforms(gl,shadowProgram,['uLightViewProjection','uTexture','uUVScale','uUseTexture','uAlphaCutoff','uAlpha']):{};
  const skyUniforms=getUniforms(gl,skyProgram,['uInverseViewProjection','uEye','uSunDirection']);
  const instanceBuffer=gl.createBuffer();
  const skyBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const primitives=createPrimitives(),meshCache=new WeakMap(),allMeshes=[];
  const imageTextures=new WeakMap(),imageIds=new WeakMap(),allTextures=[];
  const generatedTextures=new Map();
  let meshId=0,imageId=0,contextLost=false,disposed=false;
  const stats={drawCalls:0,triangles:0,instances:0,
    webglVersion:webgl2?'WebGL 2':instancing?'WebGL 1 + ANGLE':'WebGL 1'};
  for(const [name,source] of createTextureCanvases())generatedTextures.set(name,uploadTexture(source,true));
  const maxBufferSize=gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  const view=Mat4.identity(),projection=Mat4.identity(),viewProjection=Mat4.identity(),inverseVP=Mat4.identity();
  const lightView=Mat4.identity(),lightProjection=Mat4.identity(),lightVP=Mat4.identity();
  const reflectionView=Mat4.identity(),reflectionVP=Mat4.identity(),reflectionInverseVP=Mat4.identity();
  const shadowTarget=shadowProgram?createTarget(Math.min(2048,maxBufferSize),Math.min(2048,maxBufferSize),false):null;
  let reflectionTarget=null,reflectionFrame=0,reflectionValid=false;
  let shadowValid=false,previousShadows=false,lastSunKey='';
  const features={shadows:!!shadowTarget,reflections:true};
  const onContextLost=(event)=>{event.preventDefault();contextLost=true;};
  canvas.addEventListener('webglcontextlost',onContextLost);

  // RGBA-packing dengan depth renderbuffer bekerja pada WebGL 1 tanpa
  // WEBGL_depth_texture. Filter depth dilakukan manual di shader (PCF).
  function createTarget(width,height,linear) {
    const target={width,height,framebuffer:gl.createFramebuffer(),texture:gl.createTexture(),depth:gl.createRenderbuffer()};
    gl.bindTexture(gl.TEXTURE_2D,target.texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,linear?gl.LINEAR:gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,linear?gl.LINEAR:gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindRenderbuffer(gl.RENDERBUFFER,target.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
    gl.bindFramebuffer(gl.FRAMEBUFFER,target.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,target.texture,0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,target.depth);
    const complete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
    if(!complete){deleteTarget(target);return null;}return target;
  }
  function deleteTarget(target) {
    if(!target)return;gl.deleteFramebuffer(target.framebuffer);gl.deleteRenderbuffer(target.depth);gl.deleteTexture(target.texture);
  }

  function uploadTexture(source,repeat) {
    const texture=gl.createTexture();
    if(!texture)throw new Error('Memori GPU tidak cukup untuk membuat tekstur.');
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
    const width=source.width,height=source.height;
    const powerOfTwo=width>0&&height>0&&(width&(width-1))===0&&(height&(height-1))===0;
    const canMipmap=webgl2||powerOfTwo;
    const wrap=repeat&&(webgl2||powerOfTwo)?gl.REPEAT:gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,wrap);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,wrap);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,canMipmap?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);
    if(canMipmap)gl.generateMipmap(gl.TEXTURE_2D);
    if(anisotropy&&canMipmap)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,
      Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    allTextures.push(texture);
    return texture;
  }

  // GEOMETRY BUFFER: position, normal dan UV, disusul index buffer.
  function getMesh(definition) {
    const data=typeof definition==='string'?primitives[definition]:definition;
    if(!data)throw new Error(`Geometri tidak dikenal: ${String(definition)}.`);
    let cached=meshCache.get(data);
    if(cached)return cached;
    const positions=data.positions;
    if(!positions||positions.length%3||!positions.length)throw new Error('Custom mesh perlu positions berisi triplet XYZ.');
    const vertexCount=positions.length/3;
    const indices=data.indices??Array.from({length:vertexCount},(_,index)=>index);
    let maxIndex=0;
    for(let i=0;i<indices.length;i++) {
      const value=indices[i];
      if(!Number.isInteger(value)||value<0||value>=vertexCount)throw new Error('Indeks custom mesh berada di luar rentang vertex.');
      if(value>maxIndex)maxIndex=value;
    }
    if(indices.length%3)throw new Error('Indices custom mesh harus berupa segitiga (kelipatan 3).');
    if(maxIndex>65535&&!uintIndices)throw new Error('Mesh terlalu besar untuk WebGL 1 pada perangkat ini.');
    const normals=data.normals?.length===positions.length?data.normals:deriveNormals(positions,indices);
    const uvs=data.uvs;
    const vertices=new Float32Array(vertexCount*8);
    for(let i=0;i<vertexCount;i++) {
      const j=i*8,k=i*3;
      vertices[j]=positions[k];vertices[j+1]=positions[k+1];vertices[j+2]=positions[k+2];
      vertices[j+3]=normals[k];vertices[j+4]=normals[k+1];vertices[j+5]=normals[k+2];
      vertices[j+6]=uvs?.[i*2]??0;vertices[j+7]=uvs?.[i*2+1]??0;
    }
    const indexArray=maxIndex>65535?new Uint32Array(indices):new Uint16Array(indices);
    const vertexBuffer=gl.createBuffer(),indexBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indexArray,gl.STATIC_DRAW);
    cached={id:++meshId,vertexBuffer,indexBuffer,count:indices.length,
      indexType:maxIndex>65535?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,triangles:indices.length/3};
    meshCache.set(data,cached);allMeshes.push(cached);
    return cached;
  }

  function normalizeMaterial(material) {
    const color=material.color??[.72,.74,.68,1];
    const rgba=[color[0]??.72,color[1]??.74,color[2]??.68,color[3]??1];
    const uvScale=material.uvScale??[1,1];
    let imageKey=0;
    if(material.image) {
      imageKey=imageIds.get(material.image);
      if(!imageKey){imageKey=++imageId;imageIds.set(material.image,imageKey);}
      if(!imageTextures.has(material.image))imageTextures.set(material.image,uploadTexture(material.image,false));
    }
    const textureName=material.texture??'none';
    const roughFactor=['grass','soil','mulch','bark'].includes(textureName)?.15:['paving','pavingSquare','concrete','stone'].includes(textureName)?.35:1;
    const shininess=Math.max(1,material.shininess??32),specular=(material.specular??.16)*roughFactor;
    const water=!!material.water;
    const doubleSided=!!material.doubleSided,foliage=!!material.foliage;
    const alphaCutoff=material.alphaCutoff??0;
    const castShadow=material.castShadow!==false,receiveShadow=material.receiveShadow!==false;
    const surfaceType={grass:1,bark:2,paving:3,pavingSquare:3,soil:4,mulch:5,stone:6}[textureName]??0;
    const texture=material.image?imageTextures.get(material.image):(generatedTextures.get(textureName)||generatedTextures.get('none'));
    const key=[...rgba,...uvScale,textureName,shininess,specular,water,imageKey,doubleSided,foliage,alphaCutoff,castShadow,receiveShadow].join('|');
    return {key,color:rgba,uvScale,texture,hasTexture:!!material.image||textureName!=='none',
      shininess,specular,water,doubleSided,foliage,alphaCutoff,castShadow,receiveShadow,surfaceType,
      transparent:rgba[3]<.999||!!material.image};
  }

  function resize(quality='balanced') {
    // Batas pixel menjaga kelancaran ketika canvas menjadi layar penuh.
    // Detail tinggi tetap tersedia tanpa mengubah geometri ataupun efek.
    const high=quality==='high',ratio=Math.min(globalThis.devicePixelRatio||1,high?2:1.5);
    let width=(canvas.clientWidth||canvas.width||800)*ratio;
    let height=(canvas.clientHeight||canvas.height||500)*ratio;
    const factor=Math.min(1,Math.sqrt((high?3200000:950000)/(width*height)),maxBufferSize/width,maxBufferSize/height);
    width=Math.max(1,Math.round(width*factor));height=Math.max(1,Math.round(height*factor));
    const changed=canvas.width!==width||canvas.height!==height;
    if(changed){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,canvas.width,canvas.height);
    return changed;
  }

  // FRAME: view/projection → traverse hierarki → unggah model → render passes.
  function render(root,camera,state={}) {
    if(disposed)throw new Error('Renderer sudah dibersihkan.');
    if(contextLost||gl.isContextLost())throw new Error('Konteks WebGL terputus. Muat ulang halaman untuk memulihkan tampilan 3D.');
    resize(state.quality);
    const eye=camera.eye,target=camera.target;
    Mat4.lookAt(eye,target,[0,1,0],view);
    if(camera.projection==='orthographic') {
      const half=(camera.orthoSpan??60)/2,aspect=canvas.width/canvas.height;
      Mat4.orthographic(-half*aspect,half*aspect,-half,half,camera.near??.15,camera.far??220,projection);
    } else Mat4.perspective(degToRad(camera.fov??45),canvas.width/canvas.height,camera.near??.15,camera.far??220,projection);
    Mat4.multiply(projection,view,viewProjection);Mat4.invert(viewProjection,inverseVP);
    const elevation=degToRad(state.sunElevation??42),azimuth=degToRad(state.sunAzimuth??-35);
    const sun=[Math.cos(elevation)*Math.cos(azimuth),Math.sin(elevation),Math.cos(elevation)*Math.sin(azimuth)];
    const groups=new Map(),materialCache=new WeakMap();let instanceCount=0;
    const collect=node=>{
      if(node.mesh) {
        const mesh=getMesh(node.mesh),rawMaterial=node.material??{};
        let material=materialCache.get(rawMaterial);
        if(!material){material=normalizeMaterial(rawMaterial);materialCache.set(rawMaterial,material);}
        if(material.color[3]>.001) {
          const key=`${mesh.id}:${material.key}`;let group=groups.get(key);
          if(!group){group={mesh,material,transforms:[],distance:0,instanceOffset:0};groups.set(key,group);}
          group.transforms.push(node.worldMatrix);
          group.distance+=Math.hypot(node.worldMatrix[12]-eye[0],node.worldMatrix[13]-eye[1],node.worldMatrix[14]-eye[2]);instanceCount++;
        }
      }
    };
    traverse(root,collect,{visibleOnly:true});
    const opaque=[],transparent=[];
    // Satu unggahan matriks per frame dipakai ulang oleh ketiga pass GPU.
    // Ini menghindari ribuan bufferData ketika vegetasi memakai banyak daun.
    const instanceData=new Float32Array(instanceCount*16);let offset=0;
    for(const group of groups.values()) {
      group.instanceOffset=offset*64;
      for(const transform of group.transforms){instanceData.set(transform,offset*16);offset++;}
      group.distance/=group.transforms.length;(group.material.transparent?transparent:opaque).push(group);
    }
    if(instancing){gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,instanceData,gl.DYNAMIC_DRAW);}
    transparent.sort((a,b)=>b.distance-a.distance);
    stats.drawCalls=0;stats.triangles=0;stats.instances=instanceCount;
    const shadows=features.shadows&&state.shadows!==false&&state.lighting!==false;
    const reflections=features.reflections&&state.reflections!==false&&state.lighting!==false;
    // Fit the light frustum to the current site, independently of the orbit camera.
    const bounds=root.renderBounds??{minX:-44,maxX:44,minZ:-66,maxZ:32};
    const centre=[(bounds.minX+bounds.maxX)/2,5,(bounds.minZ+bounds.maxZ)/2];
    Mat4.lookAt(centre.map((v,k)=>v+sun[k]*200),centre,[0,1,0],lightView);
    const corners=[bounds.minX,bounds.maxX].flatMap(x=>[-2,18].flatMap(y=>[bounds.minZ,bounds.maxZ].map(z=>Mat4.transformPoint(lightView,[x,y,z]))));
    const lo=[0,1,2].map(k=>Math.min(...corners.map(p=>p[k]))),hi=[0,1,2].map(k=>Math.max(...corners.map(p=>p[k])));
    Mat4.orthographic(lo[0]-3,hi[0]+3,lo[1]-3,hi[1]+3,Math.max(1,-hi[2]-5),-lo[2]+5,lightProjection);Mat4.multiply(lightProjection,lightView,lightVP);
    const sunKey=`${state.sunElevation??42}|${state.sunAzimuth??-35}`;
    // Selang-seling dengan pantulan membagi beban GPU; posisi matahari baru
    // tetap langsung memperbarui peta. Pada 60 fps, bayangan bergerak 30 Hz.
    if(shadows&&(!shadowValid||!previousShadows||reflectionFrame%2===1||sunKey!==lastSunKey)) {
      renderShadowPass([...opaque,...transparent],state);shadowValid=true;lastSunKey=sunKey;
    }
    previousShadows=shadows;
    const reflectionWidth=Math.min(1024,Math.max(256,Math.round(canvas.width*.55)));
    const reflectionHeight=Math.min(768,Math.max(192,Math.round(canvas.height*.55)));
    if(reflections&&(!reflectionTarget||reflectionTarget.width!==reflectionWidth||reflectionTarget.height!==reflectionHeight)) {
      deleteTarget(reflectionTarget);reflectionTarget=createTarget(reflectionWidth,reflectionHeight,true);
      reflectionValid=false;features.reflections=!!reflectionTarget;
    }
    // Pantulan planar: kamera dipantulkan pada tinggi air bersama geometri,
    // muka air dirender ke FBO. Air sendiri dilewati untuk mencegah rekursi.
    if(reflections&&reflectionTarget&&(!reflectionValid||reflectionFrame%2===0)) {
      const reflectionEye=[eye[0],2*SITE_LEVELS.water-eye[1],eye[2]],reflectionTargetPoint=[target[0],2*SITE_LEVELS.water-target[1],target[2]];
      Mat4.lookAt(reflectionEye,reflectionTargetPoint,[0,-1,0],reflectionView);
      Mat4.multiply(projection,reflectionView,reflectionVP);Mat4.invert(reflectionVP,reflectionInverseVP);
      gl.bindFramebuffer(gl.FRAMEBUFFER,reflectionTarget.framebuffer);gl.viewport(0,0,reflectionTarget.width,reflectionTarget.height);
      renderColorPass(opaque,transparent,reflectionView,projection,reflectionInverseVP,reflectionEye,sun,state,shadows,true);
      reflectionValid=true;
    }
    reflectionFrame++;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
    renderColorPass(opaque,transparent,view,projection,inverseVP,eye,sun,state,shadows,false);
    for(let location=3;location<7;location++)divisor(location,0);
    return stats;
  }

  function renderShadowPass(groups,state) {
    // Jangan biarkan sampler program main menunjuk texture yang sedang
    // dipakai sebagai attachment framebuffer (feedback loop WebGL).
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,generatedTextures.get('none'));
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,generatedTextures.get('none'));
    gl.bindFramebuffer(gl.FRAMEBUFFER,shadowTarget.framebuffer);gl.viewport(0,0,shadowTarget.width,shadowTarget.height);
    // Packed RGBA depth is data: colour dithering corrupts its low bytes.
    gl.disable(gl.DITHER);
    gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
    gl.clearColor(1,1,1,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(shadowProgram);gl.uniformMatrix4fv(shadowUniforms.uLightViewProjection,false,lightVP);
    gl.uniform1i(shadowUniforms.uTexture,0);gl.activeTexture(gl.TEXTURE0);
    for(const group of groups) {
      const material=group.material;
      if(!material.castShadow||material.water||(material.transparent&&material.color[3]<.95))continue;
      bindGroupGeometry(group);
      gl.uniform2fv(shadowUniforms.uUVScale,material.uvScale);
      gl.uniform1f(shadowUniforms.uAlphaCutoff,material.alphaCutoff);
      gl.uniform1f(shadowUniforms.uAlpha,material.color[3]);
      gl.uniform1f(shadowUniforms.uUseTexture,state.textures===false?0:material.hasTexture?1:0);
      gl.bindTexture(gl.TEXTURE_2D,material.texture);
      // Daun dua sisi juga menutup cahaya pada peta bayangan.
      if(material.doubleSided)gl.disable(gl.CULL_FACE);else {gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);}
      issueDraw(group);
    }
  }

  function renderColorPass(opaque,transparent,viewMatrix,projectionMatrix,inverse,eye,sun,state,shadows,reflectionPass) {
    gl.enable(gl.DITHER);
    gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    // clear mematuhi depthMask: aktifkan sebelum SETIAP pass/frame.
    gl.depthMask(true);gl.clearColor(.73,.79,.77,1);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.depthMask(false);gl.useProgram(skyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
    gl.enableVertexAttribArray(0);divisor(0,0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    for(let location=1;location<7;location++){gl.disableVertexAttribArray(location);divisor(location,0);}
    gl.uniformMatrix4fv(skyUniforms.uInverseViewProjection,false,inverse);
    gl.uniform3fv(skyUniforms.uEye,eye);gl.uniform3fv(skyUniforms.uSunDirection,sun);
    gl.drawArrays(gl.TRIANGLES,0,3);stats.drawCalls++;stats.triangles++;
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);
    gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);gl.useProgram(program);
    gl.uniform1i(uniforms.uTexture,0);gl.uniform1i(uniforms.uShadowMap,1);gl.uniform1i(uniforms.uReflection,2);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,shadows?shadowTarget.texture:generatedTextures.get('none'));
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,!reflectionPass&&reflectionValid?reflectionTarget.texture:generatedTextures.get('none'));
    gl.activeTexture(gl.TEXTURE0);
    // View dan Projection dikirim terpisah seperti pada praktikum 4.
    gl.uniformMatrix4fv(uniforms.u_view,false,viewMatrix);
    gl.uniformMatrix4fv(uniforms.u_projection,false,projectionMatrix);
    gl.uniformMatrix4fv(uniforms.uLightViewProjection,false,lightVP);
    gl.uniformMatrix4fv(uniforms.uReflectionViewProjection,false,reflectionVP);
    gl.uniform3fv(uniforms.uEye,eye);gl.uniform3fv(uniforms.uSunDirection,sun);
    gl.uniform1f(uniforms.uTime,state.time??0);gl.uniform1f(uniforms.uWaterStrength,state.waterStrength??1);
    gl.uniform1f(uniforms.uExposure,state.exposure??1);gl.uniform1f(uniforms.uLighting,state.lighting===false?0:1);
    gl.uniform1f(uniforms.uShadowEnabled,shadows?1:0);gl.uniform1f(uniforms.uShadowTexel,shadowTarget?1/shadowTarget.width:1);
    gl.uniform1f(uniforms.uReflectionEnabled,!reflectionPass&&reflectionValid&&state.reflections!==false&&state.lighting!==false?1:0);
    gl.uniform1f(uniforms.uClipWater,reflectionPass?1:0);
    for(const group of opaque)if(!reflectionPass||!group.material.water)drawGroup(group,state);
    if(transparent.length) {
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
      for(const group of transparent)if(!reflectionPass||(!group.material.water&&group.material.color[3]>.95))drawGroup(group,state);
      gl.depthMask(true);gl.disable(gl.BLEND);
    }
  }

  function bindGroupGeometry(group) {
    const {mesh}=group;
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertexBuffer);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indexBuffer);
    for(let location=0;location<3;location++){gl.enableVertexAttribArray(location);divisor(location,0);}
    gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,32,12);gl.vertexAttribPointer(2,2,gl.FLOAT,false,32,24);
    if(instancing) {
      gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);
      for(let column=0;column<4;column++) {
        const location=column+3;gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location,4,gl.FLOAT,false,64,group.instanceOffset+column*16);divisor(location,1);
      }
    } else for(let location=3;location<7;location++)gl.disableVertexAttribArray(location);
  }

  function issueDraw(group) {
    if(instancing){drawInstanced(group.mesh,group.transforms.length);stats.drawCalls++;}
    else for(const transform of group.transforms) {
      for(let column=0;column<4;column++)gl.vertexAttrib4fv(column+3,transform.subarray(column*4,column*4+4));
      gl.drawElements(gl.TRIANGLES,group.mesh.count,group.mesh.indexType,0);stats.drawCalls++;
    }
    stats.triangles+=group.mesh.triangles*group.transforms.length;
  }

  function drawGroup(group,state) {
    const {material}=group;bindGroupGeometry(group);
    gl.uniform4fv(uniforms.uColor,material.color);gl.uniform2fv(uniforms.uUVScale,material.uvScale);
    gl.uniform1f(uniforms.uShininess,material.shininess);gl.uniform1f(uniforms.uSpecular,material.specular);
    gl.uniform1f(uniforms.uWater,material.water?1:0);gl.uniform1f(uniforms.uFoliage,material.foliage?1:0);
    gl.uniform1f(uniforms.uReceiveShadow,material.receiveShadow?1:0);gl.uniform1f(uniforms.uAlphaCutoff,material.alphaCutoff);
    gl.uniform1f(uniforms.uSurfaceType,state.textures===false?0:material.surfaceType);
    gl.uniform1f(uniforms.uUseTexture,state.textures===false?0:material.hasTexture?1:0);gl.bindTexture(gl.TEXTURE_2D,material.texture);
    if(material.doubleSided)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);
    issueDraw(group);
  }

  function dispose() {
    if(disposed)return;
    for(const mesh of allMeshes){gl.deleteBuffer(mesh.vertexBuffer);gl.deleteBuffer(mesh.indexBuffer);}
    for(const texture of allTextures)gl.deleteTexture(texture);
    deleteTarget(shadowTarget);deleteTarget(reflectionTarget);
    gl.deleteBuffer(instanceBuffer);gl.deleteBuffer(skyBuffer);gl.deleteProgram(program);gl.deleteProgram(skyProgram);if(shadowProgram)gl.deleteProgram(shadowProgram);
    canvas.removeEventListener('webglcontextlost',onContextLost);disposed=true;
  }
  return {render,resize,dispose,stats,features,gl};
}

function getUniforms(gl,program,names) {
  return Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
}

