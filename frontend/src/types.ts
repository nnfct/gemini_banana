// Frontend type definitions

export interface UploadedImage {
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: string;
}

// API Types
export interface ApiFile {
    base64: string;
    mimeType: string;
}

export interface ClothingItems {
    top?: ApiFile | null;
    pants?: ApiFile | null;
    shoes?: ApiFile | null;
}

export interface VirtualTryOnRequest {
    person: ApiFile;
    clothingItems: ClothingItems;
}

export interface VirtualTryOnResponse {
    generatedImage: string;
    error?: string;
}

export interface RecommendationRequest {
    person?: ApiFile;
    clothingItems?: ClothingItems;
    generatedImage?: string;
}

export interface RecommendationItem {
    id: string;
    title: string;
    price: number;
    imageUrl?: string;
    score?: number;
    tags: string[];
    category: string;
}

export interface CategoryRecommendations {
    top: RecommendationItem[];
    pants: RecommendationItem[];
    shoes: RecommendationItem[];
    accessories: RecommendationItem[];
}

export interface RecommendationResponse {
    recommendations: RecommendationItem[] | CategoryRecommendations;
    error?: string;
}

// Frontend State Types
export interface VirtualTryOnState {
    personImage: UploadedImage | null;
    clothingItems: {
        top: UploadedImage | null;
        pants: UploadedImage | null;
        shoes: UploadedImage | null;
    };
    generatedImage: string | null;
    recommendations: CategoryRecommendations | null;
    isLoading: boolean;
    error: string | null;
}