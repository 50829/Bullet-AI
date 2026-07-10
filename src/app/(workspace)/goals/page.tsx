import GoalsPageClient from "./_components/GoalsPageClient";
import {
  WorkspaceGoalsProvider,
  WorkspaceHabitsProvider,
} from "@/features/workspace/providers";

export default function GoalsRoute() {
  return (
    <WorkspaceGoalsProvider>
      <WorkspaceHabitsProvider>
        <GoalsPageClient />
      </WorkspaceHabitsProvider>
    </WorkspaceGoalsProvider>
  );
}
