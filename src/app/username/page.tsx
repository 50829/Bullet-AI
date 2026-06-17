import { redirect } from "next/navigation";
import { WORKSPACE_HOME_PATH } from "../../lib/navigation/workspaceRoutes";

export default function UsernamePage() {
  redirect(WORKSPACE_HOME_PATH);
}
