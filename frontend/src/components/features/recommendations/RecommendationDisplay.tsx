import React, { useState } from 'react';
import { Card } from '../../ui';
import type { RecommendationItem, CategoryRecommendations } from '../../../types';

interface RecommendationDisplayProps {
    recommendations: CategoryRecommendations;
    onItemClick?: (item: RecommendationItem) => void;
}

export const RecommendationDisplay: React.FC<RecommendationDisplayProps> = ({
    recommendations,
    onItemClick,
}) => {
    // Lightweight inline placeholder (SVG) shown when product image fails to load
    const fallbackImage =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
                <rect width="100%" height="100%" fill="#f3f4f6"/>
                <g fill="#9ca3af" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">
                    <text x="50%" y="50%" font-size="20" dy=".3em">이미지를 불러올 수 없습니다</text>
                </g>
            </svg>`
        );

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
    };

    // pagination state and helper for refresh
    const [page, setPage] = useState(0);
    const visiblePerCategory = 3;

    const getPagedItems = (items: RecommendationItem[]) => {
        if (!items || items.length <= visiblePerCategory) return items || [];
        const start = (page * visiblePerCategory) % items.length;
        const end = start + visiblePerCategory;
        return end <= items.length ? items.slice(start, end) : [...items.slice(start), ...items.slice(0, end - items.length)];
    };

    const renderCategory = (categoryName: string, items: RecommendationItem[]) => {
        if (items.length === 0) return null;

        const categoryNames: Record<string, string> = {
            top: '상의',
            pants: '하의',
            shoes: '신발',
            accessories: '액세서리',
        };

        return (
            <div className="mb-8" key={categoryName}>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {categoryNames[categoryName] || categoryName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {getPagedItems(items).map((item) => {
                        const body = (
                            <Card
                                key={item.id}
                                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                            >
                                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const img = e.currentTarget as HTMLImageElement;
                                                if (img.src !== fallbackImage) {
                                                    img.src = fallbackImage;
                                                }
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
                                    {item.score !== undefined && (
                                        <p className="text-xs text-gray-500">유사도 {item.score}</p>
                                    )}
                                </div>
                            </Card>
                        );

                        // If productUrl exists, render as an anchor to ensure navigation always works
                        const url = (item as any).productUrl as string | undefined;
                        return url ? (
                            <a
                                key={item.id}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                {body}
                            </a>
                        ) : (
                            <div
                                key={item.id}
                                onClick={() => onItemClick?.(item)}
                                className="block"
                            >
                                {body}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const hasAnyRecommendations = Object.values(recommendations).some(
        (items: RecommendationItem[]) => items.length > 0
    );

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
            <h2 className="text-2xl font-bold text-gray-800 mb-6">유사 상품 추천</h2>
            <div>
                {renderCategory('top', recommendations.top)}
                {renderCategory('pants', recommendations.pants)}
                {renderCategory('shoes', recommendations.shoes)}
                {renderCategory('accessories', recommendations.accessories)}
            </div>
        </Card>
    );
};

export default RecommendationDisplay;
