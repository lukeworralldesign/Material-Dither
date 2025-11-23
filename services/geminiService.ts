import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DitherMethod, VibeResponse } from "../types";

// Safety check for API key
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

const vibeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    settings: {
      type: Type.OBJECT,
      properties: {
        method: { type: Type.STRING, enum: Object.values(DitherMethod) },
        threshold: { type: Type.INTEGER },
        contrast: { type: Type.INTEGER },
        brightness: { type: Type.INTEGER },
        pixelSize: { type: Type.INTEGER },
      },
      required: ['method', 'threshold', 'contrast', 'brightness']
    },
    reasoning: { type: Type.STRING }
  },
  required: ['settings', 'reasoning']
};

export const getSmartVibe = async (base64Image: string): Promise<VibeResponse> => {
  if (!API_KEY) {
    throw new Error("No API Key configured");
  }

  const model = "gemini-2.5-flash"; // Using flash for speed/cost balance on vision tasks

  // Clean base64 string if it has prefix
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
            {
                inlineData: {
                    mimeType: "image/png",
                    data: cleanBase64
                }
            },
            {
                text: `Analyze this image and determine the best 1-bit dithering settings to maximize its artistic "vibe".
                
                Guidelines:
                - If the image is high detail/photographic, suggest Floyd-Steinberg or Atkinson with moderate contrast.
                - If it's geometric or retro, suggest Bayer.
                - If it needs grit, suggest Noise.
                - Contrast should be between -50 and 50 usually.
                - Threshold defaults to 128 but adjust if image is too bright/dark.
                - PixelSize: 1 is standard, higher (2-4) for a retro console look.
                `
            }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: vibeSchema,
        systemInstruction: "You are an expert digital artist specializing in 1-bit pixel art and dithering aesthetics."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as VibeResponse;

  } catch (error) {
    console.error("Gemini Vibe Error:", error);
    // Fallback if AI fails
    return {
      settings: {
        method: DitherMethod.FLOYD_STEINBERG,
        threshold: 128,
        contrast: 10,
        brightness: 0,
        pixelSize: 1
      },
      reasoning: "AI was unavailable, so we applied a classic default."
    };
  }
};