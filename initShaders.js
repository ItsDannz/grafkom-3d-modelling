/** Helper shader/program seperti praktikum; menerima source GLSL pada ES module. */
export function createShader(gl,type,source) {
  const shader=gl.createShader(type);
  if(!shader)throw new Error('Shader WebGL tidak dapat dibuat.');
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
    const info=gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error:\n${info}`);
  }
  return shader;
}

export function createProgram(gl,vertexShader,fragmentShader,attributes={}) {
  const program=gl.createProgram();
  if(!program)throw new Error('Program WebGL tidak dapat dibuat.');
  gl.attachShader(program,vertexShader);
  gl.attachShader(program,fragmentShader);
  for(const [name,location] of Object.entries(attributes))gl.bindAttribLocation(program,location,name);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) {
    const info=gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error:\n${info}`);
  }
  return program;
}

export function initShaders(gl,vertexSource,fragmentSource,attributes={}) {
  let vertexShader,fragmentShader;
  try {
    vertexShader=createShader(gl,gl.VERTEX_SHADER,vertexSource);
    fragmentShader=createShader(gl,gl.FRAGMENT_SHADER,fragmentSource);
    return createProgram(gl,vertexShader,fragmentShader,attributes);
  } finally {
    if(vertexShader)gl.deleteShader(vertexShader);
    if(fragmentShader)gl.deleteShader(fragmentShader);
  }
}
