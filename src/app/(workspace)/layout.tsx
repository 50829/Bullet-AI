import { Suspense, type ReactNode } from "react";
import { WorkspaceProvider } from "../../features/workspace/WorkspaceContext";
import { MainLayout } from "../components/layout/MainLayout";
import { LoadingState } from "../../shared/components/ui/LoadingState";
import { getWorkspaceServerUserId } from "../../features/workspace/data/initialData.server";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const initialUserId = await getWorkspaceServerUserId();

  return (
    <WorkspaceProvider initialUserId={initialUserId}>
      <Suspense fallback={<LoadingState />}>
        <MainLayout>{children}</MainLayout>
      </Suspense>
    </WorkspaceProvider>
  );
}
