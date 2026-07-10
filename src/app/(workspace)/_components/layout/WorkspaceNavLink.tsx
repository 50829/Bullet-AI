"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getWorkspacePath,
  type WorkspacePage,
} from "@/lib/navigation/workspaceRoutes";

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
  const pathname = usePathname();
  const href = getWorkspacePath(page);
  const isActive = pathname === href;

  return (
    <Link
      href={href}
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
