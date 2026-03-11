import type { WebGPUDefinition, WebGPUSetupContext, WebGPUSceneHandle } from '@/components/shader-lab/types';

// ── Physarum (Slime Mold) Simulation ──
// Agents sense a trail map, turn toward higher concentration, deposit trail,
// then the trail map is diffused + decayed each frame.

const AGENT_WGSL = /* wgsl */ `
struct Params {
  w           : u32,
  h           : u32,
  numAgents   : u32,
  sensorDist  : f32,
  sensorAngle : f32,
  turnSpeed   : f32,
  moveSpeed   : f32,
  depositAmt  : f32,
  decayRate   : f32,
  diffuseRate : f32,
  time        : f32,
  _pad        : u32,
};

struct Agent {
  x     : f32,
  y     : f32,
  angle : f32,
  _pad  : f32,
};

@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var<storage, read_write> agents : array<Agent>;
@group(0) @binding(2) var<storage, read_write> trail  : array<f32>;

fn hash(p : u32) -> f32 {
  var x = p;
  x = x ^ (x >> 16u);
  x = x * 0x45d9f3bu;
  x = x ^ (x >> 16u);
  x = x * 0x45d9f3bu;
  x = x ^ (x >> 16u);
  return f32(x) / 4294967295.0;
}

fn wrapCoord(v : f32, size : u32) -> u32 {
  let s = f32(size);
  return u32(((v % s) + s) % s);
}

fn sense(agent : Agent, angleOffset : f32) -> f32 {
  let a = agent.angle + angleOffset;
  let sx = agent.x + cos(a) * params.sensorDist;
  let sy = agent.y + sin(a) * params.sensorDist;
  let ix = wrapCoord(sx, params.w);
  let iy = wrapCoord(sy, params.h);
  return trail[iy * params.w + ix];
}

@compute @workgroup_size(64)
fn agentStep(@builtin(global_invocation_id) gid : vec3u) {
  let idx = gid.x;
  if (idx >= params.numAgents) { return; }

  var agent = agents[idx];

  // Sense
  let fwd   = sense(agent, 0.0);
  let left  = sense(agent, params.sensorAngle);
  let right = sense(agent, -params.sensorAngle);

  // Steer
  let rng = hash(idx * 7919u + u32(params.time * 3571.0));
  if (fwd >= left && fwd >= right) {
    // keep going straight
  } else if (fwd < left && fwd < right) {
    // both sides stronger — random turn
    agent.angle += select(-1.0, 1.0, rng > 0.5) * params.turnSpeed;
  } else if (left > right) {
    agent.angle += params.turnSpeed;
  } else {
    agent.angle -= params.turnSpeed;
  }

  // Move
  let nx = agent.x + cos(agent.angle) * params.moveSpeed;
  let ny = agent.y + sin(agent.angle) * params.moveSpeed;

  // Wrap
  let fw = f32(params.w);
  let fh = f32(params.h);
  agent.x = ((nx % fw) + fw) % fw;
  agent.y = ((ny % fh) + fh) % fh;

  agents[idx] = agent;

  // Deposit
  let ix = u32(agent.x) % params.w;
  let iy = u32(agent.y) % params.h;
  trail[iy * params.w + ix] += params.depositAmt;
}
`;

const DIFFUSE_WGSL = /* wgsl */ `
struct Params {
  w           : u32,
  h           : u32,
  numAgents   : u32,
  sensorDist  : f32,
  sensorAngle : f32,
  turnSpeed   : f32,
  moveSpeed   : f32,
  depositAmt  : f32,
  decayRate   : f32,
  diffuseRate : f32,
  time        : f32,
  _pad        : u32,
};

@group(0) @binding(0) var<uniform> params : Params;
@group(0) @binding(1) var<storage, read>       src : array<f32>;
@group(0) @binding(2) var<storage, read_write> dst : array<f32>;

@compute @workgroup_size(8, 8)
fn diffuse(@builtin(global_invocation_id) gid : vec3u) {
  if (gid.x >= params.w || gid.y >= params.h) { return; }

  let w = params.w;
  let h = params.h;
  let x = gid.x;
  let y = gid.y;

  // 3x3 box blur
  var sum = 0.0;
  for (var dy = -1i; dy <= 1i; dy++) {
    for (var dx = -1i; dx <= 1i; dx++) {
      let sx = u32((i32(x) + dx + i32(w)) % i32(w));
      let sy = u32((i32(y) + dy + i32(h)) % i32(h));
      sum += src[sy * w + sx];
    }
  }
  let blurred = sum / 9.0;
  let orig = src[y * w + x];
  let mixed = mix(orig, blurred, params.diffuseRate);
  dst[y * w + x] = max(mixed * params.decayRate, 0.0);
}
`;

