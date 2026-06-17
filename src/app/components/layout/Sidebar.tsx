"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, Target, Lightbulb, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  getWorkspacePageFromPathname,
  getWorkspacePath,
  WORKSPACE_PAGE_ORDER,
  type WorkspacePage,
} from '../../../lib/navigation/workspaceRoutes';

type NavItemProps = {
  page: WorkspacePage;
  icon: React.ReactNode;
  label: string;
  currentPage: WorkspacePage;
};

const NavItem = ({ page, icon, label, currentPage }: NavItemProps) => {
  const isActive = currentPage === page;

  return (
    <li>
      <Link
        href={getWorkspacePath(page)}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 motion-reduce:transition-none ${
        isActive 
          ? 'bg-[var(--color-bg-primary)] text-[var(--color-primary)]' 
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-primary)]'
      }`}
        title={label}
        aria-label={label}
      >
        {icon}
      </Link>
    </li>
  );
};

export const Sidebar = () => {
  const { t } = useLanguage();
  const currentPage = getWorkspacePageFromPathname(usePathname());
  const navItems: Record<WorkspacePage, { label: string; icon: React.ReactNode }> = {
    home: { label: t("today") || 'Today', icon: <Home size={20} /> },
    goals: { label: t("goals") || 'Goals', icon: <Target size={20} /> },
    moments: { label: t("records") || t("moments") || 'Records', icon: <Camera size={20} /> },
    reflections: { label: t("insights") || 'Insights', icon: <Lightbulb size={20} /> },
  };

  return (
    <aside 
      className="fixed left-4 top-20 z-30 hidden rounded-2xl border border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] p-2 shadow-sm lg:block"
    >
      <nav>
        <ul className="space-y-2">
          {WORKSPACE_PAGE_ORDER.map((page) => (
            <NavItem key={page} page={page} currentPage={currentPage} {...navItems[page]} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};
