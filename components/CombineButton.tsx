
import React from 'react';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { Spinner } from './Spinner';

interface CombineButtonProps {
    onClick: () => void;
    disabled: boolean;
    isLoading: boolean;
}

export const CombineButton: React.FC<CombineButtonProps> = ({ onClick, disabled, isLoading }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-2 h-14 px-6 bg-indigo-600 text-white font-semibold rounded-xl shadow-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
        >
            {isLoading ? (
                <>
                    <Spinner className="w-5 h-5" />
                    <span>Generating...</span>
                </>
            ) : (
                <>
                    <span>Try It On</span>
                    <ArrowRightIcon className="w-5 h-5" />
                </>
            )}
        </button>
    );
};
