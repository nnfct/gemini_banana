import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../ui';
import type { RecommendationItem } from '../../../types';

function formatPriceKRW(n: number) {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

const useRandomProducts = (limit: number = 18) => {
    const [items, setItems] = useState<RecommendationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/recommend/random?limit=${limit}`);
            const data = await res.json();
            setItems(data);
        } catch (e: any) {
            setError(e?.message || 'failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchItems(); }, []);
    return { items, loading, error, refresh: fetchItems };
};

interface ProductCardProps { item: RecommendationItem }
const ProductCard: React.FC<ProductCardProps> = ({ item }) => (
    <Card padding="sm" className="hover:shadow-md transition-shadow duration-200" onClick={() => item.productUrl && window.open(item.productUrl, '_blank', 'noopener,noreferrer')}>
        <div className="relative aspect-[4/5] bg-gray-100 rounded-lg mb-2 overflow-hidden">
            {item.imageUrl && (
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
            )}
        </div>
        <p className="font-bold text-sm truncate">{item.tags?.[0] || '브랜드'}</p>
        <p className="text-xs text-gray-600 truncate h-8">{item.title}</p>
        <p className="text-sm font-bold">{formatPriceKRW(item.price)}</p>
    </Card>
);

export const ECommerceUI: React.FC = () => {
    const { items, loading, error, refresh } = useRandomProducts(18);
    const carousel = items.slice(0, 8);
    const gridItems = items.slice(8);
    return (
        <div className="bg-white font-sans">
            <header className="sticky top-0 bg-white z-10 shadow-sm">
                <div className="overflow-x-auto whitespace-nowrap">
                    <nav className="flex items-center space-x-4 p-3 text-sm font-medium">
                        {['콘텐츠','추천','랭킹','세일','브랜드','발매','뷰티','시간특가'].map((item, index) => (
                            <a href="#" key={item} className={`pb-1 ${index === 1 ? 'text-black border-b-2 border-black font-bold' : 'text-gray-500'}`}>{item}</a>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="p-4 space-y-6">
                <section>
                    <div className="overflow-x-auto whitespace-nowrap flex space-x-4">
                        {carousel.map(item => (
                            <div key={item.id} className="flex-shrink-0 w-40" onClick={() => item.productUrl && window.open(item.productUrl, '_blank', 'noopener,noreferrer')}>
                                <div className="relative aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />}
                                </div>
                                <p className="font-bold text-sm truncate">{item.tags?.[0] || '브랜드'}</p>
                                <p className="text-xs text-gray-600 truncate">{item.title}</p>
                                <p className="text-sm font-bold">{formatPriceKRW(item.price)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <Button className="w-full" size="lg" onClick={refresh}>
                    실데이터로 새로고침
                </Button>

                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">실제 인기 아이템</h2>
                        <Button onClick={refresh} size="sm">새로고침</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {gridItems.map(item => <ProductCard key={item.id} item={item} />)}
                    </div>
                </section>
            </main>
        </div>
    );
};

