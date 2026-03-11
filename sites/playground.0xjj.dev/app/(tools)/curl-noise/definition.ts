import type { WebGPUDefinition, WebGPUSetupContext, WebGPUSceneHandle } from '@/components/shader-lab/types';

// ── Curl Noise Flow Field ──
// Particles follow a divergence-free curl noise vector field.
// Compute shader updates particle positions; render pipeline draws them as points.
// Trail effect via fade pass on a render target texture.

const COMPUTE_WGSL = /* wgsl */ `
struct Params {
  width       : f32,
  height      : f32,
  time        : f32,
  dt          : f32,
  noiseScale  : f32,
  flowSpeed   : f32,
  noiseEvol   : f32,
  particleSize: f32,
  count       : u32,
  _pad0       : u32,
  _pad1       : u32,
  _pad2       : u32,
};

struct Particle {
  px   : f32,
  py   : f32,
  vx   : f32,
  vy   : f32,
  life : f32,
  speed: f32,
  _p0  : f32,
  _p1  : f32,
};

@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var<storage, read>       src : array<Particle>;
@group(0) @binding(2) var<storage, read_write> dst : array<Particle>;

// ─── Simplex noise helpers ───

fn mod289_3(x : vec3f) -> vec3f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn mod289_4(x : vec4f) -> vec4f { return x - floor(x * (1.0 / 289.0)) * 289.0; }
fn permute(x : vec4f) -> vec4f { return mod289_4(((x * 34.0) + 10.0) * x); }
fn taylorInvSqrt(r : vec4f) -> vec4f { return 1.79284291400159 - 0.85373472095314 * r; }

fn snoise(v : vec3f) -> f32 {
  let C = vec2f(1.0 / 6.0, 1.0 / 3.0);
  let D = vec4f(0.0, 0.5, 1.0, 2.0);

  // First corner
  var i = floor(v + dot(v, vec3f(C.y)));
  let x0 = v - i + dot(i, vec3f(C.x));

  // Other corners
  let g = step(x0.yzx, x0.xyz);
  let l = 1.0 - g;
  let i1 = min(g, l.zxy);
  let i2 = max(g, l.zxy);

  let x1 = x0 - i1 + vec3f(C.x);
  let x2 = x0 - i2 + vec3f(C.y);
  let x3 = x0 - vec3f(D.y);

  // Permutations
  i = mod289_3(i);
  let p = permute(permute(permute(
    i.z + vec4f(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4f(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4f(0.0, i1.x, i2.x, 1.0));

  // Gradients: 7x7 points over a square mapped onto an octahedron
  let n_ = 0.142857142857; // 1.0/7.0
  let ns = n_ * D.wyz - D.xzx;

  let j = p - 49.0 * floor(p * ns.z * ns.z);

  let x_ = floor(j * ns.z);
  let y_ = floor(j - 7.0 * x_);

  let x = x_ * ns.x + vec4f(ns.y);
  let y = y_ * ns.x + vec4f(ns.y);
  let h = 1.0 - abs(x) - abs(y);

  let b0 = vec4f(x.xy, y.xy);
  let b1 = vec4f(x.zw, y.zw);

  let s0 = floor(b0) * 2.0 + 1.0;
  let s1 = floor(b1) * 2.0 + 1.0;
  let sh = -step(h, vec4f(0.0));

  let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  let a1 = b1.xzyw + s1.xzyw * sh.zzww;

  var p0 = vec3f(a0.xy, h.x);
  var p1 = vec3f(a0.zw, h.y);
  var p2 = vec3f(a1.xy, h.z);
  var p3 = vec3f(a1.zw, h.w);

  // Normalise gradients
  let norm = taylorInvSqrt(vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix contributions from the four corners
  var m = max(0.5 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
  m = m * m;
  return 105.0 * dot(m * m, vec4f(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ─── Curl noise (2D curl of 3D noise) ───

fn curlNoise(p : vec3f) -> vec2f {
  let eps = 0.001;

  // Partial derivatives via central differences
  let dx = (snoise(p + vec3f(eps, 0.0, 0.0)) - snoise(p - vec3f(eps, 0.0, 0.0))) / (2.0 * eps);
  let dy = (snoise(p + vec3f(0.0, eps, 0.0)) - snoise(p - vec3f(0.0, eps, 0.0))) / (2.0 * eps);

  // 2D curl: (dN/dy, -dN/dx)
  return vec2f(dy, -dx);
}

// ─── Hash for pseudo-random respawn ───

fn hash(n : f32) -> f32 {
  return fract(sin(n) * 43758.5453123);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  var p = src[idx];

  // Decrease life
  p.life -= params.dt;

  // Respawn if dead
  if (p.life <= 0.0) {
    let seed = f32(idx) * 1.3171 + params.time * 0.7;
    p.px = hash(seed);
    p.py = hash(seed + 127.1);
    p.life = 2.0 + hash(seed + 311.7) * 4.0;
    p.speed = 0.3 + hash(seed + 567.3) * 0.7;
    p.vx = 0.0;
    p.vy = 0.0;
  }

  // Sample curl noise at particle position
  let noisePos = vec3f(
    p.px * params.noiseScale,
    p.py * params.noiseScale,
    params.time * params.noiseEvol
  );
  let curl = curlNoise(noisePos);

  // Update velocity with curl noise (smooth blending)
  let force = curl * params.flowSpeed * p.speed;
  p.vx = p.vx * 0.95 + force.x * params.dt;
  p.vy = p.vy * 0.95 + force.y * params.dt;

  // Clamp velocity for CFL stability
  let maxV = 0.5;
  let speed = sqrt(p.vx * p.vx + p.vy * p.vy);
  if (speed > maxV) {
    let s = maxV / speed;
    p.vx *= s;
    p.vy *= s;
  }

  // Update position
  p.px += p.vx * params.dt;
  p.py += p.vy * params.dt;

  // Wrap around
  p.px = p.px - floor(p.px);
  p.py = p.py - floor(p.py);

  dst[idx] = p;
}
`;

