import MomentsPageClient from "../../moments/MomentsPageClient";
import { WorkspaceDataProvider } from "../../../features/workspace/data";
import { loadWorkspaceInitialData } from "../../../features/workspace/data/initialData.server";
import { WORKSPACE_ROUTE_COLLECTIONS } from "../../../features/workspace/data/initialDataTypes";

export default async function MomentsRoute() {
  const initialData = await loadWorkspaceInitialData("moments");

  return (
    <WorkspaceDataProvider
      enabledCollections={WORKSPACE_ROUTE_COLLECTIONS.moments}
      initialData={initialData}
    >
      <MomentsPageClient />
    </WorkspaceDataProvider>
  );
}