const RENDER_WGSL = /* wgsl */ `
@group(0) @binding(0) var<storage, read> trail : array<f32>;

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

fn trailIdx(x : u32, y : u32) -> u32 {
  return (y % uni.h) * uni.w + (x % uni.w);
}

fn sampleTrail(uv : vec2f) -> f32 {
  let fuv = uv * vec2f(f32(uni.w), f32(uni.h)) - 0.5;
  let ix = u32(max(floor(fuv.x), 0.0));
  let iy = u32(max(floor(fuv.y), 0.0));
  let f = fract(fuv);

  let a = trail[trailIdx(ix, iy)];
  let b = trail[trailIdx(ix + 1u, iy)];
  let c = trail[trailIdx(ix, iy + 1u)];
  let d = trail[trailIdx(ix + 1u, iy + 1u)];

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let raw = sampleTrail(in.uv);
  // Tone-map: sqrt for contrast, gentle clamp
  let v = clamp(sqrt(raw * 5.0), 0.0, 1.0);
  return vec4f(vec3f(v), 1.0);
}
`;

async function setup(ctx: WebGPUSetupContext): Promise<WebGPUSceneHandle> {
  const { device, format, canvas } = ctx;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const SIM_W = isMobile ? 256 : 512;
  const SIM_H = isMobile ? 256 : 512;
  const NUM_AGENTS = isMobile ? 80_000 : 250_000;
  const CELL_COUNT = SIM_W * SIM_H;

  // Init agents: circular distribution pointing inward
  function buildAgentData(): Float32Array {
    const data = new Float32Array(NUM_AGENTS * 4);
    const cx = SIM_W / 2;
    const cy = SIM_H / 2;
    for (let i = 0; i < NUM_AGENTS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.min(SIM_W, SIM_H) * 0.45;
      data[i * 4 + 0] = cx + Math.cos(angle) * radius;
      data[i * 4 + 1] = cy + Math.sin(angle) * radius;
      data[i * 4 + 2] = angle + Math.PI; // point inward
      data[i * 4 + 3] = 0;
    }
    return data;
  }

  // Buffers
  const agentBuf = device.createBuffer({
    size: NUM_AGENTS * 4 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(agentBuf, 0, buildAgentData());

  const trailBufs = [0, 1].map(() =>
    device.createBuffer({
      size: CELL_COUNT * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    }),
  );
  const emptyTrail = new Float32Array(CELL_COUNT);
  device.queue.writeBuffer(trailBufs[0], 0, emptyTrail);
  device.queue.writeBuffer(trailBufs[1], 0, emptyTrail);

  // Params: 12 x 4 = 48 bytes
  const PARAM_SIZE = 48;
  const paramBuf = device.createBuffer({
    size: PARAM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Render uniforms
  const renderUniBuf = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(renderUniBuf, 0, new Uint32Array([SIM_W, SIM_H]));

  // Agent pipeline
  const agentModule = device.createShaderModule({ code: AGENT_WGSL });
  const agentPipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: agentModule, entryPoint: 'agentStep' },
  });
  const agentBindGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: agentPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramBuf } },
        { binding: 1, resource: { buffer: agentBuf } },
        { binding: 2, resource: { buffer: trailBufs[i] } },
      ],
    }),
  );

  // Diffuse pipeline
  const diffuseModule = device.createShaderModule({ code: DIFFUSE_WGSL });
  const diffusePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module: diffuseModule, entryPoint: 'diffuse' },
  });
  const diffuseBindGroups = [0, 1].map((i) =>
    device.createBindGroup({
      layout: diffusePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: paramBuf } },
        { binding: 1, resource: { buffer: trailBufs[i] } },
        { binding: 2, resource: { buffer: trailBufs[1 - i] } },
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
        { binding: 0, resource: { buffer: trailBufs[i] } },
        { binding: 1, resource: { buffer: renderUniBuf } },
      ],
    }),
  );

  let ping = 0;
  const gpuContext = canvas.getContext('webgpu')!;

  function render(time: number) {
    const vals = ctx.getValues();
    const sensorDist = vals.sensorDist ?? 20;
    const sensorAngle = ((vals.sensorAngle ?? 30) * Math.PI) / 180;
    const turnSpeed = ((vals.turnSpeed ?? 45) * Math.PI) / 180;
    const moveSpeed = vals.moveSpeed ?? 1;
    const stepsPerFrame = Math.round(vals.speed ?? 2);

    const paramData = new ArrayBuffer(PARAM_SIZE);
    const u32 = new Uint32Array(paramData);
    const f32 = new Float32Array(paramData);
    u32[0] = SIM_W;
    u32[1] = SIM_H;
    u32[2] = NUM_AGENTS;
    f32[3] = sensorDist;
    f32[4] = sensorAngle;
    f32[5] = turnSpeed;
    f32[6] = moveSpeed;
    f32[7] = 0.05;    // depositAmt — small so trails stay subtle
    f32[8] = 0.97;    // decayRate
    f32[9] = 0.5;     // diffuseRate
    f32[10] = time;
    u32[11] = 0;
    device.queue.writeBuffer(paramBuf, 0, paramData);

    const encoder = device.createCommandEncoder();
    const agentWG = Math.ceil(NUM_AGENTS / 64);
    const diffWGx = Math.ceil(SIM_W / 8);
    const diffWGy = Math.ceil(SIM_H / 8);

    for (let s = 0; s < stepsPerFrame; s++) {
      // Agent step: read+write trail[ping]
      const agentPass = encoder.beginComputePass();
      agentPass.setPipeline(agentPipeline);
      agentPass.setBindGroup(0, agentBindGroups[ping]);
      agentPass.dispatchWorkgroups(agentWG);
      agentPass.end();

      // Diffuse: read trail[ping] → write trail[1-ping]
      const diffPass = encoder.beginComputePass();
      diffPass.setPipeline(diffusePipeline);
      diffPass.setBindGroup(0, diffuseBindGroups[ping]);
      diffPass.dispatchWorkgroups(diffWGx, diffWGy);
      diffPass.end();

      ping = 1 - ping;
    }

    // Render trail[ping]
    const tex = gpuContext.getCurrentTexture();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: tex.createView(),
          loadOp: 'clear' as GPULoadOp,
          storeOp: 'store' as GPUStoreOp,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
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
    agentBuf.destroy();
    trailBufs[0].destroy();
    trailBufs[1].destroy();
    paramBuf.destroy();
    renderUniBuf.destroy();
  }

  function reset() {
    device.queue.writeBuffer(agentBuf, 0, buildAgentData());
    device.queue.writeBuffer(trailBufs[0], 0, emptyTrail);
    device.queue.writeBuffer(trailBufs[1], 0, emptyTrail);
    ping = 0;
  }

  return { render, dispose, reset };
}