const FADE_WGSL = /* wgsl */ `
struct FadeParams {
  trailFade : f32,
  _pad0     : f32,
  _pad1     : f32,
  _pad2     : f32,
};

@group(0) @binding(0) var srcTex   : texture_2d<f32>;
@group(0) @binding(1) var srcSamp  : sampler;
@group(0) @binding(2) var<uniform> fadeParams : FadeParams;

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> VSOut {
  let x = f32((vi << 1u) & 2u);
  let y = f32(vi & 2u);
  var out : VSOut;
  out.pos = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  out.uv = vec2f(x, y);
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let c = textureSample(srcTex, srcSamp, in.uv);
  return vec4f(c.rgb * fadeParams.trailFade, 1.0);
}
`;

const PARTICLE_WGSL = /* wgsl */ `
struct RenderParams {
  width        : f32,
  height       : f32,
  particleSize : f32,
  _pad         : f32,
};

struct Particle {
  px   : f32,
  py   : f32,
  vx   : f32,
  vy   : f32,
  life : f32,
  speed: f32,
  _p0  : f32,
  _p1  : f32,
};

@group(0) @binding(0) var<storage, read> particles : array<Particle>;
@group(0) @binding(1) var<uniform> rp : RenderParams;

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) alpha : f32,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32, @builtin(instance_index) ii : u32) -> VSOut {
  let p = particles[ii];

  // Quad offsets: 2 triangles forming a quad
  var offsets = array<vec2f, 6>(
    vec2f(-0.5, -0.5), vec2f(0.5, -0.5), vec2f(-0.5, 0.5),
    vec2f(-0.5, 0.5), vec2f(0.5, -0.5), vec2f(0.5, 0.5),
  );
  let off = offsets[vi];

  let size = rp.particleSize / max(rp.width, rp.height);
  let clipX = p.px * 2.0 - 1.0 + off.x * size;
  let clipY = (1.0 - p.py) * 2.0 - 1.0 + off.y * size;

  var out : VSOut;
  out.pos = vec4f(clipX, clipY, 0.0, 1.0);

  // Fade based on remaining life
  let lifeFade = clamp(p.life / 1.0, 0.0, 1.0);
  // Speed-based brightness
  let spd = sqrt(p.vx * p.vx + p.vy * p.vy);
  let spdFade = clamp(spd * 8.0, 0.15, 1.0);
  out.alpha = lifeFade * spdFade;

  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  return vec4f(1.0, 1.0, 1.0, in.alpha);
}
`;

const BLIT_WGSL = /* wgsl */ `
@group(0) @binding(0) var srcTex  : texture_2d<f32>;
@group(0) @binding(1) var srcSamp : sampler;

struct VSOut {
  @builtin(position) pos : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> VSOut {
  let x = f32((vi << 1u) & 2u);
  let y = f32(vi & 2u);
  var out : VSOut;
  out.pos = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  out.uv = vec2f(x, y);
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  return textureSample(srcTex, srcSamp, in.uv);
}
`;

