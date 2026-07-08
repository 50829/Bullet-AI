import { Suspense, type ReactNode } from "react";
import { WorkspaceProvider } from "../../features/workspace/WorkspaceContext";
import { MainLayout } from "../components/layout/MainLayout";
import { LoadingState } from "../components/ui/LoadingState";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <Suspense fallback={<LoadingState />}>
        <MainLayout>{children}</MainLayout>
      </Suspense>
    </WorkspaceProvider>
  );
}
