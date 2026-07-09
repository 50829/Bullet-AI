import { Suspense, type ReactNode } from "react";
import { WorkspaceProvider } from "../../features/workspace/WorkspaceContext";
import { WorkspaceDataProvider } from "../../features/workspace/data";
import { MainLayout } from "../components/layout/MainLayout";
import { LoadingState } from "../../shared/components/ui/LoadingState";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceDataProvider>
        <Suspense fallback={<LoadingState />}>
          <MainLayout>{children}</MainLayout>
        </Suspense>
      </WorkspaceDataProvider>
    </WorkspaceProvider>
  );
}
