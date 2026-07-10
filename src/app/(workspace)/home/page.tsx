import HomePageClient from "./_components/HomePageClient";
import {
  WorkspaceGoalsProvider,
  WorkspaceHabitsProvider,
  WorkspaceMomentsProvider,
  WorkspaceReflectionsProvider,
} from "@/features/workspace/providers";

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
