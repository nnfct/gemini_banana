import type { UploadedImage } from '../types';

interface ClothingItems {
  top?: UploadedImage | null;
  pants?: UploadedImage | null;
  shoes?: UploadedImage | null;
}

/**
 * Sends image data to the backend API to generate a virtual try-on image.
 * @param person - The uploaded image of the person.
 * @param clothingItems - An object containing uploaded images for top, pants, and shoes.
 * @returns A base64 encoded string of the generated image.
 */
export const combineImages = async (person: UploadedImage, clothingItems: ClothingItems): Promise<string | null> => {
  // We're creating a payload that matches what the server-side function expects.
  // The server-side logic is now expected to be in an API endpoint (e.g., '/api/generate').
  // A template for this backend logic can be found in `api/generate.ts`.
  const payload = {
    person: {
        base64: person.base64,
        mimeType: person.mimeType,
    },
    clothingItems: {
        top: clothingItems.top ? { base64: clothingItems.top.base64, mimeType: clothingItems.top.mimeType } : null,
        pants: clothingItems.pants ? { base64: clothingItems.pants.base64, mimeType: clothingItems.pants.mimeType } : null,
        shoes: clothingItems.shoes ? { base64: clothingItems.shoes.base64, mimeType: clothingItems.shoes.mimeType } : null,
    }
  };

  try {
    // This fetch call points to a relative path. In a real application, you would
    // deploy the server-side logic and replace '/api/generate' with your actual API endpoint URL.
    // NOTE: For this example to work in a local dev environment, you would need to set up a proxy
    // to forward this request to your backend server.
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown server error occurred.' }));
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
        throw new Error(result.error);
    }
    
    return result.generatedImage || null;

  } catch (error) {
    console.error("Error calling backend API:", error);
    throw new Error(`Failed to generate image. ${error instanceof Error ? error.message : 'Please check the console for details.'}`);
  }
};
