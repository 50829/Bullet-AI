// src/components/layout/MainLayout.tsx
import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomSidebar } from './BottomSidebar';
import { TopBar, TopBarProvider } from './TopBar';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <TopBarProvider>
      <div className="flex h-screen bg-transparent font-sans">
        <TopBar />
        <Sidebar />
        <BottomSidebar />
        <main className="flex-1 pt-20 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </TopBarProvider>
  );
};