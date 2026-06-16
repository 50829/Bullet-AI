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
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-20 lg:px-8 lg:pb-8 lg:pl-28">
          {children}
        </main>
      </div>
    </TopBarProvider>
  );
};
