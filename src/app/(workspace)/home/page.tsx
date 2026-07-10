import HomePageClient from "../../home/HomePageClient";
import {
  WorkspaceGoalsProvider,
  WorkspaceHabitsProvider,
  WorkspaceMomentsProvider,
  WorkspaceReflectionsProvider,
} from "../../../features/workspace/data";

export default function HomeRoute() {
  return (
    <WorkspaceGoalsProvider>
      <WorkspaceHabitsProvider>
        <WorkspaceMomentsProvider>
          <WorkspaceReflectionsProvider>
            <HomePageClient />
          </WorkspaceReflectionsProvider>
        </WorkspaceMomentsProvider>
      </WorkspaceHabitsProvider>
    </WorkspaceGoalsProvider>
  );
}
