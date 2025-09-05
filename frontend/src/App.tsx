import { useState } from 'react';
import { VirtualTryOnUI, ECommerceUI, BottomNav, LikesPage } from './components/features';
import { TopBar } from './components/features/layout/TopBar';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

function App() {
    // Default to Musinsa Home on initial load
    const [currentPage, setCurrentPage] = useState<string>('home');

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'try-on':
                return <VirtualTryOnUI />;
            case 'home':
                return <ECommerceUI onNavigate={(p) => setCurrentPage(p)} />;
            case 'likes':
                return <LikesPage />;
            default:
                return <VirtualTryOnUI />;
        }
    };

    return (
        <ErrorBoundary>
            <ToastProvider>
                <div className="min-h-screen bg-gray-50 pb-16">
                    <TopBar onNavigate={(p) => setCurrentPage(p)} />
                    {renderCurrentPage()}
                    <BottomNav activePage={currentPage} setPage={setCurrentPage} />
                </div>
            </ToastProvider>
        </ErrorBoundary>
    );
}

export default App;
