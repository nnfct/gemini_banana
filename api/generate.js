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

    const toBytes = (b64) => {
      try { return Buffer.from(b64, 'base64'); } catch { return Buffer.alloc(0); }
    };

    const parts = [
      {
        inlineData: {
          data: toBytes(person.base64),
          mimeType: person.mimeType,
        },
      },
    ];

    const clothingPieces = [];

    if (clothingItems.top) {
      parts.push({ inlineData: { data: toBytes(clothingItems.top.base64), mimeType: clothingItems.top.mimeType } });
      clothingPieces.push('the top');
    }
    if (clothingItems.pants) {
      parts.push({ inlineData: { data: toBytes(clothingItems.pants.base64), mimeType: clothingItems.pants.mimeType } });
      clothingPieces.push('the pants');
    }
    if (clothingItems.shoes) {
      parts.push({ inlineData: { data: toBytes(clothingItems.shoes.base64), mimeType: clothingItems.shoes.mimeType } });
      clothingPieces.push('the shoes');
    }

    const promptText = `Use the FIRST image as the base. Remove backgrounds from the clothing product photos and extract only the garments. REPLACE the existing garments with the provided items: top -> torso/arms, pants -> legs to ankles, shoes -> feet. Output a single photorealistic image of the SAME person wearing: ${clothingPieces.join(', ')}. Fit garments to the person's pose with correct scale/rotation/warping; match perspective and seam alignment. Handle occlusion correctly (e.g., crossed arms remain in front of the top where appropriate). Keep lighting/shadows consistent. Preserve the face and body shape exactly. No text, logos, or watermarks.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: [{ role: 'user', parts }],
      systemInstruction: {
        role: 'system',
        parts: [{ text: [
          'IMPORTANT SAFETY AND CONSISTENCY DIRECTIVES:',
          '- Use the FIRST image as the immutable base/background.',
          "- Do NOT re-synthesize, redraw, or retouch the person.",
          "- Do NOT alter the person's face, hair, facial expression, skin texture, body shape, or pose.",
          '- Preserve the exact facial identity (no beautification, smoothing, makeup or landmark changes).',
          '- Keep background, perspective, and lighting IDENTICAL to the original person image.',
          '- Only composite the clothing from subsequent images onto the person realistically.',
          '- Do NOT add or remove accessories or objects. No text, logos, or watermarks.',
          "- Treat the face region as pixel-locked: identity-specific details MUST remain unchanged.",
          "- If any instruction conflicts, ALWAYS preserve the person\'s identity over clothing fit.",
        ].join('\n') }]
      },
      config: { responseModalities: [Modality.IMAGE] },
      generationConfig: { temperature: 0.0 },
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
