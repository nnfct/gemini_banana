import React, { useState } from 'react';
import { Spinner } from '../../ui';
import { ImageIcon } from '../../icons/ImageIcon';
import { AlertTriangleIcon } from '../../icons/AlertTriangleIcon';
import { ZoomInIcon } from '../../icons/ZoomInIcon';
import { FullScreenImage } from '../common/FullScreenImage';

interface ResultDisplayProps {
    generatedImage: string | null;
    isLoading: boolean;
    error: string | null;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
    generatedImage,
    isLoading,
    error
}) => {
    const [isFullScreen, setIsFullScreen] = useState(false);

    return (
        <>
            <div className="w-full aspect-[4/3] bg-white border border-gray-200 rounded-2xl flex justify-center items-center p-4 shadow-sm relative overflow-hidden">
                {isLoading && (
                    <div className="flex flex-col items-center gap-4 text-gray-600">
                        <Spinner size="lg" />
                        <span className="font-medium">Generating your image...</span>
                        <span className="text-sm text-gray-400 text-center">This may take a moment.</span>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="flex flex-col items-center gap-2 text-red-600 text-center">
                        <AlertTriangleIcon className="w-10 h-10" />
                        <h4 className="font-semibold">Generation Failed</h4>
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                {!isLoading && !error && generatedImage && (
                    <div className="relative w-full h-full group">
                        <img src={generatedImage} alt="Generated result" className="w-full h-full object-contain rounded-lg" />
                        <button
                            onClick={() => setIsFullScreen(true)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg cursor-pointer"
                            aria-label="View full screen"
                        >
                            <ZoomInIcon className="w-12 h-12 text-white" />
                        </button>
                    </div>
                )}

                {!isLoading && !error && !generatedImage && (
                    <div className="flex flex-col items-center gap-2 text-gray-400 text-center">
                        <ImageIcon className="w-10 h-10" />
                        <h4 className="font-semibold text-gray-600">Your Result</h4>
                        <p className="text-sm">The generated image will appear here.</p>
                    </div>
                )}
            </div>
            {isFullScreen && generatedImage && (
                <FullScreenImage src={generatedImage} onClose={() => setIsFullScreen(false)} />
            )}
        </>
    );
};