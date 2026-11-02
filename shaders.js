import {SITE_LEVELS} from './js/site-levels.js';
/** GLSL bersama untuk WebGL 2 dan WebGL 1; pencahayaan dihitung linear. */
export function createShaderSources(webgl2,fragmentPrecision='highp') {
  const header=webgl2?'#version 300 es\n':'';
  const input=webgl2?'in':'attribute',output=webgl2?'out':'varying',varyingIn=webgl2?'in':'varying';
  const fragOut=webgl2?'out vec4 fragmentColor;':'',write=webgl2?'fragmentColor':'gl_FragColor';
  const sample=webgl2?'texture':'texture2D';
  const attributes=`${input} vec3 a_position; ${input} vec3 a_normal; ${input} vec2 a_texcoord;
    ${input} vec4 a_model0; ${input} vec4 a_model1; ${input} vec4 a_model2; ${input} vec4 a_model3;`;
  const waves=`
    // Riak pendek dari arah tak sejajar; normal memakai turunan analitis.
    vec3 waterWaves(vec2 p,float t,float strength) {
      vec4 phases=vec4(dot(p,vec2(1.71,.93))+t*.63,dot(p,vec2(-1.14,2.43))-t*.79,
        dot(p,vec2(6.31,4.72))+t*1.17,dot(p,vec2(-9.41,6.13))-t*1.47);
      vec4 weights=vec4(.008,.006,.0018,.0011)*strength,derivative=cos(phases)*weights;
      return vec3(dot(sin(phases),weights),dot(derivative,vec4(1.71,-1.14,6.31,-9.41)),
        dot(derivative,vec4(.93,2.43,4.72,6.13)));
    }
  `;
  return {
    vertex:`${header}precision highp float;
      ${attributes}
      uniform mat4 u_view; uniform mat4 u_projection; uniform mat4 uLightViewProjection; uniform mat4 uReflectionViewProjection;
      uniform float uTime; uniform float uWater; uniform float uWaterStrength;
      ${output} vec3 vWorld; ${output} vec3 vNormal; ${output} vec2 vUV;
      ${output} vec4 vShadow; ${output} vec4 vReflection;
      ${waves}
      void main() {
        mat4 model=mat4(a_model0,a_model1,a_model2,a_model3);vec4 world=model*vec4(a_position,1.0);
        // Cofactor/determinan = inverse-transpose, juga untuk skala tak seragam.
        vec3 c0=a_model0.xyz,c1=a_model1.xyz,c2=a_model2.xyz;
        vec3 n0=cross(c1,c2),n1=cross(c2,c0),n2=cross(c0,c1);
        vec3 transformed=(n0*a_normal.x+n1*a_normal.y+n2*a_normal.z)*(dot(c0,n0)<0.0?-1.0:1.0);
        vNormal=length(transformed)>.000001?normalize(transformed):vec3(0.0,1.0,0.0);
        if(uWater>.5)world.y+=waterWaves(world.xz,uTime,uWaterStrength).x*.08;
        vWorld=world.xyz;vUV=a_texcoord;vShadow=uLightViewProjection*world;vReflection=uReflectionViewProjection*world;
        // P × V × M × posisi lokal; M sudah membentuk world di atas.
        gl_Position=u_projection*u_view*world;
      }
    `,
    fragment:`${header}precision ${fragmentPrecision} float;
      ${varyingIn} vec3 vWorld; ${varyingIn} vec3 vNormal; ${varyingIn} vec2 vUV;
      ${varyingIn} vec4 vShadow; ${varyingIn} vec4 vReflection;
      uniform vec4 uColor; uniform vec2 uUVScale; uniform sampler2D uTexture;
      uniform sampler2D uShadowMap; uniform sampler2D uReflection;
      uniform float uUseTexture; uniform float uShadowEnabled; uniform float uReflectionEnabled;
      uniform float uShadowTexel; uniform float uReceiveShadow; uniform float uAlphaCutoff;
      uniform vec3 uEye; uniform vec3 uSunDirection; uniform float uLighting;
      uniform float uShininess; uniform float uSpecular; uniform float uTime;
      uniform float uWater; uniform float uWaterStrength; uniform float uExposure;
      uniform float uFoliage; uniform float uSurfaceType; uniform float uClipWater;
      ${fragOut}${waves}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+1.0),f.x),f.y);}
      float readDepth(vec2 uv){return dot(${sample}(uShadowMap,uv),vec4(1.0/16777216.0,1.0/65536.0,1.0/256.0,1.0))*(255.0/256.0);}
      float shadowVisibility(vec3 normal,vec3 light) {
        if(uShadowEnabled<.5||uReceiveShadow<.5)return 1.0;
        vec3 p=vShadow.xyz/vShadow.w*.5+.5;
        if(p.x<.002||p.x>.998||p.y<.002||p.y>.998||p.z<0.0||p.z>1.0)return 1.0;
        float bias=.00070+.00250*(1.0-max(dot(normal,light),0.0)),visibility=0.0;
        // 3x3 PCF: bayangan mengikuti geometri kanopi, bukan lingkaran dekoratif.
        for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)
          visibility+=step(p.z-bias,readDepth(p.xy+vec2(float(x),float(y))*uShadowTexel*1.25));
        return visibility/9.0;
      }
      void main() {
        // Klip dasar danau pada pass kamera pantulan.
        if(uClipWater>.5&&vWorld.y<${(SITE_LEVELS.water-.005).toFixed(3)})discard;
        vec4 texel=vec4(1.0);if(uUseTexture>.5)texel=${sample}(uTexture,vUV*uUVScale);
        float alpha=uColor.a*texel.a;if(alpha<max(.015,uAlphaCutoff))discard;
        vec3 base=max(uColor.rgb*texel.rgb,vec3(0.0));
        float patches=noise(vWorld.xz*.24)*.64+noise(vWorld.xz*.92)*.36;
        if(uSurfaceType>.5&&uSurfaceType<1.5) {
          base*=.84+patches*.30;
          base=mix(base,base*vec3(1.17,1.04,.72),smoothstep(.58,.85,patches)*.43);
        } else if(uSurfaceType>3.5)base*=.86+patches*.25;
        if(uFoliage>.5)base*=mix(vec3(.86,.94,.82),vec3(1.13,1.07,.94),noise(vWorld.xz*.74+vWorld.y*.41));
        vec3 albedo=pow(clamp(base,0.0,1.0),vec3(2.2));
        vec3 N=normalize(vNormal),V=normalize(uEye-vWorld),L=normalize(uSunDirection);
        if(!gl_FrontFacing)N=-N;
        if(uWater>.5){vec3 w=waterWaves(vWorld.xz,uTime,uWaterStrength);N=normalize(vec3(-w.y,1.0,-w.z));}
        float visibility=shadowVisibility(N,L),diffuse=max(dot(N,L),0.0);vec3 lit=albedo;
        if(uLighting>.5) {
          vec3 hemi=mix(vec3(.27,.29,.23),vec3(.62,.68,.73),N.y*.5+.5);
          lit=albedo*(hemi*.64+vec3(1.0,.96,.85)*diffuse*visibility*1.08);
          float shine=pow(max(dot(reflect(-L,N),V),0.0),uShininess);
          lit+=vec3(1.0,.97,.90)*shine*uSpecular*visibility*step(0.0,dot(N,L));
          if(uFoliage>.5) {
            float transmit=pow(max(dot(-N,L),0.0),.72)*.28,edge=pow(max(dot(V,-L),0.0),4.0)*.12;
            lit+=albedo*vec3(.80,1.03,.48)*(transmit+edge)*(.30+.70*visibility)+albedo*vec3(.08,.12,.04);
          }
          if(uWater>.5) {
            vec3 murky=pow(mix(uColor.rgb,vec3(.28,.30,.15),.58),vec3(2.2));
            lit=murky*(.38+.40*diffuse)*(.75+.25*visibility);
            float fresnel=.24+.48*pow(1.0-max(dot(N,V),0.0),3.0);
            vec2 uv=vReflection.xy/vReflection.w*.5+.5+N.xz*.042;
            vec3 reflected=pow(vec3(.57,.63,.56),vec3(2.2));
            if(uReflectionEnabled>.5&&uv.x>0.0&&uv.x<1.0&&uv.y>0.0&&uv.y<1.0)
              reflected=pow(${sample}(uReflection,clamp(uv,.002,.998)).rgb,vec3(2.2));
            lit=mix(lit,reflected*vec3(.96,.92,.58),fresnel);
            lit+=vec3(1.0,.97,.83)*pow(max(dot(reflect(-L,N),V),0.0),220.0)*.30*visibility;
          }
        }
        vec3 mapped=vec3(1.0)-exp(-max(lit,vec3(0.0))*max(uExposure,.1)*1.27);
        vec3 color=pow(mapped,vec3(1.0/2.2));
        color=mix(color,vec3(.78,.80,.75),smoothstep(120.0,320.0,length(uEye-vWorld))*.38);
        ${write}=vec4(color,alpha);
      }
    `,
    depthVertex:`${header}precision highp float;
      ${attributes} uniform mat4 uLightViewProjection;${output} vec2 vUV;
      void main(){vUV=a_texcoord;gl_Position=uLightViewProjection*mat4(a_model0,a_model1,a_model2,a_model3)*vec4(a_position,1.0);}
    `,
    depthFragment:`${header}precision ${fragmentPrecision} float;
      ${varyingIn} vec2 vUV;uniform sampler2D uTexture;uniform vec2 uUVScale;
      uniform float uAlphaCutoff;uniform float uUseTexture;uniform float uAlpha;${fragOut}
      vec4 packDepth(float depth){vec4 encoded=fract(depth*vec4(16777216.0,65536.0,256.0,1.0));
        // RGBA8 stores byte / 255, while the packed digits use base 256.
        return (encoded-encoded.xxyz*vec4(0.0,1.0/256.0,1.0/256.0,1.0/256.0))*(256.0/255.0);}
      void main(){float alpha=uAlpha;if(uUseTexture>.5)alpha*=${sample}(uTexture,vUV*uUVScale).a;
        if(alpha<max(.02,uAlphaCutoff))discard;${write}=packDepth(gl_FragCoord.z);}
    `,
    skyVertex:`${header}precision highp float;${input} vec2 aScreen;${output} vec2 vScreen;
      void main(){vScreen=aScreen;gl_Position=vec4(aScreen,.9999,1.0);}
    `,
    skyFragment:`${header}precision ${fragmentPrecision} float;${varyingIn} vec2 vScreen;
      uniform mat4 uInverseViewProjection;uniform vec3 uEye;uniform vec3 uSunDirection;${fragOut}
      void main(){vec4 farPoint=uInverseViewProjection*vec4(vScreen,1.0,1.0);
        vec3 ray=normalize(farPoint.xyz/farPoint.w-uEye);float h=clamp(ray.y,0.0,1.0);
        vec3 color=mix(vec3(.82,.83,.77),vec3(.62,.71,.75),pow(h,.48));
        color=mix(color,vec3(.52,.58,.46),clamp(-ray.y*1.4,0.0,1.0));
        float sun=max(dot(ray,uSunDirection),0.0);
        color+=vec3(1.0,.85,.59)*(pow(sun,1300.0)*.48+pow(sun,35.0)*.075);
        ${write}=vec4(color,1.0);}
    `,
  };
}
