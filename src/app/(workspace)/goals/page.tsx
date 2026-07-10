import GoalsPageClient from "../../goals/GoalsPageClient";
import {
  WorkspaceGoalsProvider,
  WorkspaceHabitsProvider,
} from "../../../features/workspace/data";

export default function GoalsRoute() {
  return (
    <WorkspaceGoalsProvider>
      <WorkspaceHabitsProvider>
        <GoalsPageClient />
      </WorkspaceHabitsProvider>
    </WorkspaceGoalsProvider>
  );
}
