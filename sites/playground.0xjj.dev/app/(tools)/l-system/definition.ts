import { Renderer, Camera, Transform, Geometry, Program, Mesh } from 'ogl';
import type { OGLSceneDefinition } from '@/components/shader-lab/types';

// ── L-System grammar ──

interface LSystemRule {
  axiom: string;
  rules: Record<string, string>;
}

const PRESETS: LSystemRule[] = [
  // 0: Fractal Plant (Lindenmayer classic)
  { axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' } },
  // 1: Koch Snowflake variant
  { axiom: 'F-F-F-F', rules: { F: 'F-F+F+FF-F-F+F' } },
  // 2: Dragon Curve
  { axiom: 'FX', rules: { X: 'X+YF+', Y: '-FX-Y' } },
  // 3: Sierpinski Triangle
  { axiom: 'F-G-G', rules: { F: 'F-G+F+G-F', G: 'GG' } },
  // 4: Hilbert Curve
  { axiom: 'A', rules: { A: '-BF+AFA+FB-', B: '+AF-BFB-FA+' } },
];

function expandLSystem(axiom: string, rules: Record<string, string>, iterations: number): string {
  let str = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of str) {
      next += rules[ch] ?? ch;
    }
    str = next;
    // Safety: cap string length to avoid memory explosion
    if (str.length > 500_000) break;
  }
  return str;
}

interface TurtleSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  depth: number; // normalized 0..1 along the path
}

function interpretTurtle(lstr: string, angleDeg: number): TurtleSegment[] {
  const segments: TurtleSegment[] = [];
  const angleRad = (angleDeg * Math.PI) / 180;
  let x = 0, y = 0, a = Math.PI / 2; // start facing up
  const stack: { x: number; y: number; a: number }[] = [];
  let step = 0;
  const totalDrawable = [...lstr].filter(c => c === 'F' || c === 'G').length;

  for (const ch of lstr) {
    switch (ch) {
      case 'F':
      case 'G': {
        const nx = x + Math.cos(a);
        const ny = y + Math.sin(a);
        segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth: step / Math.max(totalDrawable, 1) });
        x = nx;
        y = ny;
        step++;
        break;
      }
      case '+':
        a += angleRad;
        break;
      case '-':
        a -= angleRad;
        break;
      case '[':
        stack.push({ x, y, a });
        break;
      case ']':
        if (stack.length > 0) {
          const s = stack.pop()!;
          x = s.x; y = s.y; a = s.a;
        }
        break;
    }
  }

  return segments;
}

function normalizeSegments(segments: TurtleSegment[]): TurtleSegment[] {
  if (segments.length === 0) return segments;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of segments) {
    minX = Math.min(minX, s.x1, s.x2);
    maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxY = Math.max(maxY, s.y1, s.y2);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const range = Math.max(maxX - minX, maxY - minY, 0.001);
  const scale = 1.8 / range; // fit into [-0.9, 0.9]

  return segments.map(s => ({
    x1: (s.x1 - cx) * scale,
    y1: (s.y1 - cy) * scale,
    x2: (s.x2 - cx) * scale,
    y2: (s.y2 - cy) * scale,
    depth: s.depth,
  }));
}

// ── HSV helper ──

function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    case 5: return [v, p, q];
    default: return [v, v, v];
  }
}

// ── Definition ──

