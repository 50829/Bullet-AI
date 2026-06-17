import { Suspense, type ReactNode } from "react";
import { AppProvider } from "../../context/AppContext";
import { MainLayout } from "../components/layout/MainLayout";
import { LoadingState } from "../components/ui/LoadingState";

export const dynamic = "force-dynamic";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <Suspense fallback={<LoadingState />}>
        <MainLayout>{children}</MainLayout>
      </Suspense>
    </AppProvider>
  );
}
