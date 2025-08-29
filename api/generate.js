// JS equivalent of api/generate.ts so Node can import it at runtime.
import { GoogleGenAI, Modality } from "@google/genai";

// Do not throw at import time. Construct the client lazily inside the function
// when an API key is actually present. This lets the server import the module
// and return mock responses when no API key is configured for local dev.

export const generateVirtualTryOnImage = async (person, clothingItems = {}) => {
  try {
    if (!process.env.API_KEY) {
      throw new Error('API_KEY is not set');
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const parts = [
      {
        inlineData: {
          data: person.base64,
          mimeType: person.mimeType,
        },
      },
    ];

    const clothingPieces = [];

    if (clothingItems.top) {
      parts.push({ inlineData: { data: clothingItems.top.base64, mimeType: clothingItems.top.mimeType } });
      clothingPieces.push('the top');
    }
    if (clothingItems.pants) {
      parts.push({ inlineData: { data: clothingItems.pants.base64, mimeType: clothingItems.pants.mimeType } });
      clothingPieces.push('the pants');
    }
    if (clothingItems.shoes) {
      parts.push({ inlineData: { data: clothingItems.shoes.base64, mimeType: clothingItems.shoes.mimeType } });
      clothingPieces.push('the shoes');
    }

    const promptText = `Analyze the first image, which contains a person (assume it's a full-body shot). Your primary task is to realistically place the clothing items from the subsequent images onto this person. It is of the utmost importance to preserve the original person's identity with no alterations. This means the facial features, face shape, hair, body shape, and pose must remain identical to the original photo. Do not change the person in any way. The final output must be a photorealistic image of the exact same person wearing: ${clothingPieces.join(', ')}. Ensure the clothing fits naturally, and the lighting and shadows are consistent with the original photo. Do not include any text or annotations in the final image.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate image due to a server-side API error.");
  }
};
