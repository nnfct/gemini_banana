import React from 'react';
import { ShirtIcon } from '../../icons/ShirtIcon';

export const Header: React.FC = () => {
    return (
        <header className="text-center">
            <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                <ShirtIcon className="w-8 h-8 text-primary-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
                    사이버피팅
                </h1>
            </div>
            <p className="mt-3 max-w-2xl mx-auto text-md text-gray-600">
                구매하기 전에 옷이 어떻게 보일지 확인하세요. 자신의 사진과 의류 아이템을 업로드하여 현실같은 결과를 생성합니다.
            </p>
        </header>
    );
};