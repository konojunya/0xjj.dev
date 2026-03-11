import { Renderer, Camera, Transform, Geometry, Program, Mesh } from 'ogl';
import type { OGLSceneDefinition } from '@/components/shader-lab/types';

// ── Seeded PRNG (mulberry32) ──

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Leaf venation L-System templates ──
// Each template produces leaf-like patterns — midribs with branching veins.

interface LeafTemplate {
  axiom: string;
  rules: Record<string, string>;
  angleRange: [number, number];
}

const TEMPLATES: LeafTemplate[] = [
  // Pinnate leaf: central midrib with alternating side veins
  {
    axiom: 'X',
    rules: { X: 'F[+X]F[-X]+X', F: 'FF' },
    angleRange: [22, 32],
  },
  // Broad leaf: dense branching fills area
  {
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    angleRange: [20, 28],
  },
  // Palmate leaf: veins fan out from base
  {
    axiom: 'F',
    rules: { F: 'FF+[+F-F-F]-[-F+F+F]' },
    angleRange: [18, 26],
  },
  // Fern frond: asymmetric side veins
  {
    axiom: 'X',
    rules: { X: 'F-[[X]+X]+F[+FX]-X', F: 'FF' },
    angleRange: [20, 28],
  },
  // Elm leaf: tight branching veins
  {
    axiom: 'X',
    rules: { X: 'F[+X][-X]FX', F: 'FF' },
    angleRange: [24, 34],
  },
  // Willow leaf: narrow, drooping veins
  {
    axiom: 'X',
    rules: { X: 'F[+X]F[-X]-X', F: 'FF' },
    angleRange: [14, 22],
  },
  // Maple leaf: wide spreading veins
  {
    axiom: 'X',
    rules: { X: 'F[-X][+X]FX', F: 'FF' },
    angleRange: [26, 38],
  },
  // Dense venation: many small veins
  {
    axiom: 'X',
    rules: { X: 'F[+F+X][-F-X]FX', F: 'FF' },
    angleRange: [18, 26],
  },
];

interface TreeGrammar {
  axiom: string;
  rules: Record<string, string>;
  angle: number;
}

function generateLeafGrammar(seed: number): TreeGrammar {
  // Mix seed bits so adjacent seeds scatter across templates
  const rng = mulberry32(seed * 2654435761);

  const template = TEMPLATES[Math.floor(rng() * TEMPLATES.length)];

  const [minA, maxA] = template.angleRange;
  const angle = minA + rng() * (maxA - minA);

  // Small mutations to keep it leaf-like but unique
  const rules: Record<string, string> = {};
  for (const [key, rule] of Object.entries(template.rules)) {
    let mutated = rule;

    // Occasionally add an extra F for longer veins
    if (rng() < 0.3) {
      const idx = mutated.indexOf('F');
      if (idx >= 0 && rng() < 0.5) {
        mutated = mutated.slice(0, idx) + 'FF' + mutated.slice(idx + 1);
      }
    }

    // Occasionally mirror for left/right variety
    if (rng() < 0.25) {
      mutated = mutated.split('').map(c => c === '+' ? '-' : c === '-' ? '+' : c).join('');
    }

    rules[key] = mutated;
  }

  return { axiom: template.axiom, rules, angle };
}

// ── L-System expansion ──

function expandLSystem(axiom: string, rules: Record<string, string>, iterations: number): string {
  let str = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of str) {
      next += rules[ch] ?? ch;
    }
    str = next;
    if (str.length > 2_000_000) break;
  }
  return str;
}

// ── Turtle graphics ──

interface TurtleSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  depth: number;
  branchDepth: number;
}

