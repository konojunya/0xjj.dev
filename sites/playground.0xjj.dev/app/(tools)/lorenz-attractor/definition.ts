import type { FragmentShaderDefinition } from '@/components/shader-lab/types';

export const lorenzAttractorDefinition: FragmentShaderDefinition = {
  kind: 'fragment',
  id: 'lorenz-attractor',
  name: 'Lorenz Attractor',
  summary:
    'The Lorenz attractor is a chaotic system of three coupled differential equations that traces an endlessly evolving butterfly-shaped trajectory, rendered as flowing colored lines.',
  renderScale: 0.82,
  canvasHeight: 'clamp(320px, 52vh, 560px)',
  notes: [
    'Lorenz attractor (1963). The 3D trajectory is integrated per-pixel, projected to 2D, and rendered as continuous colored lines.',
    'The butterfly shape emerges from the deterministic chaos of just three coupled differential equations.',
  ],
  controls: [
    {
      key: 'spread',
      label: 'Zoom',
      description: 'Zoom into or out of the attractor.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'twist',
      label: 'Rotation',
      description: 'Speed of the 3D view rotation.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 35,
      precision: 0,
      unit: '%',
    },
    {
      key: 'symmetry',
      label: 'Elevation',
      description: 'Camera tilt angle — top-down vs side view.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 40,
      precision: 0,
      unit: '%',
    },
    {
      key: 'detail',
      label: 'Trail',
      description: 'Length of the visible trajectory.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 75,
      precision: 0,
      unit: '%',
    },
    {
      key: 'bloom',
      label: 'Thickness',
      description: 'Line thickness and glow radius.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 45,
      precision: 0,
      unit: '%',
    },
    {
      key: 'motion',
      label: 'Speed',
      description: 'How fast the trajectory flows through the attractor.',
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

vec3 hsv2rgb(float h, float s, float v) {
  vec3 k = mod(vec3(0.0, 4.0, 2.0) + h * 6.0, 6.0);
  return v * mix(vec3(1.0), clamp(min(k, 4.0 - k), 0.0, 1.0), s);
}

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float zoomN  = clamp(u_spread / 100.0, 0.0, 1.0);
  float rotN   = clamp(u_twist / 100.0, 0.0, 1.0);
  float elevN  = clamp(u_symmetry / 100.0, 0.0, 1.0);
  float trailN = clamp(u_detail / 100.0, 0.0, 1.0);
  float thickN = clamp(u_bloom / 100.0, 0.0, 1.0);
  float speedN = clamp(u_motion / 100.0, 0.0, 1.0);

  // Lorenz system: dx/dt = σ(y−x), dy/dt = x(ρ−z)−y, dz/dt = xy−βz
  float sigma = 10.0, rho = 28.0, beta = 8.0 / 3.0;
  float dt = 0.01;

  // View
  float zoom = mix(0.013, 0.024, zoomN);
  float viewA = u_time * mix(0.04, 0.22, rotN);
  float viewE = mix(0.2, 0.7, elevN) + sin(u_time * 0.07) * 0.08;
  float ca = cos(viewA), sa = sin(viewA);
  float ce = cos(viewE), se = sin(viewE);

  // Line rendering
  float lineW = mix(0.0012, 0.0045, thickN);
  float glowW = lineW * 3.5;

  // Trail length
  int steps = int(mix(250.0, 500.0, trailN));
  float fSteps = float(steps);

  // Initial condition near attractor
  vec3 pos = vec3(-8.0, 8.0, 27.0);
  vec3 ctr = vec3(0.0, 0.0, 23.5);

  // Warmup — advance start based on time for flowing animation
  int warmup = 150 + int(mod(u_time * mix(4.0, 16.0, speedN), 600.0));
  for (int i = 0; i < 750; i++) {
    if (i >= warmup) break;
    vec3 d = vec3(sigma * (pos.y - pos.x), pos.x * (rho - pos.z) - pos.y, pos.x * pos.y - beta * pos.z);
    pos += d * dt;
  }

  // Project first point
  vec3 rel = pos - ctr;
  vec3 rv = vec3(ca * rel.x - sa * rel.y, sa * rel.x + ca * rel.y, rel.z);
  vec2 prev = vec2(rv.x, rv.z * ce - rv.y * se) * zoom;

  // Trace trajectory and render
  vec3 colorAcc = vec3(0.0);

  for (int i = 0; i < 500; i++) {
    if (i >= steps) break;

    vec3 d = vec3(sigma * (pos.y - pos.x), pos.x * (rho - pos.z) - pos.y, pos.x * pos.y - beta * pos.z);
    pos += d * dt;

    rel = pos - ctr;
    rv = vec3(ca * rel.x - sa * rel.y, sa * rel.x + ca * rel.y, rel.z);
    vec2 curr = vec2(rv.x, rv.z * ce - rv.y * se) * zoom;

    float dist = segDist(uv, prev, curr);
    float phase = float(i) / fSteps;

    float line = smoothstep(lineW, lineW * 0.1, dist);
    float glow = exp(-dist * dist / (glowW * glowW));

    // Rainbow along trajectory, flowing over time
    vec3 col = hsv2rgb(fract(phase * 2.0 + u_time * 0.05), 0.8, 1.0);
    colorAcc += col * (line + glow * 0.12);

    prev = curr;
  }

  // Compose
  vec3 bg = vec3(0.012, 0.012, 0.02);
  vec3 color = bg + colorAcc * 0.85;

  color = color / (1.0 + color * 0.4);
  color = pow(color, vec3(0.92));

  outColor = vec4(color, 1.0);
}
`,
};
