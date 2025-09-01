import { useState } from 'react';
import { VirtualTryOnUI, ECommerceUI, BottomNav } from './components/features';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

function App() {
    const [currentPage, setCurrentPage] = useState<string>('try-on');

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'try-on':
                return <VirtualTryOnUI />;
            case 'home':
                return <ECommerceUI />;
            default:
                return <VirtualTryOnUI />;
        }
    };

    return (
        <ErrorBoundary>
            <ToastProvider>
                <div className="min-h-screen bg-gray-50 pb-16">
                    {renderCurrentPage()}
                    <BottomNav activePage={currentPage} setPage={setCurrentPage} />
                </div>
            </ToastProvider>
        </ErrorBoundary>
    );
}

export default App;