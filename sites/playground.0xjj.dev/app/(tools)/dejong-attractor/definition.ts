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

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float zoomN  = clamp(u_spread / 100.0, 0.0, 1.0);
  float twistN = clamp(u_twist / 100.0, 0.0, 1.0);
  float symN   = clamp(u_symmetry / 100.0, 0.0, 1.0);
  float trailN = clamp(u_detail / 100.0, 0.0, 1.0);
  float thickN = clamp(u_bloom / 100.0, 0.0, 1.0);
  float speedN = clamp(u_motion / 100.0, 0.0, 1.0);

  // De Jong parameters — base set produces a beautiful swirling pattern
  float a = -2.24;
  float b =  0.43;
  float c = -0.65;
  float d = -2.43;

  // Shape A perturbs a and d
  float twistOff = (twistN - 0.5) * 0.5;
  a += twistOff;
  d += twistOff * 0.7;

  // Shape B perturbs b and c
  float symOff = (symN - 0.5) * 0.5;
  b += symOff * 0.7;
  c += symOff;

  // Time-based drift for gentle animation
  float speed = mix(0.02, 0.12, speedN);
  float t = u_time * speed;
  a += sin(t * 0.7) * 0.06;
  b += cos(t * 0.5) * 0.04;
  c += sin(t * 0.6) * 0.05;
  d += cos(t * 0.8) * 0.04;

  // View: the attractor lives in roughly [-2, 2] so scale to fit
  float zoom = mix(0.18, 0.32, zoomN);

  // Slow rotation
  float rotAngle = t * 0.25;
  float cosR = cos(rotAngle), sinR = sin(rotAngle);

  // Point rendering: radius for the Gaussian dot
  float radius = mix(0.003, 0.010, thickN);
  float invR2 = 1.0 / (radius * radius);

  // Iteration count (1000 to 3000)
  int steps = int(mix(1000.0, 3000.0, trailN));
  float fSteps = float(steps);

  // Density and color accumulators
  float density = 0.0;
  vec3 colorAcc = vec3(0.0);

  // Run multiple orbits from different starting points for more coverage
  for (int orbit = 0; orbit < 3; orbit++) {
    float ox = 0.1 + float(orbit) * 0.37;
    float oy = 0.1 - float(orbit) * 0.29;

    // Warmup: settle onto attractor
    for (int i = 0; i < 64; i++) {
      float nx = sin(a * oy) - cos(b * ox);
      float ny = sin(c * ox) - cos(d * oy);
      ox = nx;
      oy = ny;
    }

    for (int i = 0; i < 3000; i++) {
      if (i >= steps) break;

      float nx = sin(a * oy) - cos(b * ox);
      float ny = sin(c * ox) - cos(d * oy);
      ox = nx;
      oy = ny;

      // Project point
      vec2 p = vec2(ox, oy) * zoom;
      vec2 proj = vec2(cosR * p.x - sinR * p.y, sinR * p.x + cosR * p.y);

      // Distance from this pixel to the projected point
      float dist2 = dot(uv - proj, uv - proj);

      // Gaussian splat
      float w = exp(-dist2 * invR2);

      // Color based on position in orbit
      float phase = float(i) / fSteps + float(orbit) * 0.33;
      vec3 col = hsv2rgb(fract(phase * 1.5 + t * 0.1), 0.75, 1.0);

      density += w;
      colorAcc += col * w;
    }
  }

  // Log-density tonemapping for good dynamic range
  vec3 bg = vec3(0.012, 0.012, 0.02);

  if (density > 0.001) {
    vec3 avgCol = colorAcc / density;
    float brightness = log(1.0 + density * 8.0) * 0.35;
    brightness = min(brightness, 1.8);
    vec3 color = avgCol * brightness;

    // Filmic tonemap
    color = color / (1.0 + color * 0.3);
    color = pow(color, vec3(0.9));

    outColor = vec4(color, 1.0);
  } else {
    outColor = vec4(bg, 1.0);
  }
}
`,
};
