import React, { useState, useCallback } from 'react';
import { ImageUploader } from './ImageUploader';
import { ResultDisplay } from './ResultDisplay';
import { CombineButton } from './CombineButton';
import { RecommendationDisplay } from '../recommendations/RecommendationDisplay';
import { Header } from '../layout/Header';
import { virtualTryOnService } from '../../../services/virtualTryOn.service';
import type { UploadedImage, ApiFile, ClothingItems, RecommendationOptions } from '../../../types';
import { Card, Input, Button } from '../../ui';

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

    // Simple filter options for recommendations
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [excludeTagsInput, setExcludeTagsInput] = useState<string>('');

    const convertToApiFile = (uploadedImage: UploadedImage): ApiFile => ({
        base64: uploadedImage.base64,
        mimeType: uploadedImage.mimeType,
    });

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
            const clothingItems: ClothingItems = {
                top: topImage ? convertToApiFile(topImage) : null,
                pants: pantsImage ? convertToApiFile(pantsImage) : null,
                shoes: shoesImage ? convertToApiFile(shoesImage) : null,
            };

            const result = await virtualTryOnService.combineImages({
                person: convertToApiFile(personImage),
                clothingItems,
            });

            if (result.generatedImage) {
                setGeneratedImage(result.generatedImage);

                // Get recommendations after virtual fitting
                setIsLoadingRecommendations(true);
                try {
                    const options: RecommendationOptions = {};
                    if (minPrice) options.minPrice = Number(minPrice);
                    if (maxPrice) options.maxPrice = Number(maxPrice);
                    const trimmed = excludeTagsInput.trim();
                    if (trimmed) options.excludeTags = trimmed.split(',').map(t => t.trim()).filter(Boolean);

                    const recommendationsResult = await virtualTryOnService.getRecommendationsFromFitting({
                        generatedImage: result.generatedImage,
                        clothingItems,
                        options,
                    });

                    setRecommendations(recommendationsResult.recommendations as any);
                } catch (recError) {
                    console.error('Failed to get recommendations:', recError);
                    // Show fitting result even if recommendations fail
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
                            {/* Recommendation Filters */}
                            <Card className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800">추천 필터</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <Input
                                        type="number"
                                        label="최소 가격"
                                        placeholder="예: 10000"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        min={0}
                                    />
                                    <Input
                                        type="number"
                                        label="최대 가격"
                                        placeholder="예: 100000"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        min={0}
                                    />
                                    <Input
                                        label="제외 태그(콤마구분)"
                                        placeholder="예: formal, leather"
                                        value={excludeTagsInput}
                                        onChange={(e) => setExcludeTagsInput(e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">필터는 가상 피팅 이후 추천 호출에 자동 적용됩니다.</p>
                            </Card>
                        </div>
                    </div>

                    {/* Recommendations Section */}
                    {(recommendations || isLoadingRecommendations) && (
                        <div className="mt-8">
                            {isLoadingRecommendations ? (
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className="ml-3 text-gray-600">Finding recommended products...</span>
                                    </div>
                                </div>
                            ) : recommendations ? (
                                <RecommendationDisplay
                                    recommendations={recommendations}
                                    onItemClick={(item) => {
                                        console.log('Clicked item:', item);
                                        // TODO: Add navigation to product detail page
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
