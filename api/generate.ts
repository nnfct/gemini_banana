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
          data: person.base64,
          mimeType: person.mimeType,
        },
      },
    ];

    const clothingPieces: string[] = [];

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
    
    const response: GenerateContentResponse = await ai.models.generateContent({
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
