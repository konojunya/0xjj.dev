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

// ── OGL scene definition (L-System, etc.) ──

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

// ── WebGPU definition (Reaction-Diffusion, etc.) ──

export interface WebGPUDefinition {
  kind: 'webgpu';
  id: string;
  name: string;
  summary: string;
  controls: ShaderSliderControl[];
  canvasHeight?: number | string;
  notes?: string[];
  setup: (ctx: WebGPUSetupContext) => Promise<WebGPUSceneHandle>;
}

export interface WebGPUSetupContext {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  format: GPUTextureFormat;
  getValues: () => ShaderControlValues;
  getPointer: () => { x: number; y: number };
}

export interface WebGPUSceneHandle {
  render: (time: number, dt: number) => void;
  dispose: () => void;
  reset?: () => void;
}

// ── Union ──

export type LabDefinition = FragmentShaderDefinition | OGLSceneDefinition | WebGPUDefinition;

// Backward compat
export type ShaderDefinition = FragmentShaderDefinition;
