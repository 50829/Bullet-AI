import { LoadingState } from "../../shared/components/ui/LoadingState";

export default function WorkspaceLoading() {
  return (
    <LoadingState delayed className="min-h-[50dvh]" label="正在加载页面" />
  );
}
