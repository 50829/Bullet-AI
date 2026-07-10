import ReflectionsPageClient from "../../reflections/ReflectionsPageClient";
import { WorkspaceReflectionsProvider } from "../../../features/workspace/data";

export default function ReflectionsRoute() {
  return (
    <WorkspaceReflectionsProvider fullHistory>
      <ReflectionsPageClient />
    </WorkspaceReflectionsProvider>
  );
}