export const lSystemDefinition: OGLSceneDefinition = {
  kind: 'ogl',
  id: 'l-system',
  name: 'L-System',
  summary:
    'Lindenmayer systems are parallel rewriting grammars that produce fractal plant-like structures, space-filling curves, and other self-similar patterns.',
  canvasHeight: 'clamp(320px, 52vh, 560px)',
  notes: [
    'L-System (Aristid Lindenmayer, 1968). A string-rewriting grammar where each iteration replaces symbols according to production rules, producing fractal growth.',
    'Turtle graphics interprets the string as drawing commands: F = forward, + = turn left, − = turn right, [ ] = push/pop state for branching.',
  ],
  controls: [
    {
      key: 'spread',
      label: 'Preset',
      description: 'Choose an L-System pattern: Plant, Koch, Dragon, Sierpinski, Hilbert.',
      min: 0,
      max: 4,
      step: 1,
      defaultValue: 0,
      precision: 0,
    },
    {
      key: 'twist',
      label: 'Angle',
      description: 'Turning angle in degrees.',
      min: 10,
      max: 120,
      step: 1,
      defaultValue: 25,
      precision: 0,
      unit: '°',
    },
    {
      key: 'detail',
      label: 'Iterations',
      description: 'Number of rewriting iterations — more iterations reveal finer fractal detail.',
      min: 1,
      max: 7,
      step: 1,
      defaultValue: 5,
      precision: 0,
    },
    {
      key: 'bloom',
      label: 'Line Width',
      description: 'Thickness of the rendered lines.',
      min: 1,
      max: 5,
      step: 0.5,
      defaultValue: 1.5,
      precision: 1,
      unit: 'px',
    },
    {
      key: 'motion',
      label: 'Draw Speed',
      description: 'Speed of the progressive drawing animation.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'symmetry',
      label: 'Hue Shift',
      description: 'Shift the rainbow color palette along the path.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 0,
      precision: 0,
      unit: '%',
    },
  ],
  setup(ctx) {
    const { canvas, getValues, getPointer } = ctx;

    const renderer = new Renderer({
      canvas,
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      powerPreference: /Mobi|Android/i.test(navigator.userAgent) ? 'low-power' : 'high-performance',
    });
    const gl = renderer.gl;
    gl.clearColor(0.012, 0.012, 0.02, 1);

    const camera = new Camera(gl);
    camera.orthographic({ left: -1, right: 1, top: 1, bottom: -1, near: -1, far: 1 });

    const scene = new Transform();

    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        varying vec3 vColor;
        void main() {
          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
    });

    let mesh: Mesh | null = null;
    let prevPreset = -1;
    let prevAngle = -1;
    let prevIter = -1;
    let cachedSegments: TurtleSegment[] = [];
    let totalSegments = 0;

    function rebuildGeometry(segments: TurtleSegment[], lineWidth: number, drawRatio: number, hueShift: number) {
      const drawCount = Math.max(1, Math.floor(segments.length * drawRatio));

      // Build line-quad geometry (2 triangles per segment for thick lines)
      const positions: number[] = [];
      const colors: number[] = [];

      const hw = lineWidth * 0.001; // half-width in normalized coords

      for (let i = 0; i < drawCount; i++) {
        const s = segments[i];
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-8) continue;

        // Normal perpendicular to segment
        const nx = (-dy / len) * hw;
        const ny = (dx / len) * hw;

        // Quad corners
        const ax = s.x1 + nx, ay = s.y1 + ny;
        const bx = s.x1 - nx, by = s.y1 - ny;
        const cx = s.x2 + nx, cy = s.y2 + ny;
        const ddx = s.x2 - nx, ddy = s.y2 - ny;

        // Two triangles
        positions.push(ax, ay, 0, bx, by, 0, cx, cy, 0);
        positions.push(bx, by, 0, ddx, ddy, 0, cx, cy, 0);

        // Color based on depth along path
        const hue = (s.depth + hueShift) % 1.0;
        const [r, g, b] = hsv2rgb(hue, 0.7, 0.95);
        for (let j = 0; j < 6; j++) {
          colors.push(r, g, b);
        }
      }

      if (positions.length === 0) return;

      const geometry = new Geometry(gl, {
        position: { size: 3, data: new Float32Array(positions) },
        color: { size: 3, data: new Float32Array(colors) },
      });

      if (mesh) {
        mesh.geometry = geometry;
      } else {
        mesh = new Mesh(gl, { geometry, program, mode: gl.TRIANGLES });
        mesh.setParent(scene);
      }
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      const maxDpr = isMobile ? 1.5 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      renderer.setSize(rect.width * dpr, rect.height * dpr);
      canvas.style.width = '';
      canvas.style.height = '';
    }

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);
    resize();

    return {
      render(time) {
        const values = getValues();
        const presetIdx = Math.round(Math.min(Math.max(values.spread ?? 0, 0), 4));
        const angle = values.twist ?? 25;
        const iterations = Math.round(Math.min(Math.max(values.detail ?? 5, 1), 7));
        const lineWidth = values.bloom ?? 1.5;
        const speedN = (values.motion ?? 50) / 100;
        const hueShift = (values.symmetry ?? 0) / 100;

        // Rebuild segments if params changed
        if (presetIdx !== prevPreset || angle !== prevAngle || iterations !== prevIter) {
          prevPreset = presetIdx;
          prevAngle = angle;
          prevIter = iterations;

          const preset = PRESETS[presetIdx];
          const lstr = expandLSystem(preset.axiom, preset.rules, iterations);
          const raw = interpretTurtle(lstr, angle);
          cachedSegments = normalizeSegments(raw);
          totalSegments = cachedSegments.length;
        }

        // Progressive draw animation
        const drawSpeed = Math.max(0.01, speedN);
        const cycleTime = 10 / drawSpeed;
        const progress = Math.min((time % cycleTime) / (cycleTime * 0.8), 1.0);
        const eased = progress < 1 ? progress * progress * (3 - 2 * progress) : 1; // smoothstep

        rebuildGeometry(cachedSegments, lineWidth, eased, hueShift);

        resize();
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (mesh) {
          renderer.render({ scene, camera });
        }
      },
      dispose() {
        resizeObserver.disconnect();
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      },
    };
  },
};
