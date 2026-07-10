import MomentsPageClient from "./_components/MomentsPageClient";
import { WorkspaceMomentsProvider } from "@/features/workspace/providers";

export default function MomentsRoute() {
  return (
    <WorkspaceMomentsProvider fullHistory>
      <MomentsPageClient />
    </WorkspaceMomentsProvider>
  );
}
