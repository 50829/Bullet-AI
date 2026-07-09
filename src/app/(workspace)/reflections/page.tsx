import ReflectionsPageClient from "../../reflections/ReflectionsPageClient";
import { WorkspaceDataProvider } from "../../../features/workspace/data";
import { loadWorkspaceInitialData } from "../../../features/workspace/data/initialData.server";
import { WORKSPACE_ROUTE_COLLECTIONS } from "../../../features/workspace/data/initialDataTypes";

export default async function ReflectionsRoute() {
  const initialData = await loadWorkspaceInitialData("reflections");

  return (
    <WorkspaceDataProvider
      enabledCollections={WORKSPACE_ROUTE_COLLECTIONS.reflections}
      initialData={initialData}
    >
      <ReflectionsPageClient />
    </WorkspaceDataProvider>
  );
}
