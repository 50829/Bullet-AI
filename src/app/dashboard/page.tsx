import { redirect } from "next/navigation";
import { WORKSPACE_HOME_PATH } from "../../lib/navigation/workspaceRoutes";

export default function DashboardPage() {
  redirect(WORKSPACE_HOME_PATH);
}
