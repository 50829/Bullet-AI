import HomePageClient from "../../home/HomePageClient";
import { WorkspaceDataProvider } from "../../../features/workspace/data";
import { loadWorkspaceInitialData } from "../../../features/workspace/data/initialData.server";
import { WORKSPACE_ROUTE_COLLECTIONS } from "../../../features/workspace/data/initialDataTypes";

export default async function HomeRoute() {
  const initialData = await loadWorkspaceInitialData("home");

  return (
    <WorkspaceDataProvider
      enabledCollections={WORKSPACE_ROUTE_COLLECTIONS.home}
      initialData={initialData}
    >
      <HomePageClient />
    </WorkspaceDataProvider>
  );
}
