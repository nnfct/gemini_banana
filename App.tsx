
import React from 'react';

// This is the legacy App.tsx file for the old monolithic structure.
// The new frontend structure is located in ./frontend/src/App.tsx
// 
// To run the new separated frontend and backend:
// npm run dev (runs both backend and frontend)
// or
// npm run dev:frontend (runs only frontend)
// npm run dev:backend (runs only backend)

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Legacy App Structure
        </h1>
        <p className="text-gray-600 mb-4">
          This app has been migrated to a separated backend/frontend structure.
        </p>
        <p className="text-gray-600 mb-4">
          Please use the new frontend application located in <code className="bg-gray-200 px-2 py-1 rounded">./frontend/</code>
        </p>
        <p className="text-sm text-gray-500">
          Run <code className="bg-gray-200 px-2 py-1 rounded">npm run dev</code> to start both backend and frontend servers.
        </p>
      </div>
    </div>
  );
};

export default App;
