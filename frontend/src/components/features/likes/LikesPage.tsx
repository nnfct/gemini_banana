import React, { useEffect, useState } from 'react';
import { Card, Button } from '../../ui';
import { HeartIcon } from '../../icons/HeartIcon';
import type { RecommendationItem } from '../../../types';
import { likesService } from '../../../services/likes.service';

function formatPriceKRW(n: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);
}

export const LikesPage: React.FC = () => {
  const [items, setItems] = useState<RecommendationItem[]>(() => likesService.getAll());

  useEffect(() => {
    const unsub = likesService.subscribe(setItems);
    // sync across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'app:likes:v1') setItems(likesService.getAll());
    };
    window.addEventListener('storage', onStorage);
    return () => { unsub(); window.removeEventListener('storage', onStorage); };
  }, []);

  if (items.length === 0) {
    return (
      <div className="p-6">
        <Card className="text-center py-12">
          <HeartIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">좋아요한 상품이 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold">좋아요</h2>
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <Card
            key={item.id}
            padding="sm"
            className="group relative transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] ring-1 ring-transparent hover:ring-blue-200 rounded-xl"
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
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => item.productUrl && window.open(item.productUrl, '_blank', 'noopener,noreferrer')} disabled={!item.productUrl}>구매</Button>
              <Button size="sm" variant="outline" onClick={() => likesService.remove(item.id)}>
                제거
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LikesPage;
