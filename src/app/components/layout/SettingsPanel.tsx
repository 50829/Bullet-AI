"use client";

import { useState } from "react";
import { AppearanceSettingsSection } from "./settings/AppearanceSettingsSection";
import { DataSettingsSection } from "./settings/DataSettingsSection";
import { LanguageSettingsSection } from "./settings/LanguageSettingsSection";
import { SettingsPanelShell } from "./settings/SettingsPanelShell";
import { UserSettingsSection } from "./settings/UserSettingsSection";
import { useSettingsProfile } from "./settings/useSettingsProfile";
import { useWorkspaceExport } from "../../../features/workspace/export/useWorkspaceExport";
import type { SettingsSection } from "./settings/types";

type SettingsPanelProps = {
  onClose: () => void;
};

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("user");
  const settings = useSettingsProfile({
    onClose,
  });
  const { handleExport } = useWorkspaceExport();

  return (
    <SettingsPanelShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onClose={onClose}
    >
      {activeSection === "user" && (
        <UserSettingsSection
          username={settings.username}
          currentUsername={settings.currentUsername}
          savingUsername={settings.savingUsername}
          message={settings.message}
          pendingCount={settings.pendingCount}
          onUsernameChange={settings.setUsername}
          onSubmit={settings.handleUsernameChange}
          onLogout={settings.handleLogout}
        />
      )}

      {activeSection === "appearance" && (
        <AppearanceSettingsSection
          preferences={settings.preferences}
          savingPreference={settings.savingPreference}
          onColorSchemeChange={settings.handleColorSchemeChange}
          onAccentChange={settings.handleAccentChange}
        />
      )}

      {activeSection === "language" && (
        <LanguageSettingsSection
          preferences={settings.preferences}
          savingPreference={settings.savingPreference}
          onLanguageChange={settings.handleLanguageChange}
          onWeekStartsOnChange={settings.handleWeekStartsOnChange}
        />
      )}

      {activeSection === "data" && (
        <DataSettingsSection
          preferences={settings.preferences}
          savingPreference={settings.savingPreference}
          syncStatus={settings.syncStatus}
          pendingCount={settings.pendingCount}
          syncIssues={settings.syncIssues}
          onCompletedGoalRetentionChange={
            settings.handleCompletedGoalRetentionChange
          }
          onRetrySync={settings.retrySync}
          onDiscardSyncItem={settings.discardSyncItem}
          onExport={handleExport}
        />
      )}
    </SettingsPanelShell>
  );
}
