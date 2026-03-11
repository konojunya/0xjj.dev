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

// ── Random L-System rule generation ──

interface LSystemGrammar {
  axiom: string;
  rules: Record<string, string>;
  angle: number;
}

function generateRandomGrammar(seed: number, complexity: number): LSystemGrammar {
  const rng = mulberry32(seed);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const chance = (p: number) => rng() < p;

  // Decide structure type
  const useBranching = chance(0.6 + complexity * 0.2);
  const useSecondSymbol = chance(0.4);

  // Rule length scales with complexity (4–14 tokens)
  const ruleLen = Math.floor(4 + complexity * 10);

  // Generate angle from a set of "nice" angles
  const niceAngles = [15, 20, 22.5, 25, 30, 36, 45, 60, 72, 90, 120];
  const angle = pick(niceAngles);

  function generateRule(length: number, branchProb: number): string {
    const tokens: string[] = [];
    let bracketDepth = 0;

    for (let i = 0; i < length; i++) {
      const r = rng();

      if (bracketDepth > 0 && r < 0.15 && i > 0) {
        // Close bracket
        tokens.push(']');
        bracketDepth--;
      } else if (useBranching && r < branchProb && bracketDepth < 2 && i < length - 2) {
        // Open bracket
        tokens.push('[');
        bracketDepth++;
      } else if (r < 0.35 + branchProb * 0.2) {
        tokens.push('+');
      } else if (r < 0.55 + branchProb * 0.2) {
        tokens.push('-');
      } else {
        tokens.push(useSecondSymbol && chance(0.3) ? 'G' : 'F');
      }
    }

    // Close any remaining brackets
    while (bracketDepth > 0) {
      tokens.push(']');
      bracketDepth--;
    }

    // Ensure at least one F
    if (!tokens.includes('F') && !tokens.includes('G')) {
      tokens[Math.floor(rng() * tokens.length)] = 'F';
    }

    return tokens.join('');
  }

  const branchProb = useBranching ? 0.15 + complexity * 0.15 : 0;
  const rules: Record<string, string> = {
    F: generateRule(ruleLen, branchProb),
  };

  let axiom: string;

  if (useSecondSymbol) {
    rules.G = generateRule(Math.max(3, ruleLen - 2), branchProb * 0.7);
    axiom = chance(0.5) ? 'F-G-G' : 'F+G+F';
  } else if (useBranching) {
    axiom = pick(['F', 'X']);
    if (axiom === 'X') {
      // X is a non-drawing symbol that expands into branching structure
      rules.X = generateRule(Math.max(4, ruleLen), branchProb * 1.3);
    }
  } else {
    // Geometric / tiling patterns
    const sides = pick([3, 4, 5, 6]);
    const parts: string[] = [];
    for (let i = 0; i < sides; i++) {
      parts.push('F');
      if (i < sides - 1) parts.push('-');
    }
    axiom = parts.join('');
  }

  return { axiom, rules, angle };
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
    if (str.length > 500_000) break;
  }
  return str;
}

// ── Turtle graphics ──

interface TurtleSegment {
  x1: number; y1: number;
  x2: number; y2: number;
  depth: number;
}

function interpretTurtle(lstr: string, angleDeg: number): TurtleSegment[] {
  const segments: TurtleSegment[] = [];
  const angleRad = (angleDeg * Math.PI) / 180;
  let x = 0, y = 0, a = Math.PI / 2;
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
  const scale = 1.8 / range;

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
      label: 'Seed',
      description: 'Random seed — each value generates a unique L-System grammar.',
      min: 0,
      max: 999,
      step: 1,
      defaultValue: Math.floor(Math.random() * 1000),
      precision: 0,
    },
    {
      key: 'twist',
      label: 'Complexity',
      description: 'Rule length and branching probability.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'detail',
      label: 'Iterations',
      description: 'Number of rewriting iterations — more iterations reveal finer fractal detail.',
      min: 1,
      max: 7,
      step: 1,
      defaultValue: 4,
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
    let prevComplexity = -1;
    let prevIter = -1;
    let cachedSegments: TurtleSegment[] = [];

    function rebuildGeometry(segments: TurtleSegment[], lineWidth: number, drawRatio: number, hueShift: number) {
      const drawCount = Math.max(1, Math.floor(segments.length * drawRatio));

      const positions: number[] = [];
      const colors: number[] = [];
      const hw = lineWidth * 0.001;

      for (let i = 0; i < drawCount; i++) {
        const s = segments[i];
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-8) continue;

        const nx = (-dy / len) * hw;
        const ny = (dx / len) * hw;

        const ax = s.x1 + nx, ay = s.y1 + ny;
        const bx = s.x1 - nx, by = s.y1 - ny;
        const cx = s.x2 + nx, cy = s.y2 + ny;
        const ddx = s.x2 - nx, ddy = s.y2 - ny;

        positions.push(ax, ay, 0, bx, by, 0, cx, cy, 0);
        positions.push(bx, by, 0, ddx, ddy, 0, cx, cy, 0);

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
        const seed = Math.round(values.spread ?? 0);
        const complexity = (values.twist ?? 50) / 100;
        const iterations = Math.round(Math.min(Math.max(values.detail ?? 4, 1), 7));
        const lineWidth = values.bloom ?? 1.5;
        const speedN = (values.motion ?? 50) / 100;
        const hueShift = (values.symmetry ?? 0) / 100;

        // Rebuild segments if generation params changed
        if (seed !== prevSeed || complexity !== prevComplexity || iterations !== prevIter) {
          prevSeed = seed;
          prevComplexity = complexity;
          prevIter = iterations;

          const grammar = generateRandomGrammar(seed, complexity);
          const lstr = expandLSystem(grammar.axiom, grammar.rules, iterations);
          const raw = interpretTurtle(lstr, grammar.angle);
          cachedSegments = normalizeSegments(raw);
        }

        // Progressive draw animation
        const drawSpeed = Math.max(0.01, speedN);
        const cycleTime = 10 / drawSpeed;
        const progress = Math.min((time % cycleTime) / (cycleTime * 0.8), 1.0);
        const eased = progress < 1 ? progress * progress * (3 - 2 * progress) : 1;

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
