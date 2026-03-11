import type { WebGPUDefinition, WebGPUSetupContext, WebGPUSceneHandle } from '@/components/shader-lab/types';

// ── Gray-Scott Reaction-Diffusion ──
// Standard Pearson convention: dA≈0.21, dB≈0.105, dt=1.0
// CFL stability: dt × dA × 4 = 0.84 < 1 ✓

const COMPUTE_WGSL = /* wgsl */ `
struct Params {
  feed      : f32,
  kill      : f32,
  dA        : f32,
  dB        : f32,
  w         : u32,
  h         : u32,
  pointer_x : f32,
  pointer_y : f32,
  pointer_on: u32,
  _pad0     : u32,
  _pad1     : u32,
  _pad2     : u32,
};

@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var<storage, read>       src : array<vec2f>;
@group(0) @binding(2) var<storage, read_write> dst : array<vec2f>;

fn idx(x : u32, y : u32) -> u32 {
  return (y % params.h) * params.w + (x % params.w);
}

fn laplacian(x : u32, y : u32) -> vec2f {
  let c = src[idx(x, y)];
  let l = src[idx(x - 1u, y)];
  let r = src[idx(x + 1u, y)];
  let u = src[idx(x, y - 1u)];
  let d = src[idx(x, y + 1u)];
  return l + r + u + d - 4.0 * c;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  if (gid.x >= params.w || gid.y >= params.h) { return; }

  let i = idx(gid.x, gid.y);
  let ab = src[i];
  var a = ab.x;
  var b = ab.y;

  // Pointer seeding: inject chemical B near pointer
  if (params.pointer_on == 1u) {
    let px = params.pointer_x * f32(params.w);
    let py = (1.0 - params.pointer_y) * f32(params.h);
    let dx = f32(gid.x) - px;
    let dy = f32(gid.y) - py;
    let dist2 = dx * dx + dy * dy;
    let radius = f32(max(params.w, params.h)) * 0.02;
    if (dist2 < radius * radius) {
      b = 1.0;
      a = 0.0;
    }
  }

  let lap = laplacian(gid.x, gid.y);
  let abb = a * b * b;

  let na = a + params.dA * lap.x - abb + params.feed * (1.0 - a);
  let nb = b + params.dB * lap.y + abb - (params.kill + params.feed) * b;

  dst[i] = vec2f(clamp(na, 0.0, 1.0), clamp(nb, 0.0, 1.0));
}
`;

const RENDER_WGSL = /* wgsl */ `
@group(0) @binding(0) var<storage, read> grid : array<vec2f>;

struct Uniforms {
  w : u32,
  h : u32,
};
@group(0) @binding(1) var<uniform> uni : Uniforms;

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

fn gridIdx(x : u32, y : u32) -> u32 {
  return (y % uni.h) * uni.w + (x % uni.w);
}

// Bilinear sampling for smooth visuals
fn sampleGrid(uv : vec2f) -> vec2f {
  let fuv = uv * vec2f(f32(uni.w), f32(uni.h)) - 0.5;
  let ix = u32(max(floor(fuv.x), 0.0));
  let iy = u32(max(floor(fuv.y), 0.0));
  let f = fract(fuv);

  let a = grid[gridIdx(ix, iy)];
  let b = grid[gridIdx(ix + 1u, iy)];
  let c = grid[gridIdx(ix, iy + 1u)];
  let d = grid[gridIdx(ix + 1u, iy + 1u)];

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let ab = sampleGrid(in.uv);
  let v = clamp(ab.x - ab.y, 0.0, 1.0);

  // Colour ramp: deep navy → teal → aqua → bright white
  let c1 = vec3f(0.01, 0.03, 0.08);
  let c2 = vec3f(0.02, 0.20, 0.32);
  let c3 = vec3f(0.10, 0.52, 0.62);
  let c4 = vec3f(0.50, 0.88, 0.94);
  let c5 = vec3f(0.92, 0.98, 1.0);

  var col : vec3f;
  if (v < 0.25) {
    col = mix(c1, c2, v / 0.25);
  } else if (v < 0.5) {
    col = mix(c2, c3, (v - 0.25) / 0.25);
  } else if (v < 0.75) {
    col = mix(c3, c4, (v - 0.5) / 0.25);
  } else {
    col = mix(c4, c5, (v - 0.75) / 0.25);
  }

  return vec4f(col, 1.0);
}
`;

