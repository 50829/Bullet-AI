import { Suspense, type ReactNode } from "react";
import { WorkspaceProvider } from "../../features/workspace/WorkspaceContext";
import { WorkspaceDataProvider } from "../../features/workspace/data";
import { MainLayout } from "../components/layout/MainLayout";
import { LoadingState } from "../../shared/components/ui/LoadingState";
import { DataV2RuntimeProvider } from "../../features/workspace/data/DataV2RuntimeProvider";
import { ProfileProvider } from "../../lib/profile/ProfileContext";
import { ProfilePreferencesSync } from "../../lib/profile/ProfilePreferencesSync";
import { AuthSessionProvider } from "../../lib/auth/AuthSessionContext";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <DataV2RuntimeProvider>
        <ProfileProvider>
          <ProfilePreferencesSync />
          <WorkspaceProvider>
            <WorkspaceDataProvider>
              <Suspense fallback={<LoadingState />}>
                <MainLayout>{children}</MainLayout>
              </Suspense>
            </WorkspaceDataProvider>
          </WorkspaceProvider>
        </ProfileProvider>
      </DataV2RuntimeProvider>
    </AuthSessionProvider>
  );
}
