"use client";

import React from 'react';
import { Camera, Target, Lightbulb, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  WORKSPACE_PAGE_ORDER,
  type WorkspacePage,
} from '../../../lib/navigation/workspaceRoutes';
import { WorkspaceNavLink } from './WorkspaceNavLink';

type NavItemProps = {
  page: WorkspacePage;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ page, icon, label }: NavItemProps) => {
  return (
    <li>
      <WorkspaceNavLink page={page} icon={icon} label={label} className="w-11" />
    </li>
  );
};

export const Sidebar = () => {
  const { t } = useLanguage();
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
            <NavItem key={page} page={page} {...navItems[page]} />
          ))}
        </ul>
      </nav>
    </aside>
  );
};
