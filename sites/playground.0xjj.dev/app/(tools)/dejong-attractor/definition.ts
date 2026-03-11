import type { ShaderDefinition } from '@/components/shader-lab/types';

export const deJongAttractorDefinition: ShaderDefinition = {
  id: 'dejong-attractor',
  name: 'De Jong Attractor',
  summary:
    'The De Jong attractor is a 2D discrete map discovered by Peter de Jong that produces intricate, swirling patterns from four simple trigonometric equations, rendered as colored line segments.',
  renderer: {
    graphics: 'webgl2',
    render: 'raw',
  },
  renderScale: 0.82,
  canvasHeight: 'clamp(320px, 52vh, 560px)',
  notes: [
    'De Jong attractor (Peter de Jong). A discrete 2D map using four parameters: x\' = sin(a·y) − cos(b·x), y\' = sin(c·x) − cos(d·y).',
    'The intricate structure emerges from iterating this simple trigonometric map hundreds of times, with long jumps faded out to reveal the underlying geometry.',
  ],
  controls: [
    {
      key: 'spread',
      label: 'Zoom',
      description: 'Scale factor — zoom into or out of the attractor.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'twist',
      label: 'Shape A',
      description: 'Perturbs parameters a and d to morph the attractor shape.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'symmetry',
      label: 'Shape B',
      description: 'Perturbs parameters b and c to alter the symmetry.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'detail',
      label: 'Trail',
      description: 'Number of iterations — more iterations reveal finer detail.',
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
      description: 'How fast the attractor animates and drifts.',
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
  float twistN = clamp(u_twist / 100.0, 0.0, 1.0);
  float symN   = clamp(u_symmetry / 100.0, 0.0, 1.0);
  float trailN = clamp(u_detail / 100.0, 0.0, 1.0);
  float thickN = clamp(u_bloom / 100.0, 0.0, 1.0);
  float speedN = clamp(u_motion / 100.0, 0.0, 1.0);

  // De Jong parameters: x' = sin(a*y) - cos(b*x), y' = sin(c*x) - cos(d*y)
  float a =  1.4;
  float b = -2.3;
  float c =  2.4;
  float d = -2.1;

  // Shape A perturbs a and d
  float twistOff = (twistN - 0.5) * 0.6;
  a += twistOff;
  d += twistOff * 0.8;

  // Shape B perturbs b and c
  float symOff = (symN - 0.5) * 0.6;
  b += symOff * 0.8;
  c += symOff;

  // Time-based parameter drift for animation
  float speed = mix(0.03, 0.18, speedN);
  float t = u_time * speed;
  a += sin(t * 0.7) * 0.08;
  b += cos(t * 0.5) * 0.06;
  c += sin(t * 0.6) * 0.07;
  d += cos(t * 0.8) * 0.05;

  // View settings
  float zoom = mix(0.16, 0.30, zoomN);

  // Slow rotation of the view
  float rotAngle = t * 0.3;
  float cosR = cos(rotAngle), sinR = sin(rotAngle);

  // Line rendering
  float lineW = mix(0.0012, 0.0045, thickN);
  float glowW = lineW * 3.5;

  // Trail length (400 to 800 iterations)
  int steps = int(mix(400.0, 800.0, trailN));
  float fSteps = float(steps);

  // Starting point
  float x = 0.1;
  float y = 0.1;

  // Warmup — settle onto attractor
  for (int i = 0; i < 48; i++) {
    float nx = sin(a * y) - cos(b * x);
    float ny = sin(c * x) - cos(d * y);
    x = nx;
    y = ny;
  }

  // Additional warmup for flowing animation
  int flowWarmup = int(mod(u_time * mix(3.0, 12.0, speedN), 400.0));
  for (int i = 0; i < 400; i++) {
    if (i >= flowWarmup) break;
    float nx = sin(a * y) - cos(b * x);
    float ny = sin(c * x) - cos(d * y);
    x = nx;
    y = ny;
  }

  // Project first point (scale and rotate)
  vec2 p = vec2(x, y) * zoom;
  vec2 prev = vec2(cosR * p.x - sinR * p.y, sinR * p.x + cosR * p.y);

  // Trace orbit and render
  vec3 colorAcc = vec3(0.0);

  for (int i = 0; i < 800; i++) {
    if (i >= steps) break;

    float nx = sin(a * y) - cos(b * x);
    float ny = sin(c * x) - cos(d * y);
    x = nx;
    y = ny;

    p = vec2(x, y) * zoom;
    vec2 curr = vec2(cosR * p.x - sinR * p.y, sinR * p.x + cosR * p.y);

    // Fade out long jumps between consecutive points
    float segLen = length(curr - prev);
    float fade = smoothstep(0.15, 0.02, segLen);

    float dist = segDist(uv, prev, curr);
    float phase = float(i) / fSteps;

    float line = smoothstep(lineW, lineW * 0.1, dist);
    float glow = exp(-dist * dist / (glowW * glowW));

    // Rainbow coloring along the orbit
    vec3 col = hsv2rgb(fract(phase * 2.0 + u_time * 0.05), 0.8, 1.0);
    colorAcc += col * (line + glow * 0.12) * fade;

    prev = curr;
  }

  // Compose
  vec3 bg = vec3(0.012, 0.012, 0.02);
  vec3 color = bg + colorAcc * 0.85;

  // Filmic tonemapping
  color = color / (1.0 + color * 0.4);
  color = pow(color, vec3(0.92));

  outColor = vec4(color, 1.0);
}
`,
};
