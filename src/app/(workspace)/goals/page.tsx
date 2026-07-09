import GoalsPageClient from "../../goals/GoalsPageClient";
import { WorkspaceDataProvider } from "../../../features/workspace/data";
import { loadWorkspaceInitialData } from "../../../features/workspace/data/initialData.server";
import { WORKSPACE_ROUTE_COLLECTIONS } from "../../../features/workspace/data/initialDataTypes";

export default async function GoalsRoute() {
  const initialData = await loadWorkspaceInitialData("goals");

  return (
    <WorkspaceDataProvider
      enabledCollections={WORKSPACE_ROUTE_COLLECTIONS.goals}
      initialData={initialData}
    >
      <GoalsPageClient />
    </WorkspaceDataProvider>
  );
}
