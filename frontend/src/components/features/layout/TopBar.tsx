import React from 'react';

interface TopBarProps { onNavigate?: (page: 'home' | 'try-on' | 'likes') => void }

export const TopBar: React.FC<TopBarProps> = ({ onNavigate }) => {
  const items: Array<{ id: string; label: string; go?: 'home' | 'try-on' | 'likes' }>= [
    { id: 'home', label: 'HOME', go: 'home' },
    { id: 'style', label: 'STYLE' },
    { id: 'shop', label: 'SHOP' },
  ];
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-3xl mx-auto flex items-center justify-between h-12 px-4">
        <button className="text-xl font-extrabold tracking-tight" onClick={() => onNavigate?.('home')}>
          MUSINSA
        </button>
        <nav className="flex items-center gap-6 text-sm font-semibold">
          {items.map(it => (
            <button key={it.id} onClick={() => it.go && onNavigate?.(it.go)} className="text-gray-800 hover:text-black">
              {it.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default TopBar;

