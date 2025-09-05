import React from 'react';

interface Item { label: string; icon?: string }

const data: Item[] = [
  { label: '탑' }, { label: '팬츠' }, { label: '지금 인기' }, { label: '로퍼' }, { label: '아우터' }, { label: '슈즈' }, { label: '가방' }, { label: '액세서리' },
];

export const CategoryRow: React.FC = () => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-6 py-4">
        {data.map((it) => (
          <div key={it.label} className="flex-shrink-0 w-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
              {it.label}
            </div>
            <p className="mt-2 text-xs text-center text-gray-600 truncate" title={it.label}>{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryRow;

