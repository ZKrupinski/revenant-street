/* Project Z FX-only WebGL2 bloom; existing sprite PNGs and actor/HUD depth are unchanged.
 * Original alpha composite + 30% ADD + 70% bloom (14 world pixels).
 * The 2D compositor is preserved as a fallback when WebGL2 is unavailable.
 */
(function () {
  'use strict';
  const ADD = 0.30, BLOOM = 0.70, RADIUS = 14;
  const params = new URLSearchParams(location.search);
  const fxOff = params.get('fx') === 'off';
  const forceAdd = params.get('fx') === 'add';
  const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
  const limited = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 2) ||
    (coarse && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
  const layer = document.createElement('canvas');
  const c2d = layer.getContext('2d', { alpha: true });
  const gpuCanvas = document.createElement('canvas');
  let width = 0, height = 0, scale = coarse ? 0.5 : 0.5;
  let gl = null, program = null, vao = null, inputTex = null;
  let blurTex = null, framebuffer = null, locations = null, upload = null, uploadCtx = null;
  let mode = fxOff ? 'off' : (forceAdd || limited ? 'add-only' : 'pending');
  let framesSlow = 0, renders = 0, failures = 0;
  const vs = [
    '#version 300 es',
    'layout(location=0) in vec2 aPosition;',
    'out vec2 vUv;',
    'void main(){vUv=aPosition*0.5+0.5;gl_Position=vec4(aPosition,0.0,1.0);}'
  ].join('\n');
  const fs = [
    '#version 300 es',
    'precision mediump float;',
    'in vec2 vUv;',
    'uniform sampler2D uTexture;',
    'uniform vec2 uStep;',
    'uniform float uThreshold;',
    'out vec4 frag;',
    'vec4 sampleFx(vec2 delta){',
    ' vec4 c=texture(uTexture,clamp(vUv+delta,vec2(0.0),vec2(1.0)));',
    ' float light=max(c.r,max(c.g,c.b));',
    ' float mask=mix(1.0,smoothstep(0.34,0.86,light),uThreshold);',
    ' return vec4(c.rgb*mask,c.a*mask);',
    '}',
    'void main(){',
    ' vec4 sum=sampleFx(vec2(0.0))*0.227027;',
    ' for(int i=1;i<5;i++){',
    '  float d=float(i);',
    '  float w=i==1?0.194595:(i==2?0.121622:(i==3?0.054054:0.016216));',
    '  sum+=(sampleFx(uStep*d)+sampleFx(-uStep*d))*w;',
    ' }',
    ' frag=vec4(sum.rgb,clamp(sum.a,0.0,1.0));',
    '}'
  ].join('\n');
  function compile(type, code) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const reason = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('FX shader compile: ' + reason);
    }
    return shader;
  }
  function makeTexture() {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  function initialize() {
    if (mode === 'off' || mode === 'add-only' || gl) return;
    try {
      gl = gpuCanvas.getContext('webgl2', {
        alpha: true, depth: false, stencil: false, antialias: false,
        premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power'
      });
      if (!gl) throw new Error('WebGL2 unsupported');
      const vertex = compile(gl.VERTEX_SHADER, vs), fragment = compile(gl.FRAGMENT_SHADER, fs);
      program = gl.createProgram();
      gl.attachShader(program, vertex); gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error('FX program link: ' + gl.getProgramInfoLog(program));
      locations = {
        texture: gl.getUniformLocation(program, 'uTexture'),
        step: gl.getUniformLocation(program, 'uStep'),
        threshold: gl.getUniformLocation(program, 'uThreshold')
      };
      vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      inputTex = makeTexture();
      blurTex = makeTexture();
      framebuffer = gl.createFramebuffer();
      upload = document.createElement('canvas');
      uploadCtx = upload.getContext('2d', { alpha: true });
      gpuCanvas.addEventListener('webglcontextlost', e => {e.preventDefault(); mode = 'add-only'; gl = null;});
      mode = 'webgl2';
      resizeBuffers();
    } catch (err) {
      failures++; mode = 'add-only'; gl = null;
      console.warn('[Project Z FX] Bloom disabled, ADD fallback:', err);
    }
  }
  function resizeBuffers() {
    if (!gl || !width || !height) return;
    const gw = Math.max(1, Math.round(width * scale));
    const gh = Math.max(1, Math.round(height * scale));
    if (gpuCanvas.width === gw && gpuCanvas.height === gh && upload.width === gw && upload.height === gh) return;
    gpuCanvas.width = gw; gpuCanvas.height = gh;
    upload.width = gw; upload.height = gh;
    gl.bindTexture(gl.TEXTURE_2D, blurTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gw, gh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blurTex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error('FX bloom framebuffer incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gw, gh);
  }
  function begin(main, w, h) {
    if (fxOff || !c2d) return null;
    if (width !== w || height !== h) {
      width = w; height = h;
      layer.width = w; layer.height = h;
      if (gl) resizeBuffers();
    }
    c2d.save();
    c2d.setTransform(1,0,0,1,0,0);
    c2d.globalAlpha = 1;
    c2d.globalCompositeOperation = 'source-over';
    c2d.clearRect(0,0,width,height);
    c2d.restore();
    c2d.setTransform(main.getTransform());
    return c2d;
  }
  function bloomDraw() {
    if (mode === 'pending') initialize();
    if (mode !== 'webgl2' || !gl || gl.isContextLost()) return false;
    try {
      resizeBuffers();
      const gw = gpuCanvas.width, gh = gpuCanvas.height;
      uploadCtx.setTransform(1,0,0,1,0,0);
      uploadCtx.clearRect(0,0,gw,gh);
      uploadCtx.drawImage(layer,0,0,gw,gh);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(locations.texture,0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.bindTexture(gl.TEXTURE_2D,inputTex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,upload);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.viewport(0,0,gw,gh);
      gl.bindTexture(gl.TEXTURE_2D,inputTex);
      gl.uniform2f(locations.step, RADIUS*scale/(4*gw),0);
      gl.uniform1f(locations.threshold,1);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.bindTexture(gl.TEXTURE_2D,blurTex);
      gl.uniform2f(locations.step,0,RADIUS*scale/(4*gh));
      gl.uniform1f(locations.threshold,0);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      renders++;
      return true;
    } catch (err) {
      failures++; mode = 'add-only';
      console.warn('[Project Z FX] Runtime bloom fallback:',err);
      return false;
    }
  }
  function finish(main) {
    if (fxOff || !c2d) return;
    const bloomReady = bloomDraw();
    main.save();
    main.setTransform(1,0,0,1,0,0);
    main.globalAlpha = 1;
    main.globalCompositeOperation = 'source-over';
    main.drawImage(layer,0,0);
    main.globalCompositeOperation = 'lighter';
    main.globalAlpha = ADD;
    main.drawImage(layer,0,0);
    if (bloomReady) {
      main.globalAlpha = BLOOM;
      main.drawImage(gpuCanvas,0,0,width,height);
    }
    main.restore();
  }
  function performanceGuard(fps) {
    if (mode !== 'webgl2' || !fps) return;
    if (fps < 27) framesSlow++; else framesSlow = Math.max(0,framesSlow-2);
    if (framesSlow >= 4 && scale > 0.26) {
      scale = 0.25; framesSlow = 0; resizeBuffers();
    } else if (framesSlow >= 8) {
      mode = 'add-only';
    }
  }
  window.ProjectZFxShader = {
    begin, finish, performanceGuard,
    status: () => ({mode,enabled:!fxOff,add:ADD,bloom:BLOOM,radiusPx:RADIUS,
      scale,renderedPasses:renders,failures,layerWidth:width,layerHeight:height})
  };
})();