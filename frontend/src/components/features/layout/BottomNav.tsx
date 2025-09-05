import React from 'react';
import { CategoryIcon } from '../../icons/CategoryIcon';
import { ShirtIcon } from '../../icons/ShirtIcon';
import { HomeIcon } from '../../icons/HomeIcon';
import { HeartIcon } from '../../icons/HeartIcon';
import { UserIcon } from '../../icons/UserIcon';

interface BottomNavProps {
    activePage: string;
    setPage: (page: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, setPage }) => {
    const navItems: Array<{ id: string; label: string; icon: React.FC<any>; page: string | null; }>= [
        { id: 'category', label: '카테고리', icon: CategoryIcon, page: null },
        { id: 'try-on', label: '사이버피팅', icon: ShirtIcon, page: 'try-on' },
        { id: 'home', label: '무신사 홈', icon: HomeIcon, page: 'home' },
        { id: 'likes', label: '좋아요', icon: HeartIcon, page: 'likes' },
        { id: 'my', label: '마이', icon: UserIcon, page: null },
    ];

    return (
        <footer className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 z-50">
            <nav className="flex justify-around items-center h-16 max-w-3xl mx-auto">
                {navItems.map(item => {
                    const isActive = item.page === activePage;
                    return (
                        <button
                            key={item.id}
                            onClick={() => item.page && setPage(item.page)}
                            disabled={!item.page}
                            aria-label={item.label}
                            className={`flex flex-col items-center justify-center gap-1 text-xs w-1/5 pt-2 pb-1 transition-colors duration-200 focus:outline-none ${isActive ? 'text-black font-bold' : 'text-gray-500 font-medium'} ${!item.page ? 'cursor-not-allowed opacity-60' : 'hover:text-black'}`}
                        >
                            <item.icon className="w-6 h-6 mb-0.5" aria-hidden="true" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
        </footer>
    );
};

