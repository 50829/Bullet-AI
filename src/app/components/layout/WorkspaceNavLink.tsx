"use client";

import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getWorkspacePath,
  type WorkspacePage,
} from "../../../lib/navigation/workspaceRoutes";
import { markWorkspaceNavigationStart } from "../../../lib/navigation/workspaceNavigationMetrics";
import { useWorkspaceNavigation } from "./WorkspaceNavigationContext";

type WorkspaceNavLinkProps = {
  page: WorkspacePage;
  icon: ReactNode;
  label: string;
  className: string;
};

export function WorkspaceNavLink({
  page,
  icon,
  label,
  className,
}: WorkspaceNavLinkProps) {
  const router = useRouter();
  const { activePath, beginNavigation } = useWorkspaceNavigation();
  const href = getWorkspacePath(page);
  const isActive = activePath === href;
  const prefetchTarget = () => {
    if (!isActive) router.prefetch(href);
  };

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={prefetchTarget}
      onFocus={prefetchTarget}
      onTouchStart={prefetchTarget}
      onNavigate={() => {
        if (!isActive) {
          flushSync(() => beginNavigation(href));
          markWorkspaceNavigationStart(href);
        }
      }}
      aria-current={isActive ? "page" : undefined}
      className={`flex h-11 items-center justify-center rounded-xl transition-colors duration-150 motion-reduce:transition-none ${className} ${
        isActive
          ? "bg-[var(--color-bg-primary)] text-[var(--color-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)]"
      }`}
      title={label}
      aria-label={label}
    >
      {icon}
    </Link>
  );
}
