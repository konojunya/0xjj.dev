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

// ── Tree-constrained random L-System generation ──

interface TreeGrammar {
  axiom: string;
  rules: Record<string, string>;
  angle: number;
  style: PlantStyle;
}

type PlantStyle = 'tree' | 'bush' | 'fern' | 'seaweed' | 'vine' | 'coral';

function generateTreeGrammar(seed: number, density: number): TreeGrammar {
  const rng = mulberry32(seed);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const chance = (p: number) => rng() < p;
  const rangeInt = (lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

  // Pick a plant style — gives structural variety
  const style: PlantStyle = pick(['tree', 'tree', 'bush', 'fern', 'seaweed', 'vine', 'coral']);

  // Angle varies by style
  const angleMap: Record<PlantStyle, number[]> = {
    tree:    [18, 20, 22, 25, 28, 30, 35],
    bush:    [20, 25, 30, 35, 40, 45],
    fern:    [10, 12, 15, 18, 20, 25],
    seaweed: [12, 15, 18, 22, 28, 30, 35],
    vine:    [15, 20, 25, 30, 35, 45],
    coral:   [25, 30, 35, 40, 45, 60, 72, 90],
  };
  const angle = pick(angleMap[style]);

  const rules: Record<string, string> = {};
  let axiom: string;

  switch (style) {
    case 'tree': {
      // Classic tree: trunk + symmetric branch pairs
      const trunk = pick(['F', 'FF', 'FFF']);
      const branchCount = 1 + Math.floor(density * 2.5);
      const parts: string[] = [];
      if (chance(0.6)) parts.push(trunk);

      for (let i = 0; i < branchCount; i++) {
        const content = pick(['F', 'FF', 'F+F', 'F-F', 'FF+F', 'F-FF']);
        const asym = chance(0.3); // asymmetric branches
        parts.push(`[+${asym && chance(0.5) ? '+' : ''}${content}]`);
        if (i < branchCount - 1 && chance(0.7)) parts.push('F');
        parts.push(`[-${asym && chance(0.5) ? '-' : ''}${content}]`);
        if (chance(0.5)) parts.push('F');
      }
      if (chance(0.4)) parts.push(trunk);

      rules.F = parts.join('');

      // 50% chance of X-based meta-branching
      if (chance(0.5)) {
        const xParts: string[] = ['F'];
        const xN = 1 + Math.floor(density * 1.8);
        for (let i = 0; i < xN; i++) {
          xParts.push(pick(['[+X]', '[++X]']));
          if (chance(0.6)) xParts.push('F');
          xParts.push(pick(['[-X]', '[--X]']));
        }
        if (chance(0.5)) xParts.push('X');
        rules.X = xParts.join('');
        axiom = 'X';
      } else {
        axiom = 'F';
      }
      break;
    }

    case 'bush': {
      // Dense, wide, multi-branching from base
      const branchCount = 2 + Math.floor(density * 2);
      const parts: string[] = [];
      for (let i = 0; i < branchCount; i++) {
        const turns = pick(['+', '-', '++', '--', '']);
        const content = pick(['F', 'FF', 'F[+F]F', 'F[-F]F']);
        parts.push(`[${turns}${content}]`);
        if (chance(0.4)) parts.push('F');
      }
      rules.F = parts.join('');
      // Multi-stem axiom
      const stems = rangeInt(2, 4);
      const axiomParts: string[] = [];
      for (let i = 0; i < stems; i++) {
        axiomParts.push('F');
        if (i < stems - 1) axiomParts.push(pick(['+', '-']));
      }
      axiom = axiomParts.join('');
      break;
    }

    case 'fern': {
      // Asymmetric: one side has longer fronds
      const mainSide = pick(['+', '-']);
      const otherSide = mainSide === '+' ? '-' : '+';
      const frondLen = pick(['FF', 'FFF', 'FF+F', 'FF-F']);
      const smallFrond = pick(['F', 'F+F', 'F-F']);
      rules.F = `F[${mainSide}${mainSide}${frondLen}][${otherSide}${smallFrond}]F`;
      if (chance(0.5)) {
        rules.X = `F[${mainSide}${mainSide}X]F[${otherSide}X]FX`;
        axiom = 'X';
      } else {
        axiom = 'F';
      }
      break;
    }

    case 'seaweed': {
      // Flowing, curved, gentle branching
      const curve = pick(['+', '-']);
      const wobble = chance(0.5) ? `${curve}F${curve}` : `F${curve}F`;
      const branch = pick([
        `[${curve}${curve}F]F`,
        `F[${curve}F]`,
        `[${curve}F[${curve}F]]`,
      ]);
      rules.F = `${wobble}${branch}`;
      if (chance(0.6)) {
        rules.X = `F[+X][-X]${chance(0.5) ? 'FX' : 'X'}`;
        axiom = 'X';
      } else {
        axiom = 'F';
      }
      break;
    }

    case 'vine': {
      // Long trailing growth with sporadic branching
      const mainDir = pick(['+', '-']);
      const trailLen = pick(['FFF', 'FFFF', 'FFF+F', 'FFF-F']);
      const leaf = pick(['[+F]', '[-F]', '[+FF]', '[-FF]', `[${mainDir}F[${mainDir}F]]`]);
      rules.F = `F${mainDir}F${leaf}F`;
      if (chance(0.5)) {
        rules.X = `FX${leaf}`;
        axiom = 'X';
      } else {
        axiom = 'F';
      }
      break;
    }

    case 'coral': {
      // Wide angles, dense branching, space-filling
      const branchCount = 2 + Math.floor(density * 3);
      const parts: string[] = ['F'];
      for (let i = 0; i < branchCount; i++) {
        const nTurns = rangeInt(1, 3);
        const dir = chance(0.5) ? '+' : '-';
        const turns = dir.repeat(nTurns);
        const content = pick(['F', 'FF', 'F+F-F', 'F-F+F']);
        parts.push(`[${turns}${content}]`);
      }
      rules.F = parts.join('');
      axiom = 'F';
      break;
    }
  }

  return { axiom, rules, angle, style };
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
  branchDepth: number;
}

function interpretTurtle(lstr: string, angleDeg: number): TurtleSegment[] {
  const segments: TurtleSegment[] = [];
  const angleRad = (angleDeg * Math.PI) / 180;
  let x = 0, y = 0, a = Math.PI / 2; // facing up
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
    'Lindenmayer systems are parallel rewriting grammars that produce fractal plant-like structures. Each page load grows a unique tree from a time-based seed.',
  canvasHeight: 'clamp(320px, 52vh, 560px)',
  notes: [
    'L-System (Aristid Lindenmayer, 1968). A string-rewriting grammar where each iteration replaces symbols according to production rules, producing fractal growth.',
    'Turtle graphics interprets the string as drawing commands: F = forward, + = turn left, − = turn right, [ ] = push/pop state for branching.',
  ],
  controls: [
    {
      key: 'spread',
      label: 'Seed',
      description: 'Random seed — each value grows a unique tree. Seeded from current time on load.',
      min: 0,
      max: 9999,
      step: 1,
      defaultValue: Math.floor(Date.now() / 1000) % 10000,
      precision: 0,
    },
    {
      key: 'twist',
      label: 'Density',
      description: 'Branch density — sparse sapling to lush canopy.',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      precision: 0,
      unit: '%',
    },
    {
      key: 'detail',
      label: 'Growth',
      description: 'Growth stage — how many generations the tree has developed.',
      min: 1,
      max: 7,
      step: 1,
      defaultValue: 1,
      precision: 0,
    },
    {
      key: 'bloom',
      label: 'Line Width',
      description: 'Thickness of the branches.',
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
    {
      key: 'symmetry',
      label: 'Hue Shift',
      description: 'Shift the color palette along branches.',
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
    let prevDensity = -1;
    let prevGrowth = -1;
    // Cache segments per growth level for smooth animation
    let grammarCache: TreeGrammar | null = null;
    let segmentsByLevel: TurtleSegment[][] = [];

    function buildAllLevels(seed: number, density: number, maxLevel: number) {
      const grammar = generateTreeGrammar(seed, density);
      grammarCache = grammar;
      segmentsByLevel = [];
      for (let i = 1; i <= maxLevel; i++) {
        const lstr = expandLSystem(grammar.axiom, grammar.rules, i);
        const raw = interpretTurtle(lstr, grammar.angle);
        segmentsByLevel.push(normalizeSegments(raw));
      }
    }

    // Style-based color palettes: [trunkHue, trunkSat, tipHue, tipSat]
    const palettes: Record<PlantStyle, [number, number, number, number]> = {
      tree:    [0.08, 0.50, 0.33, 0.75], // brown → green
      bush:    [0.25, 0.55, 0.38, 0.80], // olive → bright green
      fern:    [0.30, 0.40, 0.42, 0.70], // muted green → vibrant green
      seaweed: [0.45, 0.40, 0.55, 0.65], // teal → blue-green
      vine:    [0.10, 0.50, 0.35, 0.70], // amber → green
      coral:   [0.95, 0.55, 0.05, 0.75], // pink-red → orange
    };

    function rebuildGeometry(segments: TurtleSegment[], lineWidth: number, drawRatio: number, hueShift: number, maxBranchDepth: number, style: PlantStyle) {
      const drawCount = Math.max(1, Math.floor(segments.length * drawRatio));

      const positions: number[] = [];
      const colors: number[] = [];
      const [hue0, sat0, hue1, sat1] = palettes[style];

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

        // Color: interpolate trunk → tip based on branch depth
        const branchRatio = maxBranchDepth > 0 ? s.branchDepth / maxBranchDepth : 0;
        const baseHue = hue0 + (hue1 - hue0) * branchRatio;
        const hue = ((baseHue + hueShift) % 1.0 + 1.0) % 1.0;
        const sat = sat0 + (sat1 - sat0) * branchRatio;
        const val = 0.92 - branchRatio * 0.12;
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
        const density = (values.twist ?? 50) / 100;
        const manualGrowth = Math.round(values.detail ?? 1);
        const lineWidth = values.bloom ?? 1.5;
        const speedN = (values.motion ?? 40) / 100;
        const hueShift = (values.symmetry ?? 0) / 100;

        const maxGrowth = 7;

        // Auto-growth: increment level over time
        const growthInterval = Math.max(0.5, 4 - speedN * 3.5); // 0.5s – 4s per level
        if (time - lastGrowthTime > growthInterval && autoGrowthLevel < maxGrowth) {
          autoGrowthLevel++;
          lastGrowthTime = time;
        }

        // Use the higher of manual slider and auto-growth
        const effectiveGrowth = Math.max(manualGrowth, autoGrowthLevel);

        // Rebuild if generation params changed
        if (seed !== prevSeed || density !== prevDensity || effectiveGrowth !== prevGrowth) {
          // Reset auto-growth if seed or density changed
          if (seed !== prevSeed || density !== prevDensity) {
            autoGrowthLevel = 1;
            lastGrowthTime = time;
          }
          prevSeed = seed;
          prevDensity = density;
          prevGrowth = effectiveGrowth;

          buildAllLevels(seed, density, effectiveGrowth);
        }

        const currentSegments = segmentsByLevel[segmentsByLevel.length - 1] ?? [];
        const maxBranchDepth = currentSegments.reduce((m, s) => Math.max(m, s.branchDepth), 0);

        // Draw progress within current growth level
        const levelProgress = Math.min((time - lastGrowthTime) / growthInterval, 1.0);
        const eased = levelProgress < 1 ? levelProgress * levelProgress * (3 - 2 * levelProgress) : 1;

        // If at max growth, show everything; otherwise progressive draw
        const drawRatio = effectiveGrowth >= maxGrowth ? 1.0 : eased;

        rebuildGeometry(currentSegments, lineWidth, drawRatio, hueShift, maxBranchDepth, grammarCache?.style ?? 'tree');

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
