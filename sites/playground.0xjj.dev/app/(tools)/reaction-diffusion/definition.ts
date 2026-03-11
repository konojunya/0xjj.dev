import type { WebGPUDefinition, WebGPUSetupContext, WebGPUSceneHandle } from '@/components/shader-lab/types';

// ── Gray-Scott Reaction-Diffusion ──

const COMPUTE_WGSL = /* wgsl */ `
struct Params {
  feed : f32,
  kill : f32,
  dA   : f32,
  dB   : f32,
  dt   : f32,
  w    : u32,
  h    : u32,
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
  let a = ab.x;
  let b = ab.y;
  let lap = laplacian(gid.x, gid.y);
  let abb = a * b * b;

  let na = a + (params.dA * lap.x - abb + params.feed * (1.0 - a)) * params.dt;
  let nb = b + (params.dB * lap.y + abb - (params.kill + params.feed) * b) * params.dt;

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
  // full-screen triangle
  let x = f32((vi << 1u) & 2u);
  let y = f32(vi & 2u);
  var out : VSOut;
  out.pos = vec4f(x * 2.0 - 1.0, 1.0 - y * 2.0, 0.0, 1.0);
  out.uv = vec2f(x, y);
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let ix = u32(in.uv.x * f32(uni.w));
  let iy = u32(in.uv.y * f32(uni.h));
  let ab = grid[iy * uni.w + ix];
  let v = clamp(ab.x - ab.y, 0.0, 1.0);

  // Colour ramp: dark teal → cyan → white
  let c1 = vec3f(0.02, 0.06, 0.12);   // background
  let c2 = vec3f(0.05, 0.42, 0.58);   // mid
  let c3 = vec3f(0.62, 0.92, 0.96);   // highlight
  let c4 = vec3f(0.96, 0.98, 1.0);    // bright

  var col : vec3f;
  if (v < 0.33) {
    col = mix(c1, c2, v / 0.33);
  } else if (v < 0.66) {
    col = mix(c2, c3, (v - 0.33) / 0.33);
  } else {
    col = mix(c3, c4, (v - 0.66) / 0.34);
  }

  return vec4f(col, 1.0);
}
`;

async function setup(ctx: WebGPUSetupContext): Promise<WebGPUSceneHandle> {
  const { device, format, canvas } = ctx;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const SIM_W = isMobile ? 192 : 256;
  const SIM_H = isMobile ? 192 : 256;
  const STEPS_PER_FRAME = isMobile ? 6 : 10;
  const CELL_COUNT = SIM_W * SIM_H;

  // Initial state: A=1, B=0 everywhere, seed a few spots with B
  const init = new Float32Array(CELL_COUNT * 2);
  for (let i = 0; i < CELL_COUNT; i++) {
    init[i * 2] = 1.0;
    init[i * 2 + 1] = 0.0;
  }
  // Seed random circles
  const seedCount = isMobile ? 8 : 14;
  for (let s = 0; s < seedCount; s++) {
    const cx = Math.floor(Math.random() * SIM_W);
    const cy = Math.floor(Math.random() * SIM_H);
    const r = 3 + Math.floor(Math.random() * 5);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = ((cx + dx) % SIM_W + SIM_W) % SIM_W;
        const y = ((cy + dy) % SIM_H + SIM_H) % SIM_H;
        const idx = (y * SIM_W + x) * 2;
        init[idx] = 0.5 + Math.random() * 0.1;
        init[idx + 1] = 0.25 + Math.random() * 0.1;
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

  // Params uniform: feed, kill, dA, dB, dt, w, h  (7 × f32 padded)
  const paramBuf = device.createBuffer({
    size: 32, // 7 floats + 1 pad = 32 bytes
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

  function render() {
    const vals = ctx.getValues();
    const feed = vals.feed ?? 0.055;
    const kill = vals.kill ?? 0.062;
    const dA = vals.dA ?? 1.0;
    const dB = vals.dB ?? 0.5;
    const dt = vals.dt ?? 1.0;

    // Upload params
    const paramData = new ArrayBuffer(32);
    const f32 = new Float32Array(paramData);
    const u32 = new Uint32Array(paramData);
    f32[0] = feed;
    f32[1] = kill;
    f32[2] = dA;
    f32[3] = dB;
    f32[4] = dt;
    u32[5] = SIM_W;
    u32[6] = SIM_H;
    device.queue.writeBuffer(paramBuf, 0, paramData);

    const encoder = device.createCommandEncoder();

    // Compute passes
    const wgX = Math.ceil(SIM_W / 8);
    const wgY = Math.ceil(SIM_H / 8);
    for (let s = 0; s < STEPS_PER_FRAME; s++) {
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
          clearValue: { r: 0.02, g: 0.06, b: 0.12, a: 1 },
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
      description: 'How fast chemical A is replenished',
      min: 0.01,
      max: 0.1,
      step: 0.001,
      defaultValue: 0.055,
    },
    {
      key: 'kill',
      label: 'Kill Rate',
      description: 'How fast chemical B is removed',
      min: 0.03,
      max: 0.08,
      step: 0.001,
      defaultValue: 0.062,
    },
    {
      key: 'dA',
      label: 'Diffusion A',
      description: 'Diffusion speed of chemical A',
      min: 0.2,
      max: 1.5,
      step: 0.01,
      defaultValue: 1.0,
    },
    {
      key: 'dB',
      label: 'Diffusion B',
      description: 'Diffusion speed of chemical B',
      min: 0.1,
      max: 0.8,
      step: 0.01,
      defaultValue: 0.5,
    },
    {
      key: 'dt',
      label: 'Time Step',
      description: 'Simulation time step — higher = faster evolution',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      defaultValue: 1.0,
    },
  ],
  notes: [
    'Gray-Scott model: two chemicals react and diffuse on a 2D grid.',
    'Patterns emerge from the balance between feed/kill rates.',
    'Requires a WebGPU-capable browser (Chrome 113+, Edge 113+).',
  ],
  setup,
};
