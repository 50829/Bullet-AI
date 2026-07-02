import type { ReactNode } from "react";

export default function WorkspaceTemplate({ children }: { children: ReactNode }) {
  return <div className="min-h-full workspace-page-enter">{children}</div>;
}
