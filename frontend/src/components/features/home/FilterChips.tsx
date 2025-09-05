import React, { useState } from 'react';

const chips = ['산뜻하기','얼리 아답터','니트','캠핑','팬츠','노멀룩','로퍼','슈프림','가먼트','하이엔드'];

export const FilterChips: React.FC = () => {
  const [active, setActive] = useState(0);
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <button key={c} onClick={() => setActive(i)} className={`text-xs rounded-full px-3 py-1 border ${active===i ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
          {c}
        </button>
      ))}
    </div>
  );
};

export default FilterChips;

