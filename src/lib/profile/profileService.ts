import { supabase } from "../supabase/client";

export type UserProfile = {
  username: string;
  updated_at: string | null;
};

async function getCurrentUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);
  return session?.user ?? null;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("username, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    username: data?.username || "",
    updated_at: data?.updated_at || null,
  };
}

export async function updateCurrentUserDisplayName(displayName: string): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) throw new Error("请先登录");

  const username = displayName.trim();

  if (username) {
    const { data: existing, error: existingError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (existing && existing.user_id !== user.id) {
      throw new Error("该用户名已被使用，请选择其他用户名");
    }
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      username: username || null,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);

  return {
    username,
    updated_at: updatedAt,
  };
}
