// src/components/layout/MainLayout.tsx
import React from 'react';
import { Sidebar } from './Sidebar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};