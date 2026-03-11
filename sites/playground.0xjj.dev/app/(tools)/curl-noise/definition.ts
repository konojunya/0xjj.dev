import type { WebGPUDefinition, WebGPUSetupContext, WebGPUSceneHandle } from '@/components/shader-lab/types';

// ── Curl Noise Flow Field ──
// Particles follow a divergence-free curl noise vector field.
// Compute shader updates particle positions; render pipeline draws them as points.
// Trail effect via fade pass on a render target texture.

const COMPUTE_WGSL = /* wgsl */ `
struct Params {
  time        : f32,
  dt          : f32,
  noiseScale  : f32,
  flowSpeed   : f32,
  noiseEvol   : f32,
  count       : u32,
  _pad0       : u32,
  _pad1       : u32,
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

  var i = floor(v + dot(v, vec3f(C.y)));
  let x0 = v - i + dot(i, vec3f(C.x));

  let g = step(x0.yzx, x0.xyz);
  let l = 1.0 - g;
  let i1 = min(g, l.zxy);
  let i2 = max(g, l.zxy);

  let x1 = x0 - i1 + vec3f(C.x);
  let x2 = x0 - i2 + vec3f(C.y);
  let x3 = x0 - vec3f(D.y);

  i = mod289_3(i);
  let p = permute(permute(permute(
    i.z + vec4f(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4f(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4f(0.0, i1.x, i2.x, 1.0));

  let n_ = 0.142857142857;
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

  let norm = taylorInvSqrt(vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  var m = max(0.5 - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), vec4f(0.0));
  m = m * m;
  return 105.0 * dot(m * m, vec4f(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ─── Curl noise (2D curl of 3D noise) ───

fn curlNoise(p : vec3f) -> vec2f {
  let eps = 0.001;
  let dx = (snoise(p + vec3f(eps, 0.0, 0.0)) - snoise(p - vec3f(eps, 0.0, 0.0))) / (2.0 * eps);
  let dy = (snoise(p + vec3f(0.0, eps, 0.0)) - snoise(p - vec3f(0.0, eps, 0.0))) / (2.0 * eps);
  return vec2f(dy, -dx);
}

fn hash(n : f32) -> f32 {
  return fract(sin(n) * 43758.5453123);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  if (idx >= params.count) { return; }

  var p = src[idx];
  p.life -= params.dt;

  if (p.life <= 0.0) {
    let seed = f32(idx) * 1.3171 + params.time * 0.7;
    p.px = hash(seed);
    p.py = hash(seed + 127.1);
    p.life = 2.0 + hash(seed + 311.7) * 4.0;
    p.speed = 0.3 + hash(seed + 567.3) * 0.7;
    p.vx = 0.0;
    p.vy = 0.0;
  }

  let noisePos = vec3f(
    p.px * params.noiseScale,
    p.py * params.noiseScale,
    params.time * params.noiseEvol
  );
  let curl = curlNoise(noisePos);

  let force = curl * params.flowSpeed * p.speed;
  p.vx = p.vx * 0.95 + force.x * params.dt;
  p.vy = p.vy * 0.95 + force.y * params.dt;

  let maxV = 0.5;
  let spd = sqrt(p.vx * p.vx + p.vy * p.vy);
  if (spd > maxV) {
    let s = maxV / spd;
    p.vx *= s;
    p.vy *= s;
  }

  p.px += p.vx * params.dt;
  p.py += p.vy * params.dt;
  p.px = p.px - floor(p.px);
  p.py = p.py - floor(p.py);

  dst[idx] = p;
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

  let lifeFade = clamp(p.life / 1.0, 0.0, 1.0);
  let spd = sqrt(p.vx * p.vx + p.vy * p.vy);
  let spdFade = clamp(spd * 8.0, 0.2, 1.0);
  out.alpha = lifeFade * spdFade;

  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  return vec4f(in.alpha, in.alpha, in.alpha, 1.0);
}
`;

