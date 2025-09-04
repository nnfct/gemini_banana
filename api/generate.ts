// NOTE: This file contains the server-side logic for interacting with the Gemini API.
// It should be deployed as part of your backend (e.g., as a Cloud Function, or an API route in a framework like Next.js or Express).
// Your frontend will make a network request to the endpoint that executes this code.

import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// This interface defines the data structure this backend function expects.
// The frontend will need to send file data in this format (base64 string and mimeType).
interface ApiFile {
  base64: string;
  mimeType: string;
}

interface ClothingItems {
  top?: ApiFile | null;
  pants?: ApiFile | null;
  shoes?: ApiFile | null;
}

if (!process.env.API_KEY) {
  // This check runs on your server, not in the browser.
  throw new Error("API_KEY environment variable is not set on the server.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const toBytes = (b64: string): Uint8Array => {
  try { return Buffer.from(b64, 'base64'); } catch { return Buffer.alloc(0); }
};

/**
 * The core server-side logic for combining images using the Gemini API.
 * This function should be called by your API endpoint handler.
 * @param person - The image data of the person.
 * @param clothingItems - An object containing image data for top, pants, and shoes.
 * @returns A base64-encoded data URI of the generated image, or null.
 */
export const generateVirtualTryOnImage = async (person: ApiFile, clothingItems: ClothingItems): Promise<string | null> => {
  try {
    const parts: any[] = [
      {
        inlineData: {
          data: toBytes(person.base64),
          mimeType: person.mimeType,
        },
      },
    ];

    const clothingPieces: string[] = [];

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
    
    const response: GenerateContentResponse = await ai.models.generateContent({
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

/*
 * EXAMPLE API ROUTE (e.g., in Next.js or a similar framework)
 *
 * import { generateVirtualTryOnImage } from './path/to/this/file';
 *
 * export async function POST(request: Request) {
 *   try {
 *     const { person, clothingItems } = await request.json();
 *
 *     if (!person) {
 *       return new Response(JSON.stringify({ message: "Person image is required." }), { status: 400 });
 *     }
 *
 *     const generatedImage = await generateVirtualTryOnImage(person, clothingItems);
 *
 *     if (generatedImage) {
 *       return new Response(JSON.stringify({ generatedImage }), { status: 200 });
 *     } else {
 *       return new Response(JSON.stringify({ message: "Could not generate image." }), { status: 500 });
 *     }
 *   } catch (error) {
 *     console.error(error);
 *     return new Response(JSON.stringify({ message: error.message }), { status: 500 });
 *   }
 * }
 */