async function setup(ctx: WebGPUSetupContext): Promise<WebGPUSceneHandle> {
  const { device, format, canvas } = ctx;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const PARTICLE_COUNT = isMobile ? 30000 : 100000;
  // 8 floats per particle (32 bytes)
  const PARTICLE_STRIDE = 32;
  const BUFFER_SIZE = PARTICLE_COUNT * PARTICLE_STRIDE;

  // ─── Initial particle data ───

  function buildInitData(): Float32Array {
    const data = new Float32Array(PARTICLE_COUNT * 8);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const base = i * 8;
      data[base + 0] = Math.random(); // px
      data[base + 1] = Math.random(); // py
      data[base + 2] = 0;             // vx
      data[base + 3] = 0;             // vy
      data[base + 4] = 1.0 + Math.random() * 5.0; // life
      data[base + 5] = 0.3 + Math.random() * 0.7;  // speed
      data[base + 6] = 0;             // pad
      data[base + 7] = 0;             // pad
    }
    return data;
  }

  // ─── Particle ping-pong buffers ───

  const particleBufs = [0, 1].map(() =>
    device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
  );
  const initData = buildInitData();
  device.queue.writeBuffer(particleBufs[0], 0, initData);
  device.queue.writeBuffer(particleBufs[1], 0, initData);

  // ─── Compute params uniform (48 bytes = 12 x f32) ───

  const PARAM_SIZE = 48;
  const paramBuf = device.createBuffer({
    size: PARAM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // ─── Compute pipeline ───

  const computeModule = device.createShaderModule({ code: COMPUTE_WGSL });
  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: computeModule, entryPoint: 'main' },
  });

  const computeBindGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramBuf } },
        { binding: 1, resource: { buffer: particleBufs[i] } },
        { binding: 2, resource: { buffer: particleBufs[1 - i] } },
      ],
    }),
  );

  // ─── Trail render targets (ping-pong textures) ───

  const texW = canvas.width;
  const texH = canvas.height;
  const trailTextures = [0, 1].map(() =>
    device.createTexture({
      size: [texW, texH],
      format,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING,
    }),
  );

  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  // ─── Fade pipeline (fullscreen pass that fades previous frame) ───

  const fadeBuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const fadeModule = device.createShaderModule({ code: FADE_WGSL });
  const fadePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: fadeModule, entryPoint: 'vs' },
    fragment: {
      module: fadeModule,
      entryPoint: 'fs',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const fadeBindGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: fadePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: trailTextures[i].createView() },
        { binding: 1, resource: sampler },
        { binding: 2, resource: { buffer: fadeBuf } },
      ],
    }),
  );

  // ─── Particle render pipeline ───

  const renderParamBuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const particleModule = device.createShaderModule({ code: PARTICLE_WGSL });
  const particlePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: particleModule, entryPoint: 'vs' },
    fragment: {
      module: particleModule,
      entryPoint: 'fs',
      targets: [
        {
          format,
          blend: {
            color: {
              srcFactor: 'src-alpha' as GPUBlendFactor,
              dstFactor: 'one' as GPUBlendFactor,
              operation: 'add' as GPUBlendOperation,
            },
            alpha: {
              srcFactor: 'one' as GPUBlendFactor,
              dstFactor: 'one' as GPUBlendFactor,
              operation: 'add' as GPUBlendOperation,
            },
          },
        },
      ],
    },
    primitive: { topology: 'triangle-list' },
  });

  const particleBindGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: particlePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particleBufs[i] } },
        { binding: 1, resource: { buffer: renderParamBuf } },
      ],
    }),
  );

  // ─── Blit pipeline (copy trail texture to screen) ───

  const blitModule = device.createShaderModule({ code: BLIT_WGSL });
  const blitPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: blitModule, entryPoint: 'vs' },
    fragment: {
      module: blitModule,
      entryPoint: 'fs',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const blitBindGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: blitPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: trailTextures[i].createView() },
        { binding: 1, resource: sampler },
      ],
    }),
  );

  // ─── State ───

  let ping = 0;
  let trailPing = 0;
  const gpuContext = canvas.getContext('webgpu')!;

  // ─── Render loop ───

  function render(time: number, _dt: number) {
    const vals = ctx.getValues();
    const noiseScale = vals.noiseScale ?? 2.0;
    const flowSpeed = vals.flowSpeed ?? 1.0;
    const noiseEvol = vals.noiseEvol ?? 0.3;
    const particleSize = vals.particleSize ?? 1.0;
    const trailFade = vals.trailLength ?? 0.95;

    const timeSec = time / 1000;
    const dt = Math.min(_dt / 1000, 0.033); // cap at ~30fps dt

    // Upload compute params
    const paramData = new ArrayBuffer(PARAM_SIZE);
    const f32 = new Float32Array(paramData);
    const u32 = new Uint32Array(paramData);
    f32[0] = texW;
    f32[1] = texH;
    f32[2] = timeSec;
    f32[3] = dt;
    f32[4] = noiseScale;
    f32[5] = flowSpeed;
    f32[6] = noiseEvol;
    f32[7] = particleSize;
    u32[8] = PARTICLE_COUNT;
    device.queue.writeBuffer(paramBuf, 0, paramData);

    // Upload fade params
    device.queue.writeBuffer(fadeBuf, 0, new Float32Array([trailFade, 0, 0, 0]));

    // Upload render params
    device.queue.writeBuffer(
      renderParamBuf,
      0,
      new Float32Array([texW, texH, particleSize, 0]),
    );

    const encoder = device.createCommandEncoder();

    // ── 1. Compute pass: update particles ──
    {
      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBindGroups[ping]);
      pass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / 256));
      pass.end();
      ping = 1 - ping;
    }

    // ── 2. Fade pass: render faded previous trail into the other trail texture ──
    const fadeTarget = 1 - trailPing;
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: trailTextures[fadeTarget].createView(),
            loadOp: 'clear' as GPULoadOp,
            storeOp: 'store' as GPUStoreOp,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });
      pass.setPipeline(fadePipeline);
      pass.setBindGroup(0, fadeBindGroups[trailPing]);
      pass.draw(3);
      pass.end();
    }

    // ── 3. Particle pass: draw particles on top of faded trail ──
    {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: trailTextures[fadeTarget].createView(),
            loadOp: 'load' as GPULoadOp,
            storeOp: 'store' as GPUStoreOp,
          },
        ],
      });
      pass.setPipeline(particlePipeline);
      pass.setBindGroup(0, particleBindGroups[ping]);
      pass.drawIndexed?.(6, PARTICLE_COUNT) ??
        pass.draw(6, PARTICLE_COUNT);
      pass.end();
    }

    trailPing = fadeTarget;

    // ── 4. Blit pass: copy trail texture to screen ──
    {
      const tex = gpuContext.getCurrentTexture();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: tex.createView(),
            loadOp: 'clear' as GPULoadOp,
            storeOp: 'store' as GPUStoreOp,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });
      pass.setPipeline(blitPipeline);
      pass.setBindGroup(0, blitBindGroups[trailPing]);
      pass.draw(3);
      pass.end();
    }

    device.queue.submit([encoder.finish()]);
  }

  // ─── Cleanup ───

  function dispose() {
    particleBufs[0].destroy();
    particleBufs[1].destroy();
    paramBuf.destroy();
    fadeBuf.destroy();
    renderParamBuf.destroy();
    trailTextures[0].destroy();
    trailTextures[1].destroy();
  }

  // ─── Reset ───

  function reset() {
    const fresh = buildInitData();
    device.queue.writeBuffer(particleBufs[0], 0, fresh);
    device.queue.writeBuffer(particleBufs[1], 0, fresh);
    ping = 0;
  }

  return { render, dispose, reset };
}

