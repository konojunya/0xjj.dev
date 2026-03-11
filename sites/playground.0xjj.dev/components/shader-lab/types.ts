export type ShaderGraphicsAPI = 'webgl2' | 'webgpu';
export type ShaderRenderLayer = 'raw' | 'ogl';

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

export interface ShaderDefinition {
  id: string;
  name: string;
  summary: string;
  renderer:
    | {
      graphics: 'webgl2';
      render: 'raw' | 'ogl';
    }
    | {
      graphics: 'webgpu';
      render: 'raw';
    };
  fragmentShader: string;
  controls: ShaderSliderControl[];
  renderScale?: number;
  canvasHeight?: number | string;
  notes?: string[];
}

export type ShaderControlValues = Record<string, number>;
