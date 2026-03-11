export interface ShaderSliderControl {
  key: string;
  label: string;
  description?: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  precision?: number;
  unit?: string;
}

export type ShaderControlValues = Record<string, number>;

// ── Fragment shader definition (existing: Lorenz, Rössler) ──

export interface FragmentShaderDefinition {
  kind: 'fragment';
  id: string;
  name: string;
  summary: string;
  fragmentShader: string;
  controls: ShaderSliderControl[];
  renderScale?: number;
  canvasHeight?: number | string;
  notes?: string[];
}

// ── OGL scene definition (new: L-System, etc.) ──

export interface OGLSceneDefinition {
  kind: 'ogl';
  id: string;
  name: string;
  summary: string;
  controls: ShaderSliderControl[];
  canvasHeight?: number | string;
  notes?: string[];
  /** Called once to build the scene. Returns a render callback and a dispose function. */
  setup: (ctx: OGLSetupContext) => OGLSceneHandle;
}

export interface OGLSetupContext {
  canvas: HTMLCanvasElement;
  getValues: () => ShaderControlValues;
  getPointer: () => { x: number; y: number };
}

export interface OGLSceneHandle {
  render: (time: number, dt: number) => void;
  dispose: () => void;
}

// ── Union ──

export type LabDefinition = FragmentShaderDefinition | OGLSceneDefinition;

// Backward compat — old imports can still use ShaderDefinition
export type ShaderDefinition = FragmentShaderDefinition;
