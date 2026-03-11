import type { ShaderDefinition } from '@/components/shader-lab/types';

export const strangeAttractorsDefinition: ShaderDefinition = {
  id: 'strange-attractors',
  name: 'Strange Attractors',
  summary:
    'A reusable WebGL2 shader lab surface. This first preset renders a De Jong attractor field and exposes its parameters as live uniforms.',
  renderer: {
    graphics: 'webgl2',
    render: 'raw',
  },
  renderScale: 0.82,
  canvasHeight: 'clamp(320px, 52vh, 420px)',
  notes: [
    'The page owns only a serializable shader definition. Built-in uniforms like time, resolution, pointer, and frame are injected by the shared runtime.',
    'Future labs can swap in a different fragment shader and control schema without changing the renderer shell.',
    'The API is backend-oriented, so a WebGPU adapter can be added later while keeping the page-level props stable.',
  ],
  controls: [
    {
      key: 'spread',
      label: 'Spread',
      description: 'Opens the silhouette outward or pulls it into a tighter cluster.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'twist',
      label: 'Twist',
      description: 'Bends the arms into loops, curls, and spirals.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'symmetry',
      label: 'Symmetry',
      description: 'Pulls the pattern toward balanced, wing-like or flower-like structures.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'detail',
      label: 'Detail',
      description: 'Adds more orbit traces and reveals finer internal structure.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 70,
      precision: 0,
      unit: '%',
    },
    {
      key: 'bloom',
      label: 'Bloom',
      description: 'Softens the lines and grows the surrounding glow.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 35,
      precision: 0,
      unit: '%',
    },
    {
      key: 'motion',
      label: 'Motion',
      description: 'Controls how much the figure slowly morphs over time.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 40,
      precision: 0,
      unit: '%',
    },
  ],
  fragmentShader: `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_spread;
uniform float u_twist;
uniform float u_symmetry;
uniform float u_detail;
uniform float u_bloom;
uniform float u_motion;

out vec4 outColor;

vec2 deJong(vec2 p, vec4 par) {
  return vec2(
    sin(par.x * p.y) - cos(par.y * p.x),
    sin(par.z * p.x) - cos(par.w * p.y)
  );
}

vec3 palette(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 0.5);
  vec3 d = vec3(0.80, 0.90, 0.30);
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 palette2(float t) {
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(2.0, 1.0, 0.0);
  vec3 d = vec3(0.50, 0.20, 0.25);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = (u_pointer - 0.5) * 2.0;

  float spreadN   = clamp(u_spread / 100.0, 0.0, 1.0);
  float twistN    = clamp(u_twist / 100.0, 0.0, 1.0);
  float symmetryN = clamp(u_symmetry / 100.0, 0.0, 1.0);
  float detailN   = clamp(u_detail / 100.0, 0.0, 1.0);
  float bloomN    = clamp(u_bloom / 100.0, 0.0, 1.0);
  float motionN   = clamp(u_motion / 100.0, 0.0, 1.0);

  float time = u_time * mix(0.04, 0.2, motionN);

  // --- Attractor parameters ---
  // Base: classic beautiful De Jong parameters (a=-2.24, b=0.43, c=-0.65, d=-2.43)
  // Controls interpolate between several known-beautiful parameter sets
  vec4 setA = vec4(-2.24,  0.43, -0.65, -2.43); // swirly tendrils
  vec4 setB = vec4( 1.40, -2.30,  2.40, -2.10); // butterfly wings
  vec4 setC = vec4(-2.00, -2.00, -1.20,  2.00); // flower burst
  vec4 setD = vec4( 2.01, -2.53,  1.61, -0.33); // scattered stars

  vec4 mixAB = mix(setA, setB, spreadN);
  vec4 mixCD = mix(setC, setD, twistN);
  vec4 baseParams = mix(mixAB, mixCD, symmetryN);

  // Time-based drift
  vec4 params = baseParams + motionN * vec4(
    0.12 * sin(time * 0.73 + mouse.x * 0.2),
    0.10 * cos(time * 0.51 - mouse.y * 0.2),
    0.11 * sin(time * 0.63 + 1.5),
    0.09 * cos(time * 0.82 + 2.8)
  );

  // --- Iteration ---
  int samples = int(mix(500.0, 1000.0, detailN));
  float fSamples = float(samples);

  vec2 p = vec2(0.1, 0.1);

  // Skip transient
  for (int i = 0; i < 40; i++) {
    p = deJong(p, params);
  }

  // Accumulation
  float density = 0.0;
  float glow = 0.0;
  vec3 colorAccum = vec3(0.0);

  // Sharpness: higher = thinner lines
  float sharpness = mix(600.0, 2400.0, 1.0 - bloomN);
  float glowWidth = mix(30.0, 120.0, 1.0 - bloomN);

  const int MAX_ITER = 1000;
  for (int i = 0; i < MAX_ITER; i++) {
    if (i >= samples) break;

    p = deJong(p, params);

    // Map attractor coords [-2, 2] to screen. Scale ~0.23 fills the canvas nicely.
    vec2 screenPos = p * 0.23 + mouse * 0.02;

    float dist2 = dot(uv - screenPos, uv - screenPos);

    float sharp = exp(-dist2 * sharpness);
    float soft  = exp(-dist2 * glowWidth);

    density += sharp;
    glow += soft;

    float phase = float(i) / fSamples;
    colorAccum += mix(
      palette(phase + time * 0.03),
      palette2(phase + time * 0.05 + 0.3),
      symmetryN
    ) * sharp;
  }

  // --- Tone mapping (log density) ---
  density = log2(1.0 + density * 12.0);
  glow = log2(1.0 + glow * 6.0);
  colorAccum = log2(1.0 + colorAccum * 10.0);

  // --- Compose ---
  float vignette = smoothstep(1.3, 0.15, length(uv));

  vec3 bg = mix(
    vec3(0.008, 0.012, 0.035),
    vec3(0.025, 0.035, 0.08),
    smoothstep(0.0, 0.8, length(uv))
  );

  vec3 color = bg;
  color += colorAccum * 1.6 * vignette;
  color += mix(palette(0.6), palette2(0.3), symmetryN) * glow * 0.18 * vignette;
  color += vec3(0.92, 0.95, 1.0) * density * 0.08;

  // Filmic tonemap
  color = color / (1.0 + color);
  color *= vignette;
  color = pow(color, vec3(0.88));

  outColor = vec4(color, 1.0);
}
`,
};
