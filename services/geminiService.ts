import type { UploadedImage } from '../types';

interface ClothingItems {
  top?: UploadedImage | null;
  pants?: UploadedImage | null;
  shoes?: UploadedImage | null;
}

interface RecommendationItem {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  score?: number;
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
    // Debug logging
    console.log('🚀 Sending request to /api/generate');
    console.log('📦 Payload structure:', {
      person: payload.person ? 'present' : 'missing',
      clothingItems: {
        top: payload.clothingItems.top ? 'present' : 'missing',
        pants: payload.clothingItems.pants ? 'present' : 'missing',
        shoes: payload.clothingItems.shoes ? 'present' : 'missing',
      }
    });

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

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

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

/**
 * Sends image data to the backend API to get similar product recommendations.
 * @param person - The uploaded image of the person.
 * @param clothingItems - An object containing uploaded images for top, pants, and shoes.
 * @returns A list of recommended products.
 */
export const getRecommendations = async (person?: UploadedImage, clothingItems?: ClothingItems): Promise<RecommendationItem[]> => {
  const payload = {
    person: person ? {
      base64: person.base64,
      mimeType: person.mimeType,
    } : null,
    clothingItems: {
      top: clothingItems?.top ? { base64: clothingItems.top.base64, mimeType: clothingItems.top.mimeType } : null,
      pants: clothingItems?.pants ? { base64: clothingItems.pants.base64, mimeType: clothingItems.pants.mimeType } : null,
      shoes: clothingItems?.shoes ? { base64: clothingItems.shoes.base64, mimeType: clothingItems.shoes.mimeType } : null,
    }
  };

  try {
    const response = await fetch('/api/recommend', {
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

    return result.recommendations || [];

  } catch (error) {
    console.error("Error calling recommendation API:", error);
    throw new Error(`Failed to get recommendations. ${error instanceof Error ? error.message : 'Please check the console for details.'}`);
  }
};

/**
 * 가상 피팅 완료 후 생성된 이미지를 기반으로 유사한 상품을 추천받습니다.
 * @param generatedImage - 가상 피팅으로 생성된 이미지 (base64 data URI)
 * @param originalClothingItems - 원본 의류 아이템들 (참고용)
 * @returns 카테고리별 추천 상품 목록
 */
export const getRecommendationsFromFitting = async (
  generatedImage: string,
  originalClothingItems?: ClothingItems
): Promise<{
  recommendations: {
    top: RecommendationItem[];
    pants: RecommendationItem[];
    shoes: RecommendationItem[];
    accessories: RecommendationItem[];
  }
}> => {
  const payload = {
    generatedImage,
    mimeType: 'image/jpeg',
    originalClothingItems: originalClothingItems || {}
  };

  try {
    const response = await fetch('/api/recommend-from-fitting', {
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

    return result;

  } catch (error) {
    console.error("Error calling fitting recommendation API:", error);
    throw new Error(`Failed to get fitting recommendations. ${error instanceof Error ? error.message : 'Please check the console for details.'}`);
  }
};

/**
 * 업로드된 이미지를 기반으로 시각적 유사성 추천을 받습니다.
 * @param image - 업로드된 이미지 (base64 data URI)
 * @param options - 추천 옵션
 * @returns 카테고리별 추천 상품 목록
 */
export const getVisualRecommendations = async (
  image: string,
  options: {
    provider?: 'azure' | 'local' | 'auto';
    categories?: string[];
    maxResults?: number;
    minSimilarity?: number;
    priceRange?: [number, number];
    brands?: string[];
  } = {}
): Promise<{
  success: boolean;
  processingTime: number;
  provider: string;
  recommendations: {
    top: RecommendationItem[];
    pants: RecommendationItem[];
    shoes: RecommendationItem[];
    accessories: RecommendationItem[];
  };
  metadata?: any;
}> => {
  const payload = {
    image,
    options
  };

  try {
    const response = await fetch('/api/recommend-visual', {
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

    if (!result.success) {
      throw new Error(result.error?.message || 'Visual recommendation failed');
    }

    return result;

  } catch (error) {
    console.error("Error calling visual recommendation API:", error);
    throw new Error(`Failed to get visual recommendations. ${error instanceof Error ? error.message : 'Please check the console for details.'}`);
  }
};
