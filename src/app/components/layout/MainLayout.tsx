// src/components/layout/MainLayout.tsx
import React from "react";
import { Sidebar } from "./Sidebar";
import { BottomSidebar } from "./BottomSidebar";
import { TopBar, TopBarProvider } from "./TopBar";
import { WorkspaceNavigationTracker } from "./WorkspaceNavigationTracker";
import { WorkspaceWarmup } from "./WorkspaceWarmup";
import { WorkspaceHydrationBoundary } from "./WorkspaceHydrationBoundary";
import { WorkspaceNavigationProvider } from "./WorkspaceNavigationContext";

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <TopBarProvider>
      <WorkspaceNavigationProvider>
        <div className="h-dvh overflow-hidden bg-transparent font-sans">
          <WorkspaceWarmup />
          <TopBar />
          <Sidebar />
          <BottomSidebar />
          <main className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto px-4 pb-24 pt-4 lg:px-8 lg:pb-8 lg:pl-28">
            <WorkspaceNavigationTracker />
            <WorkspaceHydrationBoundary>{children}</WorkspaceHydrationBoundary>
          </main>
        </div>
      </WorkspaceNavigationProvider>
    </TopBarProvider>
  );
};
