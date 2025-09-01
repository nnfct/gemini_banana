import React from 'react';
import { ShirtIcon } from '../../icons/ShirtIcon';

export const Header: React.FC = () => {
    return (
        <header className="text-center">
            <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                <ShirtIcon className="w-8 h-8 text-primary-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
                    AI Virtual Try-On
                </h1>
            </div>
            <p className="mt-3 max-w-2xl mx-auto text-md text-gray-600">
                See how clothes look on you before you buy. Upload a photo of yourself and an item of clothing to generate a photorealistic result.
            </p>
        </header>
    );
};