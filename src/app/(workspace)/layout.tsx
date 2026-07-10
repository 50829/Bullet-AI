import { Suspense, type ReactNode } from "react";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceContext";
import { MainLayout } from "@/app/(workspace)/_components/layout/MainLayout";
import { LoadingState } from "@/shared/components/ui/LoadingState";
import { WorkspaceDataRuntimeProvider } from "@/features/workspace/providers";
import { ProfileProvider } from "@/features/profile/ProfileContext";
import { ProfilePreferencesSync } from "@/features/profile/ProfilePreferencesSync";
import { AuthSessionProvider } from "@/lib/auth/AuthSessionContext";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <WorkspaceDataRuntimeProvider>
        <ProfileProvider>
          <ProfilePreferencesSync />
          <WorkspaceProvider>
            <Suspense fallback={<LoadingState />}>
              <MainLayout>{children}</MainLayout>
            </Suspense>
          </WorkspaceProvider>
        </ProfileProvider>
      </WorkspaceDataRuntimeProvider>
    </AuthSessionProvider>
  );
}
