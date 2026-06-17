import { Suspense } from "react";
import { AppProvider } from "../../context/AppContext";
import MainDashboardClient from "../main/MainDashboardClient";
import { LoadingState } from "../components/ui/LoadingState";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <AppProvider>
      <Suspense fallback={<LoadingState />}>
        <MainDashboardClient />
      </Suspense>
    </AppProvider>
  );
}
