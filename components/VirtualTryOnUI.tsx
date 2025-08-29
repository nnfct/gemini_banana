
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './ImageUploader';
import { ResultDisplay } from './ResultDisplay';
import { Header } from './Header';
import { CombineButton } from './CombineButton';
import RecommendationDisplay from './RecommendationDisplay';
import { combineImages, getRecommendationsFromFitting } from '../services/geminiService';
import type { UploadedImage } from '../types';

export const VirtualTryOnUI: React.FC = () => {
  const [personImage, setPersonImage] = useState<UploadedImage | null>(null);
  const [topImage, setTopImage] = useState<UploadedImage | null>(null);
  const [pantsImage, setPantsImage] = useState<UploadedImage | null>(null);
  const [shoesImage, setShoesImage] = useState<UploadedImage | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCombineClick = useCallback(async () => {
    if (!personImage || (!topImage && !pantsImage && !shoesImage)) {
      setError('Please upload a person\'s image and at least one clothing item.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    setRecommendations(null);

    try {
      const result = await combineImages(personImage, {
        top: topImage,
        pants: pantsImage,
        shoes: shoesImage,
      });
      
      if (result) {
        setGeneratedImage(result);
        
        // 가상 피팅 완료 후 추천 상품 가져오기
        setIsLoadingRecommendations(true);
        try {
          const recommendationsResult = await getRecommendationsFromFitting(result, {
            top: topImage,
            pants: pantsImage,
            shoes: shoesImage,
          });
          setRecommendations(recommendationsResult.recommendations);
        } catch (recError) {
          console.error('Failed to get recommendations:', recError);
          // 추천 실패해도 피팅 결과는 표시
        } finally {
          setIsLoadingRecommendations(false);
        }
      } else {
        setError('The AI could not generate an image. Please try again with different images.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [personImage, topImage, pantsImage, shoesImage]);
  
  const canCombine = personImage && (topImage || pantsImage || shoesImage);

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 lg:p-8 bg-gray-50">
      <div className="w-full">
        <Header />
        <main className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Input Section */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <ImageUploader
                        id="person-image"
                        title="Person"
                        description="Upload a full-body photo."
                        onImageUpload={setPersonImage}
                    />
                    <ImageUploader
                        id="top-image"
                        title="Top"
                        description="Upload a photo of a top."
                        onImageUpload={setTopImage}
                    />
                    <ImageUploader
                        id="pants-image"
                        title="Pants"
                        description="Upload a photo of pants."
                        onImageUpload={setPantsImage}
                    />
                    <ImageUploader
                        id="shoes-image"
                        title="Shoes"
                        description="Upload a photo of shoes."
                        onImageUpload={setShoesImage}
                    />
                </div>
            </div>

            {/* Action and Result Section */}
            <div className="flex flex-col gap-6">
               <CombineButton
                onClick={handleCombineClick}
                disabled={!canCombine || isLoading}
                isLoading={isLoading}
              />
              <ResultDisplay
                generatedImage={generatedImage}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>
          
          {/* Recommendations Section */}
          {(recommendations || isLoadingRecommendations) && (
            <div className="mt-8">
              {isLoadingRecommendations ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">추천 상품을 찾고 있습니다...</span>
                  </div>
                </div>
              ) : recommendations ? (
                <RecommendationDisplay 
                  recommendations={recommendations}
                  onItemClick={(item) => {
                    console.log('Clicked item:', item);
                    // 여기에 상품 상세 페이지로 이동하는 로직 추가 가능
                  }}
                />
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
