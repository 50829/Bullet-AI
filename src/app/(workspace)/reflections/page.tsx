import ReflectionsPageClient from "./_components/ReflectionsPageClient";
import { WorkspaceReflectionsProvider } from "@/features/workspace/providers";

export default function ReflectionsRoute() {
  return (
    <WorkspaceReflectionsProvider fullHistory>
      <ReflectionsPageClient />
    </WorkspaceReflectionsProvider>
  );
}
