export enum DitherMethod {
  THRESHOLD = 'Threshold',
  FLOYD_STEINBERG = 'Floyd-Steinberg',
  ATKINSON = 'Atkinson',
  BAYER_4 = 'Bayer 4x4',
  BAYER_8 = 'Bayer 8x8',
  NOISE = 'Random Noise'
}

export interface DitherSettings {
  method: DitherMethod;
  threshold: number; // 0-255
  pixelSize: number; // 1-20
  contrast: number; // -100 to 100
  brightness: number; // -100 to 100
  greyscale: boolean;
}

export interface VibeResponse {
  settings: Partial<DitherSettings>;
  reasoning: string;
}