async function setup(ctx: WebGPUSetupContext): Promise<WebGPUSceneHandle> {
  const { device, format, canvas } = ctx;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const SIM_W = isMobile ? 192 : 256;
  const SIM_H = isMobile ? 192 : 256;
  const CELL_COUNT = SIM_W * SIM_H;

  // Initial state: A=1, B=0 everywhere, seed circles with B
  const init = new Float32Array(CELL_COUNT * 2);
  for (let i = 0; i < CELL_COUNT; i++) {
    init[i * 2] = 1.0;
    init[i * 2 + 1] = 0.0;
  }
  // Seed random circles
  const seedCount = isMobile ? 10 : 18;
  for (let s = 0; s < seedCount; s++) {
    const cx = Math.floor(Math.random() * SIM_W);
    const cy = Math.floor(Math.random() * SIM_H);
    const r = 2 + Math.floor(Math.random() * 4);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = ((cx + dx) % SIM_W + SIM_W) % SIM_W;
        const y = ((cy + dy) % SIM_H + SIM_H) % SIM_H;
        const idx = (y * SIM_W + x) * 2;
        init[idx] = 0.5;
        init[idx + 1] = 0.25;
      }
    }
  }

  // Buffers
  const gridBufs = [0, 1].map(() =>
    device.createBuffer({
      size: CELL_COUNT * 2 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
  );
  device.queue.writeBuffer(gridBufs[0], 0, init);
  device.queue.writeBuffer(gridBufs[1], 0, init);

  // Params uniform: 12 × 4 = 48 bytes
  const PARAM_SIZE = 48;
  const paramBuf = device.createBuffer({
    size: PARAM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Render uniforms (w, h)
  const renderUniBuf = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(renderUniBuf, 0, new Uint32Array([SIM_W, SIM_H]));

  // Compute pipeline
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
        { binding: 1, resource: { buffer: gridBufs[i] } },
        { binding: 2, resource: { buffer: gridBufs[1 - i] } },
      ],
    }),
  );

  // Render pipeline
  const renderModule = device.createShaderModule({ code: RENDER_WGSL });
  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: renderModule, entryPoint: 'vs' },
    fragment: {
      module: renderModule,
      entryPoint: 'fs',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });

  const renderBindGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: gridBufs[i] } },
        { binding: 1, resource: { buffer: renderUniBuf } },
      ],
    }),
  );

  let ping = 0;
  const context = canvas.getContext('webgpu')!;
  let pointerDown = false;

  const onPointerDown = () => { pointerDown = true; };
  const onPointerUp = () => { pointerDown = false; };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);

  function render() {
    const vals = ctx.getValues();
    const feed = vals.feed ?? 0.055;
    const kill = vals.kill ?? 0.062;
    const dA = vals.dA ?? 0.21;
    const dB = vals.dB ?? 0.105;
    const speed = Math.round(vals.speed ?? 10);

    const pointer = ctx.getPointer();

    // Upload params
    const paramData = new ArrayBuffer(PARAM_SIZE);
    const f32 = new Float32Array(paramData);
    const u32 = new Uint32Array(paramData);
    f32[0] = feed;
    f32[1] = kill;
    f32[2] = dA;
    f32[3] = dB;
    u32[4] = SIM_W;
    u32[5] = SIM_H;
    f32[6] = pointer.x;
    f32[7] = pointer.y;
    u32[8] = pointerDown ? 1 : 0;
    // [9..11] = padding
    device.queue.writeBuffer(paramBuf, 0, paramData);

    const encoder = device.createCommandEncoder();

    // Compute passes
    const wgX = Math.ceil(SIM_W / 8);
    const wgY = Math.ceil(SIM_H / 8);
    for (let s = 0; s < speed; s++) {
      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, computeBindGroups[ping]);
      pass.dispatchWorkgroups(wgX, wgY);
      pass.end();
      ping = 1 - ping;
    }

    // Render pass
    const tex = context.getCurrentTexture();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: tex.createView(),
          loadOp: 'clear' as GPULoadOp,
          storeOp: 'store' as GPUStoreOp,
          clearValue: { r: 0.01, g: 0.03, b: 0.08, a: 1 },
        },
      ],
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroups[ping]);
    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([encoder.finish()]);
  }

  function dispose() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointerleave', onPointerUp);
    gridBufs[0].destroy();
    gridBufs[1].destroy();
    paramBuf.destroy();
    renderUniBuf.destroy();
  }

  return { render, dispose };
}

export const reactionDiffusionDefinition: WebGPUDefinition = {
  kind: 'webgpu',
  id: 'reaction-diffusion',
  name: 'Reaction-Diffusion',
  summary:
    'Gray-Scott reaction-diffusion simulation running entirely on the GPU via WebGPU compute shaders.',
  canvasHeight: 480,
  controls: [
    {
      key: 'feed',
      label: 'Feed Rate',
      description: 'How fast chemical A is replenished — determines pattern type',
      min: 0.01,
      max: 0.1,
      step: 0.001,
      defaultValue: 0.055,
    },
    {
      key: 'kill',
      label: 'Kill Rate',
      description: 'How fast chemical B is removed — determines pattern type',
      min: 0.03,
      max: 0.08,
      step: 0.001,
      defaultValue: 0.062,
    },
    {
      key: 'dA',
      label: 'Diffusion A',
      description: 'Diffusion speed of chemical A',
      min: 0.1,
      max: 0.24,
      step: 0.005,
      defaultValue: 0.21,
    },
    {
      key: 'dB',
      label: 'Diffusion B',
      description: 'Diffusion speed of chemical B',
      min: 0.04,
      max: 0.14,
      step: 0.005,
      defaultValue: 0.105,
    },
    {
      key: 'speed',
      label: 'Speed',
      description: 'Simulation steps per frame — higher = faster evolution',
      min: 2,
      max: 20,
      step: 1,
      defaultValue: 10,
      precision: 0,
    },
  ],
  notes: [
    'Gray-Scott model: two chemicals react and diffuse on a 2D grid.',
    'Click/touch the canvas to inject chemical B and seed new patterns.',
    'Requires a WebGPU-capable browser (Chrome 113+, Edge 113+).',
  ],
  setup,
};
