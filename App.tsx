
import React, { useState } from 'react';
import { ECommerceUI } from './components/ECommerceUI';
import { VirtualTryOnUI } from './components/VirtualTryOnUI';
import { BottomNav } from './components/BottomNav';

const App: React.FC = () => {
  const [page, setPage] = useState('home');

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="max-w-3xl mx-auto">
        {page === 'home' && <ECommerceUI />}
        {page === 'try-on' && <VirtualTryOnUI />}
      </div>
      <BottomNav activePage={page} setPage={setPage} />
    </div>
  );
};

export default App;
