import { Suspense } from "react";
import { AppProvider } from "../../context/AppContext";
import MainDashboardClient from "../main/MainDashboardClient";
import { LoadingState } from "../components/ui/LoadingState";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppProvider>
      <Suspense fallback={<LoadingState label="正在准备你的空间" />}>
        <MainDashboardClient />
      </Suspense>
    </AppProvider>
  );
}