export const curlNoiseDefinition: WebGPUDefinition = {
  kind: 'webgpu',
  id: 'curl-noise',
  name: 'Curl Noise Flow Field',
  summary:
    'Thousands of particles flowing through a curl noise vector field, creating fluid-like visuals — powered by WebGPU compute shaders.',
  canvasHeight: 480,
  controls: [
    {
      key: 'noiseScale',
      label: 'Noise Scale',
      description: 'Zoom level of the noise field — lower values create larger flow structures',
      min: 0.5,
      max: 5.0,
      step: 0.1,
      defaultValue: 2.0,
      precision: 1,
    },
    {
      key: 'flowSpeed',
      label: 'Flow Speed',
      description: 'How fast particles follow the curl noise vectors',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.0,
      precision: 1,
    },
    {
      key: 'noiseEvol',
      label: 'Noise Evolution',
      description: 'How fast the noise field changes over time',
      min: 0.0,
      max: 2.0,
      step: 0.05,
      defaultValue: 0.3,
      precision: 2,
    },
    {
      key: 'particleSize',
      label: 'Particle Size',
      description: 'Size of each particle point',
      min: 0.5,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.0,
      precision: 1,
    },
    {
      key: 'trailLength',
      label: 'Trail Length',
      description: 'Fade factor for trails — higher values produce longer trails',
      min: 0.8,
      max: 0.99,
      step: 0.01,
      defaultValue: 0.95,
      precision: 2,
    },
  ],
  notes: [
    'Particles follow a divergence-free curl noise field, creating smooth fluid-like motion.',
    'The noise field evolves over time, producing an endlessly changing flow.',
    'Requires a WebGPU-capable browser (Chrome 113+, Edge 113+).',
  ],
  setup,
};
