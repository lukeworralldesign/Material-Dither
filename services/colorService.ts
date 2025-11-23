// Simple HSL helpers
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Generate a tonal palette based on a seed hue
function generatePalette(h: number, s: number) {
  // We force a Dark Theme logic here
  // Primary: High brightness, high saturation
  const primary = hslToRgb(h, Math.min(s, 0.9), 0.85); 
  // OnPrimary: Very dark
  const onPrimary = hslToRgb(h, Math.min(s, 0.9), 0.1); 
  // PrimaryContainer: Medium-Dark
  const primaryContainer = hslToRgb(h, Math.min(s, 0.8), 0.3);
  // OnPrimaryContainer: Very Light
  const onPrimaryContainer = hslToRgb(h, Math.min(s, 0.9), 0.95);

  // Surface: Very Dark, slightly tinted
  const surface = hslToRgb(h, s * 0.2, 0.06);
  const onSurface = hslToRgb(h, s * 0.1, 0.95);
  
  // Containers
  const surfaceContainerLow = hslToRgb(h, s * 0.2, 0.10);
  const surfaceContainer = hslToRgb(h, s * 0.2, 0.12);
  const surfaceContainerHigh = hslToRgb(h, s * 0.2, 0.17);

  // Secondary/Outline
  const outline = hslToRgb(h, s * 0.1, 0.6);

  return {
    '--primary': rgbToHex(...primary),
    '--on-primary': rgbToHex(...onPrimary),
    '--primary-container': rgbToHex(...primaryContainer),
    '--on-primary-container': rgbToHex(...onPrimaryContainer),
    '--surface': rgbToHex(...surface),
    '--on-surface': rgbToHex(...onSurface),
    '--surface-container-low': rgbToHex(...surfaceContainerLow),
    '--surface-container': rgbToHex(...surfaceContainer),
    '--surface-container-high': rgbToHex(...surfaceContainerHigh),
    '--outline': rgbToHex(...outline),
  };
}

export const extractColorAndTheme = async (imageSrc: string): Promise<Record<string, string>> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({});

      // Scale down significantly for performance and averaging
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;

      // Simple averaging (weighted towards center could be better, but this works for vibe)
      for (let i = 0; i < data.length; i += 4) {
        // Ignore white/black/transparent pixels to find the "color"
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = (r+g+b)/3;
        const saturation = Math.max(r,g,b) - Math.min(r,g,b);
        
        // Weigh saturated pixels more
        if (saturation > 20 && brightness > 20 && brightness < 240) {
            rTotal += r;
            gTotal += g;
            bTotal += b;
            count++;
        }
      }

      let finalR = 0, finalG = 0, finalB = 0;
      if (count > 0) {
        finalR = Math.round(rTotal / count);
        finalG = Math.round(gTotal / count);
        finalB = Math.round(bTotal / count);
      } else {
        // Fallback to a nice purple if image is purely monochrome
        finalR = 100; finalG = 100; finalB = 255;
      }

      const [h, s, l] = rgbToHsl(finalR, finalG, finalB);
      // Boost saturation for the theme generator to make it pop
      const theme = generatePalette(h, Math.max(s, 0.4));
      resolve(theme);
    };
  });
};