export const physarumDefinition: WebGPUDefinition = {
  kind: 'webgpu',
  id: 'physarum',
  name: 'Physarum',
  summary:
    'Slime mold (Physarum polycephalum) simulation — thousands of agents deposit and follow chemical trails, self-organising into organic network patterns.',
  canvasHeight: 480,
  controls: [
    {
      key: 'sensorDist',
      label: 'Sensor Distance',
      description: 'How far ahead agents look for trail concentration',
      min: 5,
      max: 50,
      step: 1,
      defaultValue: 20,
      precision: 0,
    },
    {
      key: 'sensorAngle',
      label: 'Sensor Angle',
      description: 'Angle between forward and side sensors (degrees)',
      min: 5,
      max: 90,
      step: 1,
      defaultValue: 30,
      precision: 0,
      unit: '°',
    },
    {
      key: 'turnSpeed',
      label: 'Turn Speed',
      description: 'How fast agents turn toward higher trail (degrees/step)',
      min: 5,
      max: 90,
      step: 1,
      defaultValue: 45,
      precision: 0,
      unit: '°',
    },
    {
      key: 'moveSpeed',
      label: 'Move Speed',
      description: 'Pixels per step',
      min: 0.5,
      max: 3,
      step: 0.1,
      defaultValue: 1,
    },
    {
      key: 'speed',
      label: 'Steps / Frame',
      description: 'Simulation steps per rendered frame',
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 2,
      precision: 0,
    },
  ],
  notes: [
    'Physarum polycephalum: agents sense, turn, move, and deposit chemical trails.',
    'The trail map is diffused + decayed each step, creating organic networks.',
    'Requires a WebGPU-capable browser (Chrome 113+, Edge 113+, Safari 17+, HTTPS).',
  ],
  setup,
};
