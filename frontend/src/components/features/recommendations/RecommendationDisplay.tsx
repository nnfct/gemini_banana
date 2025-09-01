import React from 'react';
import { Card } from '../../ui';
import type { RecommendationItem, CategoryRecommendations } from '../../../types';

interface RecommendationDisplayProps {
    recommendations: CategoryRecommendations;
    onItemClick?: (item: RecommendationItem) => void;
}

export const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({
    recommendations,
    onItemClick
}) => {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ko-KR').format(price) + '원';
    };

    const renderCategory = (categoryName: string, items: RecommendationItem[]) => {
        if (items.length === 0) return null;

        const categoryNames = {
            top: '상의',
            pants: '하의',
            shoes: '신발',
            accessories: '액세서리'
        };

        return (
            <div className="mb-8" key={categoryName}>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {categoryNames[categoryName as keyof typeof categoryNames] || categoryName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((item) => (
                        <Card
                            key={item.id}
                            className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                            onClick={() => onItemClick?.(item)}
                        >
                            <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-sm text-gray-900 line-clamp-2">{item.title}</p>
                                <p className="font-semibold text-primary-600">{formatPrice(item.price)}</p>
                                {item.score && (
                                    <p className="text-xs text-gray-500">유사도: {item.score}</p>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    const hasAnyRecommendations = Object.values(recommendations).some((items: RecommendationItem[]) => items.length > 0);

    if (!hasAnyRecommendations) {
        return (
            <Card className="text-center py-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">추천 상품</h2>
                <p className="text-gray-600">추천할 상품이 없습니다.</p>
            </Card>
        );
    }

    return (
        <Card>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">유사한 상품 추천</h2>
            <div>
                {renderCategory('top', recommendations.top)}
                {renderCategory('pants', recommendations.pants)}
                {renderCategory('shoes', recommendations.shoes)}
                {renderCategory('accessories', recommendations.accessories)}
            </div>
        </Card>
    );
};