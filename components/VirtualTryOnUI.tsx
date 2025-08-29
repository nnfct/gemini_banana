
import React, { useState, useCallback } from 'react';
import { ImageUploader } from './ImageUploader';
import { ResultDisplay } from './ResultDisplay';
import { Header } from './Header';
import { CombineButton } from './CombineButton';
import { combineImages } from '../services/geminiService';
import type { UploadedImage } from '../types';

export const VirtualTryOnUI: React.FC = () => {
  const [personImage, setPersonImage] = useState<UploadedImage | null>(null);
  const [topImage, setTopImage] = useState<UploadedImage | null>(null);
  const [pantsImage, setPantsImage] = useState<UploadedImage | null>(null);
  const [shoesImage, setShoesImage] = useState<UploadedImage | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCombineClick = useCallback(async () => {
    if (!personImage || (!topImage && !pantsImage && !shoesImage)) {
      setError('Please upload a person\'s image and at least one clothing item.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await combineImages(personImage, {
        top: topImage,
        pants: pantsImage,
        shoes: shoesImage,
      });
      if (result) {
        setGeneratedImage(result);
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
        </main>
      </div>
    </div>
  );
};