function interpretTurtle(lstr: string, angleDeg: number): TurtleSegment[] {
  const segments: TurtleSegment[] = [];
  const angleRad = (angleDeg * Math.PI) / 180;
  let x = 0, y = 0, a = Math.PI / 2;
  let bracketDepth = 0;
  const stack: { x: number; y: number; a: number; d: number }[] = [];
  let step = 0;
  const totalDrawable = [...lstr].filter(c => c === 'F' || c === 'G').length;

  for (const ch of lstr) {
    switch (ch) {
      case 'F':
      case 'G': {
        const nx = x + Math.cos(a);
        const ny = y + Math.sin(a);
        segments.push({
          x1: x, y1: y, x2: nx, y2: ny,
          depth: step / Math.max(totalDrawable, 1),
          branchDepth: bracketDepth,
        });
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
        stack.push({ x, y, a, d: bracketDepth });
        bracketDepth++;
        break;
      case ']':
        if (stack.length > 0) {
          const s = stack.pop()!;
          x = s.x; y = s.y; a = s.a;
          bracketDepth = s.d;
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
  const scale = 1.7 / range;

  return segments.map(s => ({
    x1: (s.x1 - cx) * scale,
    y1: (s.y1 - cy) * scale,
    x2: (s.x2 - cx) * scale,
    y2: (s.y2 - cy) * scale,
    depth: s.depth,
    branchDepth: s.branchDepth,
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
    'Lindenmayer systems are parallel rewriting grammars that produce fractal leaf venation patterns. Each page load grows a unique leaf from a time-based seed.',
  canvasHeight: 'clamp(320px, 52vh, 560px)',
  notes: [
    'L-System (Aristid Lindenmayer, 1968). A string-rewriting grammar where each iteration replaces symbols according to production rules, producing fractal growth.',
    'Turtle graphics interprets the string as drawing commands: F = forward, + = turn left, − = turn right, [ ] = push/pop state for branching.',
  ],
  controls: [
    {
      key: 'spread',
      label: 'Seed',
      description: 'Random seed — each value generates a unique leaf pattern.',
      min: 0,
      max: 9999,
      step: 1,
      defaultValue: Math.floor(Date.now() / 1000) % 10000,
      precision: 0,
    },
    {
      key: 'detail',
      label: 'Max Iterations',
      description: 'Maximum growth depth — higher values reveal finer vein detail.',
      min: 2,
      max: 8,
      step: 1,
      defaultValue: 6,
      precision: 0,
    },
    {
      key: 'bloom',
      label: 'Line Width',
      description: 'Thickness of the veins.',
      min: 1,
      max: 5,
      step: 0.5,
      defaultValue: 1.5,
      precision: 1,
      unit: 'px',
    },
    {
      key: 'motion',
      label: 'Growth Speed',
      description: 'Speed of automatic growth animation.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 40,
      precision: 0,
      unit: '%',
    },
  ],
  setup(ctx) {
    const { canvas, getValues } = ctx;

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
    let prevSeed = -1;
    let prevGrowth = -1;
    let grammarCache: TreeGrammar | null = null;
    let segmentsByLevel: TurtleSegment[][] = [];

    function buildAllLevels(seed: number, maxLevel: number) {
      const grammar = generateLeafGrammar(seed);
      grammarCache = grammar;
      segmentsByLevel = [];
      for (let i = 1; i <= maxLevel; i++) {
        const lstr = expandLSystem(grammar.axiom, grammar.rules, i);
        const raw = interpretTurtle(lstr, grammar.angle);
        segmentsByLevel.push(normalizeSegments(raw));
      }
    }

    function rebuildGeometry(segments: TurtleSegment[], lineWidth: number, drawRatio: number, maxBranchDepth: number) {
      const drawCount = Math.max(1, Math.floor(segments.length * drawRatio));

      const positions: number[] = [];
      const colors: number[] = [];

      for (let i = 0; i < drawCount; i++) {
        const s = segments[i];
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-8) continue;

        // Thicker trunk, thinner branches
        const depthFade = Math.max(0.3, 1.0 - s.branchDepth * 0.15);
        const hw = lineWidth * 0.001 * depthFade;

        const nx = (-dy / len) * hw;
        const ny = (dx / len) * hw;

        const ax = s.x1 + nx, ay = s.y1 + ny;
        const bx = s.x1 - nx, by = s.y1 - ny;
        const cx = s.x2 + nx, cy = s.y2 + ny;
        const ddx = s.x2 - nx, ddy = s.y2 - ny;

        positions.push(ax, ay, 0, bx, by, 0, cx, cy, 0);
        positions.push(bx, by, 0, ddx, ddy, 0, cx, cy, 0);

        // Color: dark green midrib → lighter green tips
        const branchRatio = maxBranchDepth > 0 ? s.branchDepth / maxBranchDepth : 0;
        const hue = 0.28 + branchRatio * 0.08; // green range
        const sat = 0.65 - branchRatio * 0.15;
        const val = 0.55 + branchRatio * 0.35;
        const [r, g, b] = hsv2rgb(hue, sat, val);
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

    // Auto-growth state
    let autoGrowthLevel = 1;
    let lastGrowthTime = 0;

    return {
      render(time) {
        const values = getValues();
        const seed = Math.round(values.spread ?? 0);
        const maxIter = Math.round(values.detail ?? 6);
        const lineWidth = values.bloom ?? 1.5;
        const speedN = (values.motion ?? 40) / 100;

        // Auto-growth: increment level over time up to maxIter
        const growthInterval = Math.max(0.5, 4 - speedN * 3.5);
        if (time - lastGrowthTime > growthInterval && autoGrowthLevel < maxIter) {
          autoGrowthLevel++;
          lastGrowthTime = time;
        }

        const effectiveGrowth = autoGrowthLevel;

        // Rebuild if params changed
        if (seed !== prevSeed || effectiveGrowth !== prevGrowth || maxIter !== prevGrowth) {
          if (seed !== prevSeed || maxIter < autoGrowthLevel) {
            autoGrowthLevel = 1;
            lastGrowthTime = time;
          }
          prevSeed = seed;
          prevGrowth = effectiveGrowth;

          buildAllLevels(seed, effectiveGrowth);
        }

        const currentSegments = segmentsByLevel[segmentsByLevel.length - 1] ?? [];
        const maxBranchDepth = currentSegments.reduce((m, s) => Math.max(m, s.branchDepth), 0);

        // Draw progress within current growth level
        const levelProgress = Math.min((time - lastGrowthTime) / growthInterval, 1.0);
        const eased = levelProgress < 1 ? levelProgress * levelProgress * (3 - 2 * levelProgress) : 1;
        const drawRatio = effectiveGrowth >= maxIter ? 1.0 : eased;

        rebuildGeometry(currentSegments, lineWidth, drawRatio, maxBranchDepth);

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
