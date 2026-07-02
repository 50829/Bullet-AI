import { LoaderCircle } from "lucide-react";

export function WorkspaceRouteLoading({
  overlay = false,
  delayed = false,
}: {
  overlay?: boolean;
  delayed?: boolean;
}) {
  return (
    <div
      className={
        overlay
          ? "absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bg-primary)]"
          : "flex min-h-[50dvh] items-center justify-center"
      }
      role="status"
      aria-label="正在加载页面"
    >
      <span className={delayed ? "workspace-loading-delayed" : ""}>
        <LoaderCircle
          className="size-9 animate-spin text-[var(--color-primary)] motion-reduce:animate-none"
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </span>
    </div>
  );
}
