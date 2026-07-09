"use client";

import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import {
  WORKSPACE_PAGE_ORDER,
  type WorkspacePage,
} from "../../../lib/navigation/workspaceRoutes";
import { WorkspaceNavLink } from "./WorkspaceNavLink";
import { getWorkspaceNavItemMeta } from "./workspacePageMeta";

type NavItemProps = {
  page: WorkspacePage;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ page, icon, label }: NavItemProps) => {
  return (
    <li>
      <WorkspaceNavLink
        page={page}
        icon={icon}
        label={label}
        className="w-11"
      />
    </li>
  );
};

export const Sidebar = () => {
  const { t } = useLanguage();

  return (
    <aside className="fixed left-4 top-20 z-30 hidden rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-sm lg:block">
      <nav>
        <ul className="space-y-2">
          {WORKSPACE_PAGE_ORDER.map((page) => (
            <NavItem
              key={page}
              page={page}
              {...getWorkspaceNavItemMeta({ page, t })}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
};