async function setup(ctx: WebGPUSetupContext): Promise<WebGPUSceneHandle> {
  const { device, format, canvas } = ctx;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const PARTICLE_COUNT = isMobile ? 30000 : 100000;
  const PARTICLE_STRIDE = 32; // 8 floats
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
      data[base + 4] = Math.random() * 5.0; // life (stagger start)
      data[base + 5] = 0.3 + Math.random() * 0.7; // speed
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

  // ─── Compute params uniform (32 bytes = 8 x f32) ───

  const PARAM_SIZE = 32;
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

  // ─── Particle render pipeline (draw directly to screen, no trail texture) ───

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
              srcFactor: 'one' as GPUBlendFactor,
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

  // ─── State ───

  let ping = 0;
  const gpuContext = canvas.getContext('webgpu')!;

  // ─── Render loop ───
  // time and dt from WebGPUCanvas are already in seconds

  function render(time: number, dt: number) {
    const vals = ctx.getValues();
    const noiseScale = vals.noiseScale ?? 2.0;
    const flowSpeed = vals.flowSpeed ?? 1.0;
    const noiseEvol = vals.noiseEvol ?? 0.3;
    const particleSize = vals.particleSize ?? 1.5;

    const safeDt = Math.min(dt, 0.05); // cap at 50ms

    // Upload compute params
    const paramData = new ArrayBuffer(PARAM_SIZE);
    const f32 = new Float32Array(paramData);
    const u32 = new Uint32Array(paramData);
    f32[0] = time;
    f32[1] = safeDt;
    f32[2] = noiseScale;
    f32[3] = flowSpeed;
    f32[4] = noiseEvol;
    u32[5] = PARTICLE_COUNT;
    device.queue.writeBuffer(paramBuf, 0, paramData);

    // Upload render params
    device.queue.writeBuffer(
      renderParamBuf,
      0,
      new Float32Array([canvas.width, canvas.height, particleSize, 0]),
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

    // ── 2. Render pass: draw particles directly to screen ──
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
      pass.setPipeline(particlePipeline);
      pass.setBindGroup(0, particleBindGroups[ping]);
      pass.draw(6, PARTICLE_COUNT);
      pass.end();
    }

    device.queue.submit([encoder.finish()]);
  }

  function dispose() {
    particleBufs[0].destroy();
    particleBufs[1].destroy();
    paramBuf.destroy();
    renderParamBuf.destroy();
  }

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
    '数千のパーティクルがカールノイズのベクトル場を流れ、流体のようなビジュアルを生み出します — WebGPU コンピュートシェーダーで駆動。',
  canvasHeight: 480,
  controls: [
    {
      key: 'noiseScale',
      label: 'ノイズスケール',
      description: 'ノイズ場のズーム — 小さいほど大きな流れの構造を生成',
      min: 0.5,
      max: 5.0,
      step: 0.1,
      defaultValue: 2.0,
      precision: 1,
    },
    {
      key: 'flowSpeed',
      label: '流速',
      description: 'パーティクルがカールノイズに追従する速さ',
      min: 0.1,
      max: 3.0,
      step: 0.1,
      defaultValue: 1.0,
      precision: 1,
    },
    {
      key: 'noiseEvol',
      label: 'ノイズ変化',
      description: 'ノイズ場が時間とともに変化する速さ',
      min: 0.0,
      max: 2.0,
      step: 0.05,
      defaultValue: 0.3,
      precision: 2,
    },
    {
      key: 'particleSize',
      label: 'パーティクルサイズ',
      description: '各パーティクルの大きさ',
      min: 0.5,
      max: 4.0,
      step: 0.1,
      defaultValue: 1.5,
      precision: 1,
    },
  ],
  notes: [
    '発散のないカールノイズ場に沿ってパーティクルが流れ、滑らかな流体的運動を生み出します。',
    'ノイズ場は時間とともに変化し、絶え間なく変わる流れを生成します。',
    'WebGPU 対応ブラウザが必要です（Chrome 113+、Edge 113+、Safari 17+）。',
  ],
  setup,
};
