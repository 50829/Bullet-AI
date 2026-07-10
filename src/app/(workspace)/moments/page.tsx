import MomentsPageClient from "../../moments/MomentsPageClient";
import { WorkspaceMomentsProvider } from "../../../features/workspace/data";

export default function MomentsRoute() {
  return (
    <WorkspaceMomentsProvider fullHistory>
      <MomentsPageClient />
    </WorkspaceMomentsProvider>
  );
}
