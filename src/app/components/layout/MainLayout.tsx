// src/components/layout/MainLayout.tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar, TopBarProvider } from './TopBar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <TopBarProvider>
      <div className="flex h-screen bg-[#efeeeb] font-sans">
        <TopBar />
        <Sidebar />
        <main className="flex-1 pt-20 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </TopBarProvider>
  );
};