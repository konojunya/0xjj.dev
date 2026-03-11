import type { WebGPUDefinition, WebGPUSetupContext, WebGPUSceneHandle } from '@/components/shader-lab/types';

// ── Mandelbulb 3D fractal via ray marching ──

const SHADER_WGSL = /* wgsl */ `
struct Uniforms {
  width     : f32,
  height    : f32,
  time      : f32,
  power     : f32,
  maxIter   : f32,
  camDist   : f32,
  speed     : f32,
  pointerX  : f32,
  pointerY  : f32,
  _pad0     : f32,
  _pad1     : f32,
  _pad2     : f32,
};

@group(0) @binding(0) var<uniform> u : Uniforms;

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

// ── Distance estimator ──

fn mandelbulbDE(pos : vec3f) -> f32 {
  var z = pos;
  var dr : f32 = 1.0;
  var r : f32 = length(z);
  let pw = u.power;

  for (var i = 0; i < 20; i++) {
    if (f32(i) >= u.maxIter || r > 2.0) { break; }

    let theta = acos(clamp(z.z / r, -1.0, 1.0));
    let phi = atan2(z.y, z.x);
    dr = pow(r, pw - 1.0) * pw * dr + 1.0;

    let zr = pow(r, pw);
    let t2 = theta * pw;
    let p2 = phi * pw;

    z = zr * vec3f(sin(t2) * cos(p2), sin(t2) * sin(p2), cos(t2)) + pos;
    r = length(z);
  }

  return 0.5 * log(r) * r / dr;
}

fn getNormal(p : vec3f) -> vec3f {
  let e = vec2f(0.0005, 0.0);
  let d = mandelbulbDE(p);
  return normalize(vec3f(
    mandelbulbDE(p + e.xyy) - d,
    mandelbulbDE(p + e.yxy) - d,
    mandelbulbDE(p + e.yyx) - d,
  ));
}

fn softShadow(ro : vec3f, rd : vec3f, mint : f32, maxt : f32, k : f32) -> f32 {
  var res : f32 = 1.0;
  var t = mint;
  for (var i = 0; i < 32; i++) {
    if (t >= maxt) { break; }
    let d = mandelbulbDE(ro + rd * t);
    if (d < 0.0002) { return 0.0; }
    res = min(res, k * d / t);
    t += d;
  }
  return res;
}

// ── Fragment ──

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let aspect = u.width / u.height;
  let uv = (in.uv - 0.5) * vec2f(aspect, 1.0);

  // Camera orbit
  let ay = u.time * u.speed + (u.pointerX - 0.5) * 4.0;
  let ax = 0.3 + (u.pointerY - 0.5) * 2.0;
  let ca = cos(ay); let sa = sin(ay);
  let cb = cos(ax); let sb = sin(ax);

  let eye = u.camDist * vec3f(ca * cb, sb, sa * cb);
  let fwd = normalize(-eye);
  let right = normalize(cross(fwd, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, fwd);
  let rd = normalize(fwd * 1.8 + uv.x * right + uv.y * up);

  // Ray march
  var t : f32 = 0.0;
  var hit = false;
  var marchSteps : i32 = 0;

  for (var i = 0; i < 150; i++) {
    let p = eye + rd * t;
    let d = mandelbulbDE(p);
    if (d < 0.0003) { hit = true; break; }
    if (t > 8.0) { break; }
    t += d;
    marchSteps = i;
  }

  if (!hit) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }

  let p = eye + rd * t;
  let n = getNormal(p);

  // Lighting
  let lightDir = normalize(vec3f(0.8, 1.2, -0.6));
  let diff = max(dot(n, lightDir), 0.0);
  let half_ = normalize(lightDir - rd);
  let spec = pow(max(dot(n, half_), 0.0), 32.0);

  // AO from march steps
  let ao = 1.0 - f32(marchSteps) / 150.0;
  let ao2 = ao * ao;

  // Soft shadow
  let shadow = softShadow(p + n * 0.002, lightDir, 0.01, 2.0, 8.0);

  // Fresnel rim
  let fresnel = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);

  let base = vec3f(0.92);
  let col = base * (diff * shadow * 0.65 + 0.35) * ao2 + spec * shadow * 0.3 + fresnel * 0.08;

  // Gamma
  let final_ = pow(clamp(col, vec3f(0.0), vec3f(1.0)), vec3f(1.0 / 2.2));
  return vec4f(final_, 1.0);
}
`;

async function setup(ctx: WebGPUSetupContext): Promise<WebGPUSceneHandle> {
  const { device, format, canvas } = ctx;

  const UNI_SIZE = 48; // 12 × f32
  const uniBuf = device.createBuffer({
    size: UNI_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const module = device.createShaderModule({ code: SHADER_WGSL });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniBuf } }],
  });

  const context = canvas.getContext('webgpu')!;

  function render(time: number) {
    const vals = ctx.getValues();
    const pointer = ctx.getPointer();

    const data = new Float32Array(12);
    data[0] = canvas.width;
    data[1] = canvas.height;
    data[2] = time;
    data[3] = vals.power ?? 8;
    data[4] = vals.detail ?? 12;
    data[5] = vals.zoom ?? 2.5;
    data[6] = vals.speed ?? 0.3;
    data[7] = pointer.x;
    data[8] = pointer.y;
    device.queue.writeBuffer(uniBuf, 0, data);

    const encoder = device.createCommandEncoder();
    const tex = context.getCurrentTexture();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: tex.createView(),
        loadOp: 'clear' as GPULoadOp,
        storeOp: 'store' as GPUStoreOp,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  function dispose() {
    uniBuf.destroy();
  }

  return { render, dispose };
}

export const mandelbulbDefinition: WebGPUDefinition = {
  kind: 'webgpu',
  id: 'mandelbulb',
  name: 'Mandelbulb',
  summary: '3D マンデルバルブ・フラクタルを WebGPU のレイマーチングで描画。',
  canvasHeight: 480,
  controls: [
    {
      key: 'power',
      label: '指数',
      description: 'フラクタルの指数 — 8 がクラシックなマンデルバルブ',
      min: 2,
      max: 12,
      step: 0.5,
      defaultValue: 8,
    },
    {
      key: 'detail',
      label: 'ディテール',
      description: '距離推定の反復回数 — 大きいほどシャープな描画',
      min: 4,
      max: 20,
      step: 1,
      defaultValue: 12,
      precision: 0,
    },
    {
      key: 'zoom',
      label: 'ズーム',
      description: '原点からのカメラ距離',
      min: 1.2,
      max: 5,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      key: 'speed',
      label: '回転速度',
      description: '自動回転の速さ — 0 で停止',
      min: 0,
      max: 1,
      step: 0.05,
      defaultValue: 0.15,
    },
  ],
  notes: [
    'キャンバス上でポインタを動かすとカメラがオービットします。',
    'WebGPU 対応ブラウザが必要です（Chrome、Edge、Safari 17+）。',
  ],
  setup,
};
