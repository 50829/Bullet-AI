"use client";

import { useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import { supabase } from "../../lib/supabaseClient";
import { syncCurrentUserPreferences } from "./userPreferencesSyncService";

export function UserPreferencesSync() {
  const { setLanguage } = useLanguage();

  useEffect(() => {
    let isMounted = true;

    const syncPreferences = () => {
      void syncCurrentUserPreferences((language) => {
        if (isMounted) setLanguage(language);
      }).catch((error) => {
        console.error("Failed to sync user preferences:", error);
      });
    };

    syncPreferences();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) syncPreferences();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setLanguage]);

  return null;
}
