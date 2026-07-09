import { clearLocalAppData } from "../localDb/clearLocalAppData";
import { supabase } from "../supabaseClient";

export async function signOutAndClearLocalData() {
  const { error } = await supabase.auth.signOut();
  if (error) return { error };

  try {
    await clearLocalAppData();
  } catch (clearError) {
    console.warn("Failed to clear local app data:", clearError);
  }

  return { error: null };
}
