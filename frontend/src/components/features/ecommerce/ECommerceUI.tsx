import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../ui';
import type { RecommendationItem } from '../../../types';
import { apiClient } from '../../../services/api.service';

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
      const data = await apiClient.get<RecommendationItem[]>(`/api/recommend/random?limit=${limit}`);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);
  return { items, loading, error, refresh: fetchItems };
};

interface ProductCardProps { item: RecommendationItem }
const ProductCard: React.FC<ProductCardProps> = ({ item }) => {
  const body = (
    <Card
      padding="sm"
      className="group relative cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] ring-1 ring-transparent hover:ring-blue-200 rounded-xl"
    >
      <div className="relative aspect-[4/5] bg-gray-100 rounded-lg mb-2 overflow-hidden">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-0 ring-blue-200/50 opacity-0 group-hover:opacity-100 group-hover:ring-4 transition-opacity" />
      </div>
      <p className="font-bold text-sm truncate">{item.tags?.[0] || '브랜드'}</p>
      <p className="text-xs text-gray-600 truncate h-8">{item.title}</p>
      <p className="text-sm font-bold">{formatPriceKRW(item.price)}</p>
    </Card>
  );
  return item.productUrl ? (
    <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="block">{body}</a>
  ) : (
    <div className="block">{body}</div>
  );
};

export const ECommerceUI: React.FC = () => {
  const { items, loading, error, refresh } = useRandomProducts(18);
  const carousel = items.slice(0, 8);
  const gridItems = items.slice(8);

  return (
    <div className="bg-white font-sans">
      <header className="sticky top-0 bg-white z-10 shadow-sm">
        <div className="overflow-x-auto whitespace-nowrap">
          <nav className="flex items-center space-x-4 p-3 text-sm font-medium">
            {['콘텐츠','추천','랭킹','세일','브랜드','발매','뷰티','시간특가'].map((label, idx) => (
              <a key={label} href="#" className={`pb-1 ${idx === 1 ? 'text-black border-b-2 border-black font-bold' : 'text-gray-500'}`}>{label}</a>
            ))}
          </nav>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section>
          <div className="overflow-x-auto whitespace-nowrap flex space-x-4">
            {carousel.map(item => {
              const card = (
                <div className="flex-shrink-0 w-40 group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:scale-105">
                  <div className="relative aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden ring-1 ring-transparent group-hover:ring-blue-200">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />}
                    <div className="pointer-events-none absolute inset-0 rounded-lg ring-0 ring-blue-200/50 opacity-0 group-hover:opacity-100 group-hover:ring-4 transition-opacity" />
                  </div>
                  <p className="font-bold text-sm truncate">{item.tags?.[0] || '브랜드'}</p>
                  <p className="text-xs text-gray-600 truncate">{item.title}</p>
                  <p className="text-sm font-bold">{formatPriceKRW(item.price)}</p>
                </div>
              );
              return item.productUrl ? (
                <a key={item.id} href={item.productUrl} target="_blank" rel="noopener noreferrer" className="block">{card}</a>
              ) : (
                <div key={item.id} className="block">{card}</div>
              );
            })}
          </div>
        </section>

        <Button className="w-full" size="lg" onClick={refresh}>데이터 새로고침</Button>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">오늘 인기 아이템</h2>
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

