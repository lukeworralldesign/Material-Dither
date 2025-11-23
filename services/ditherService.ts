import { DitherMethod } from '../types';

// Bayer Matrices
const bayer4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const bayer8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

export const processImage = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: {
    method: DitherMethod;
    threshold: number;
    pixelSize: number;
    contrast: number;
    brightness: number;
  }
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const w = width;
  const h = height;

  // Helper to adjust contrast/brightness
  const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
  
  const applyFilters = (r: number, g: number, b: number) => {
    // Greyscale luminance
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Brightness
    gray += settings.brightness;
    
    // Contrast
    gray = contrastFactor * (gray - 128) + 128;
    
    // Clamp
    return Math.max(0, Math.min(255, gray));
  };

  // Convert to greyscale & pre-process first (optimization: do it in place)
  // For error diffusion, we need floating point precision buffer to avoid cascading rounding errors excessively
  // But for JS canvas performance, we'll stick to mutating the Uint8ClampedArray or a temp buffer.
  // Using a Float32Array for the gray buffer allows for better error diffusion math.
  const buffer = new Float32Array(w * h);
  
  for (let i = 0; i < data.length; i += 4) {
    buffer[i / 4] = applyFilters(data[i], data[i + 1], data[i + 2]);
  }

  // Apply Dithering
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldPixel = buffer[i];
      
      let newPixel = 0;
      let quantError = 0;

      // Thresholding decision
      if (settings.method === DitherMethod.BAYER_4) {
        const mapValue = bayer4[y % 4][x % 4];
        // Normalize map value (0-15) to threshold range (roughly)
        const threshold = (mapValue / 16) * 255; 
        // Mix user threshold
        const finalThresh = (threshold + settings.threshold) / 2;
        newPixel = oldPixel < finalThresh ? 0 : 255;
      } else if (settings.method === DitherMethod.BAYER_8) {
        const mapValue = bayer8[y % 8][x % 8];
        const threshold = (mapValue / 64) * 255;
        const finalThresh = (threshold + settings.threshold) / 2;
        newPixel = oldPixel < finalThresh ? 0 : 255;
      } else if (settings.method === DitherMethod.NOISE) {
        const noise = (Math.random() - 0.5) * 60; // Noise variance
        newPixel = (oldPixel + noise) < settings.threshold ? 0 : 255;
      } else {
        // Standard threshold for diffusers
        newPixel = oldPixel < settings.threshold ? 0 : 255;
      }

      // Write back to buffer as 0 or 255
      buffer[i] = newPixel;
      
      // Calculate error for diffusion
      quantError = oldPixel - newPixel;

      // Error Diffusion Distribution
      if (settings.method === DitherMethod.FLOYD_STEINBERG) {
        if (x + 1 < w) buffer[i + 1] += quantError * (7 / 16);
        if (y + 1 < h) {
          if (x - 1 >= 0) buffer[i + w - 1] += quantError * (3 / 16);
          buffer[i + w] += quantError * (5 / 16);
          if (x + 1 < w) buffer[i + w + 1] += quantError * (1 / 16);
        }
      } else if (settings.method === DitherMethod.ATKINSON) {
        if (x + 1 < w) buffer[i + 1] += quantError * (1 / 8);
        if (x + 2 < w) buffer[i + 2] += quantError * (1 / 8);
        if (y + 1 < h) {
            if (x - 1 >= 0) buffer[i + w - 1] += quantError * (1 / 8);
            buffer[i + w] += quantError * (1 / 8);
            if (x + 1 < w) buffer[i + w + 1] += quantError * (1 / 8);
        }
        if (y + 2 < h) {
            buffer[i + 2 * w] += quantError * (1 / 8);
        }
      }
    }
  }

  // Write back to ImageData
  for (let i = 0; i < buffer.length; i++) {
    const val = buffer[i];
    const idx = i * 4;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    // data[idx + 3] (Alpha) remains unchanged unless we want transparency for white/black?
    // Let's keep it opaque.
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
};